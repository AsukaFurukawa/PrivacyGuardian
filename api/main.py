from fastapi import FastAPI, HTTPException, Request, BackgroundTasks, Depends, WebSocket, WebSocketDisconnect, Query, Path
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel, Field
from typing import Dict, List, Optional, Any, Union
import uuid
import json
import asyncio
from datetime import datetime, timedelta
import os
import secrets
from enum import Enum

# Import our components
from whisperprint.engine import WhisperPrintEngine
from privacy_guardian.detector import PrivacyGuardian

# Create FastAPI app
app = FastAPI(
    title="WhisperPrint + Privacy-Guardian API",
    description="API for document fingerprinting and sensitive data protection",
    version="0.1.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize our components
db_path = os.environ.get("WHISPERPRINT_DB_PATH", "whisperprint.db")
whisperprint_engine = WhisperPrintEngine(db_path=db_path)
privacy_guardian = PrivacyGuardian()

# Store for active websocket connections (for security dashboard)
active_connections = []

# In-memory store for events and detections (in a real app, this would be a database)
event_store = []
detection_store = []

# Simple authentication for demo purposes
# In a real app, this would use a proper authentication system
API_KEY = os.environ.get("API_KEY", secrets.token_urlsafe(32))
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# User roles
class UserRole(str, Enum):
    ADMIN = "admin"
    USER = "user"
    VIEWER = "viewer"

# Pydantic models for API requests and responses
class DocumentRequest(BaseModel):
    text: str
    recipient_id: str
    metadata: Optional[Dict[str, Any]] = None

class DocumentResponse(BaseModel):
    fingerprinted_text: str
    recipient_uuid: str
    tracking_id: str

class IdentifyRequest(BaseModel):
    leaked_text: str

class IdentifyResponse(BaseModel):
    recipient_id: Optional[str]
    confidence: float
    metadata: Optional[Dict[str, Any]] = None

class ContentCheckRequest(BaseModel):
    content: str
    content_type: str = "text"
    metadata: Optional[Dict[str, Any]] = None

class ContentCheckResponse(BaseModel):
    has_sensitive_data: bool
    risk_score: float
    recommendation: str
    detections: List[Dict[str, Any]]
    tracking_id: str

class FeedbackRequest(BaseModel):
    detection_id: str
    action: str
    was_correct: bool
    comments: Optional[str] = None

class FeedbackResponse(BaseModel):
    status: str
    tracking_id: str

class RecipientResponse(BaseModel):
    recipient_id: str
    created_at: str
    metadata: Optional[Dict[str, Any]] = None

class AuditLogResponse(BaseModel):
    id: int
    event_type: str
    event_data: Dict[str, Any]
    timestamp: str
    user_id: Optional[str] = None

class TokenRequest(BaseModel):
    username: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    expires_in: int
    user_role: UserRole

class AnalyticsResponse(BaseModel):
    total_documents: int
    total_recipients: int
    documents_by_day: Dict[str, int]
    detections_by_type: Dict[str, int]
    risk_score_distribution: Dict[str, int]

# Utility to generate tracking IDs
def generate_tracking_id():
    return str(uuid.uuid4())

# Mock user database for demo
USERS = {
    "admin": {
        "username": "admin",
        "password": "admin123",  # In a real app, this would be hashed
        "role": UserRole.ADMIN
    },
    "user": {
        "username": "user",
        "password": "user123",
        "role": UserRole.USER
    },
    "viewer": {
        "username": "viewer",
        "password": "viewer123",
        "role": UserRole.VIEWER
    }
}

# Authentication function
async def get_current_user(token: str = Depends(oauth2_scheme)):
    # In a real app, this would validate a JWT token
    # For demo purposes, we'll just check if the token is our API key
    if token != API_KEY:
        # Check if it's a username for demo
        if token not in USERS:
            raise HTTPException(
                status_code=401,
                detail="Invalid authentication credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
    return {"username": "api_user", "role": UserRole.ADMIN}

# Role-based access control
def check_admin_role(user: dict = Depends(get_current_user)):
    if user.get("role") != UserRole.ADMIN:
        raise HTTPException(
            status_code=403,
            detail="Not authorized to access this resource",
        )
    return user

# Background task to broadcast events to websocket clients
async def broadcast_event(event_data: Dict[str, Any]):
    if active_connections:
        event_with_timestamp = {
            **event_data,
            "timestamp": datetime.now().isoformat()
        }
        event_store.append(event_with_timestamp)
        
        message = json.dumps(event_with_timestamp)
        for connection in active_connections:
            try:
                await connection.send_text(message)
            except Exception:
                # Connection might be closed
                pass

# Authentication endpoints
@app.post("/token", response_model=TokenResponse)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends()):
    user = USERS.get(form_data.username)
    if not user or user["password"] != form_data.password:
        raise HTTPException(
            status_code=401,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # In a real app, this would generate a JWT token
    return {
        "access_token": API_KEY,
        "token_type": "bearer",
        "expires_in": 3600,  # 1 hour
        "user_role": user["role"]
    }

# WhisperPrint endpoints
@app.post("/fingerprint", response_model=DocumentResponse)
async def fingerprint_document(
    request: DocumentRequest, 
    background_tasks: BackgroundTasks,
    user: dict = Depends(get_current_user)
):
    """Fingerprint a document for a specific recipient."""
    try:
        fingerprinted_text, recipient_uuid = whisperprint_engine.create_fingerprinted_document(
            request.text, request.recipient_id, request.metadata
        )
        
        tracking_id = generate_tracking_id()
        
        # Log this event in background
        event_data = {
            "event_type": "document_fingerprinted",
            "recipient_id": request.recipient_id,
            "tracking_id": tracking_id,
            "user_id": user.get("username")
        }
        background_tasks.add_task(broadcast_event, event_data)
        
        return {
            "fingerprinted_text": fingerprinted_text,
            "recipient_uuid": recipient_uuid,
            "tracking_id": tracking_id
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/identify", response_model=IdentifyResponse)
async def identify_document(
    request: IdentifyRequest,
    background_tasks: BackgroundTasks,
    user: dict = Depends(get_current_user)
):
    """Identify the recipient of a leaked document."""
    try:
        recipient_id = whisperprint_engine.identify_leaked_document(request.leaked_text)
        
        confidence = 0.95 if recipient_id else 0.0
        metadata = None
        
        # Get recipient metadata if available
        if recipient_id:
            recipients = whisperprint_engine.get_all_recipients()
            for recipient in recipients:
                if recipient["recipient_id"] == recipient_id:
                    metadata = recipient.get("metadata")
                    break
        
        # Log this event in background
        event_data = {
            "event_type": "document_identified",
            "recipient_id": recipient_id,
            "confidence": confidence,
            "user_id": user.get("username"),
            "timestamp": datetime.now().isoformat()
        }
        background_tasks.add_task(broadcast_event, event_data)
        
        return {
            "recipient_id": recipient_id,
            "confidence": confidence,
            "metadata": metadata
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Privacy-Guardian endpoints
@app.post("/check", response_model=ContentCheckResponse)
async def check_content(
    request: ContentCheckRequest,
    background_tasks: BackgroundTasks,
    user: dict = Depends(get_current_user)
):
    """Check content for sensitive information."""
    try:
        results = privacy_guardian.check_content(request.content, request.content_type)
        
        tracking_id = generate_tracking_id()
        
        # Store the detection
        detection_data = {
            **results,
            "tracking_id": tracking_id,
            "timestamp": datetime.now().isoformat(),
            "user_id": user.get("username"),
            "metadata": request.metadata
        }
        detection_store.append(detection_data)
        
        # Log this event in background
        event_data = {
            "event_type": "content_checked",
            "content_type": request.content_type,
            "has_sensitive_data": results["has_sensitive_data"],
            "risk_score": results["risk_score"],
            "recommendation": results["recommendation"],
            "tracking_id": tracking_id,
            "user_id": user.get("username")
        }
        background_tasks.add_task(broadcast_event, event_data)
        
        return {
            "has_sensitive_data": results["has_sensitive_data"],
            "risk_score": results["risk_score"],
            "recommendation": results["recommendation"],
            "detections": results.get("detections", []),
            "tracking_id": tracking_id
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/feedback", response_model=FeedbackResponse)
async def record_feedback(
    request: FeedbackRequest,
    background_tasks: BackgroundTasks,
    user: dict = Depends(get_current_user)
):
    """Record user feedback on detection."""
    try:
        privacy_guardian.record_feedback(
            request.detection_id,
            request.action,
            request.was_correct
        )
        
        tracking_id = generate_tracking_id()
        
        # Log this event in background
        event_data = {
            "event_type": "feedback_recorded",
            "detection_id": request.detection_id,
            "action": request.action,
            "was_correct": request.was_correct,
            "comments": request.comments,
            "user_id": user.get("username"),
            "tracking_id": tracking_id
        }
        background_tasks.add_task(broadcast_event, event_data)
        
        return {
            "status": "success",
            "tracking_id": tracking_id
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Admin endpoints
@app.get("/recipients", response_model=List[RecipientResponse])
async def get_recipients(
    limit: int = Query(100, description="Maximum number of recipients to return"),
    offset: int = Query(0, description="Offset for pagination"),
    user: dict = Depends(check_admin_role)
):
    """Get all recipients (admin only)."""
    try:
        recipients = whisperprint_engine.get_all_recipients()
        return recipients[offset:offset+limit]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/recipients/{recipient_id}", response_model=RecipientResponse)
async def get_recipient(
    recipient_id: str = Path(..., description="The recipient ID to retrieve"),
    user: dict = Depends(get_current_user)
):
    """Get a specific recipient."""
    try:
        recipients = whisperprint_engine.get_all_recipients()
        for recipient in recipients:
            if recipient["recipient_id"] == recipient_id:
                return recipient
        raise HTTPException(status_code=404, detail="Recipient not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/audit-logs", response_model=List[AuditLogResponse])
async def get_audit_logs(
    limit: int = Query(100, description="Maximum number of logs to return"),
    event_type: Optional[str] = Query(None, description="Filter by event type"),
    user: dict = Depends(check_admin_role)
):
    """Get audit logs (admin only)."""
    try:
        logs = whisperprint_engine.get_audit_logs(limit, event_type)
        return logs
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/analytics", response_model=AnalyticsResponse)
async def get_analytics(
    days: int = Query(30, description="Number of days to include in analytics"),
    user: dict = Depends(check_admin_role)
):
    """Get system analytics (admin only)."""
    try:
        # In a real implementation, this would query the database
        # For demo purposes, we'll generate mock data
        
        # Count documents by day
        documents_by_day = {}
        now = datetime.now()
        for i in range(days):
            date = (now - timedelta(days=i)).strftime("%Y-%m-%d")
            documents_by_day[date] = len([
                e for e in event_store 
                if e.get("event_type") == "document_fingerprinted" and 
                e.get("timestamp", "").startswith(date)
            ])
        
        # Count detections by type
        detections_by_type = {}
        for detection in detection_store:
            for d in detection.get("detections", []):
                label = d.get("label", "UNKNOWN")
                if label in detections_by_type:
                    detections_by_type[label] += 1
                else:
                    detections_by_type[label] = 1
        
        # Risk score distribution
        risk_score_distribution = {
            "0-25%": 0,
            "25-50%": 0,
            "50-75%": 0,
            "75-100%": 0
        }
        
        for detection in detection_store:
            risk_score = detection.get("risk_score", 0) * 100
            if risk_score < 25:
                risk_score_distribution["0-25%"] += 1
            elif risk_score < 50:
                risk_score_distribution["25-50%"] += 1
            elif risk_score < 75:
                risk_score_distribution["50-75%"] += 1
            else:
                risk_score_distribution["75-100%"] += 1
        
        return {
            "total_documents": len([e for e in event_store if e.get("event_type") == "document_fingerprinted"]),
            "total_recipients": len(whisperprint_engine.get_all_recipients()),
            "documents_by_day": documents_by_day,
            "detections_by_type": detections_by_type,
            "risk_score_distribution": risk_score_distribution
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# WebSocket endpoint for security dashboard
@app.websocket("/ws/dashboard")
async def dashboard_websocket(websocket: WebSocket):
    await websocket.accept()
    active_connections.append(websocket)
    
    try:
        # Send recent events
        recent_events = event_store[-50:] if event_store else []
        await websocket.send_text(json.dumps({
            "type": "history",
            "events": recent_events
        }))
        
        # Keep connection alive
        while True:
            # Wait for any messages from client
            _ = await websocket.receive_text()
    except WebSocketDisconnect:
        # Remove from active connections
        active_connections.remove(websocket)

# Utility endpoints
@app.get("/health")
async def health_check():
    """Check if the API is running."""
    return {
        "status": "ok",
        "version": app.version,
        "timestamp": datetime.now().isoformat()
    }

@app.get("/stats")
async def get_stats(user: dict = Depends(get_current_user)):
    """Get basic stats about the system."""
    return {
        "fingerprinted_documents": len([e for e in event_store if e.get("event_type") == "document_fingerprinted"]),
        "identified_leaks": len([e for e in event_store if e.get("event_type") == "document_identified"]),
        "content_checks": len([e for e in event_store if e.get("event_type") == "content_checked"]),
        "feedback_count": len([e for e in event_store if e.get("event_type") == "feedback_recorded"]),
        "total_recipients": len(whisperprint_engine.get_all_recipients())
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True) 