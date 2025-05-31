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

# Set demo mode flag - set to True for hackathon demo
DEMO_MODE = True

# Import dummy data for hackathon
from api.dummy_data import (
    generate_fingerprinted_document,
    identify_leaked_document,
    check_content_for_sensitive_data,
    get_mock_analytics,
    get_recent_events,
    MOCK_RECIPIENTS,
    MOCK_AUDIT_LOGS
)

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

# Initialize components only if not in demo mode
whisperprint_engine = None
privacy_guardian = None

if not DEMO_MODE:
    # Import our actual components
    from whisperprint.engine import WhisperPrintEngine
    from privacy_guardian.detector import PrivacyGuardian
    
    # Initialize our components
    db_path = os.environ.get("WHISPERPRINT_DB_PATH", "whisperprint.db")
    whisperprint_engine = WhisperPrintEngine(db_path=db_path)
    privacy_guardian = PrivacyGuardian()
else:
    print("Running in DEMO MODE with dummy data")

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
    # For demo, just use the username as the token
    return {
        "access_token": form_data.username,
        "token_type": "bearer",
        "expires_in": 3600,
        "user_role": user["role"]
    }

# Fingerprint document endpoint
@app.post("/fingerprint", response_model=DocumentResponse)
async def fingerprint_document(
    request: DocumentRequest, 
    background_tasks: BackgroundTasks,
    user: dict = Depends(get_current_user)
):
    """
    Fingerprint a document with a unique watermark tied to the recipient.
    Returns the fingerprinted document ready for distribution.
    """
    # For hackathon: Use dummy data instead of actual fingerprinting
    result = generate_fingerprinted_document(request.text, request.recipient_id)
    
    # Broadcast event to websocket clients
    background_tasks.add_task(
        broadcast_event, 
        {
            "event_type": "document_fingerprinted",
            "event_data": {
                "recipient_id": request.recipient_id,
                "tracking_id": result["tracking_id"],
                "document_length": len(request.text)
            }
        }
    )
    
    return result

# Identify leaked document endpoint
@app.post("/identify", response_model=IdentifyResponse)
async def identify_document(
    request: IdentifyRequest,
    background_tasks: BackgroundTasks,
    user: dict = Depends(get_current_user)
):
    """
    Analyze a leaked document to identify the recipient it was shared with.
    Returns the identified recipient and confidence level.
    """
    # For hackathon: Use dummy data instead of actual identification
    result = identify_leaked_document(request.leaked_text)
    
    # Broadcast event to websocket clients if a recipient was identified
    if result["recipient_id"]:
        background_tasks.add_task(
            broadcast_event, 
            {
                "event_type": "leak_identified",
                "event_data": {
                    "recipient_id": result["recipient_id"],
                    "confidence": result["confidence"],
                    "document_snippet": request.leaked_text[:50] + "..." if len(request.leaked_text) > 50 else request.leaked_text
                }
            }
        )
    
    return result

# Content check endpoint
@app.post("/check", response_model=ContentCheckResponse)
async def check_content(
    request: ContentCheckRequest,
    background_tasks: BackgroundTasks,
    user: dict = Depends(get_current_user)
):
    """
    Check content for sensitive information before sharing.
    Returns a risk assessment and recommended actions.
    """
    # For hackathon: Use dummy data instead of actual content checking
    result = check_content_for_sensitive_data(request.content)
    
    # Broadcast event to websocket clients if sensitive data was detected
    if result["has_sensitive_data"] and result["risk_score"] > 0.5:
        background_tasks.add_task(
            broadcast_event, 
            {
                "event_type": "sensitive_data_detected",
                "event_data": {
                    "risk_score": result["risk_score"],
                    "detections": [d["type"] for d in result["detections"]],
                    "content_type": request.content_type
                }
            }
        )
    
    return result

# Feedback endpoint
@app.post("/feedback", response_model=FeedbackResponse)
async def record_feedback(
    request: FeedbackRequest,
    background_tasks: BackgroundTasks,
    user: dict = Depends(get_current_user)
):
    """
    Record user feedback on detection accuracy.
    This helps improve the system over time.
    """
    # For hackathon: Just return a success response
    tracking_id = generate_tracking_id()
    
    # Broadcast event to websocket clients
    background_tasks.add_task(
        broadcast_event, 
        {
            "event_type": "feedback_recorded",
            "event_data": {
                "detection_id": request.detection_id,
                "was_correct": request.was_correct,
                "action": request.action
            }
        }
    )
    
    return {
        "status": "success",
        "tracking_id": tracking_id
    }

# Get recipients endpoint
@app.get("/recipients", response_model=List[RecipientResponse])
async def get_recipients(
    limit: int = Query(100, description="Maximum number of recipients to return"),
    offset: int = Query(0, description="Offset for pagination"),
    user: dict = Depends(check_admin_role)
):
    """Get a list of all recipients."""
    # For hackathon: Return mock recipients
    return MOCK_RECIPIENTS[offset:offset+limit]

# Get recipient by ID endpoint
@app.get("/recipients/{recipient_id}", response_model=RecipientResponse)
async def get_recipient(
    recipient_id: str = Path(..., description="The recipient ID to retrieve"),
    user: dict = Depends(get_current_user)
):
    """Get details for a specific recipient by ID."""
    # For hackathon: Find recipient in mock data
    for recipient in MOCK_RECIPIENTS:
        if recipient["recipient_id"] == recipient_id:
            return recipient
    
    raise HTTPException(status_code=404, detail=f"Recipient {recipient_id} not found")

# Get audit logs endpoint
@app.get("/audit-logs", response_model=List[AuditLogResponse])
async def get_audit_logs(
    limit: int = Query(100, description="Maximum number of logs to return"),
    event_type: Optional[str] = Query(None, description="Filter by event type"),
    user: dict = Depends(check_admin_role)
):
    """Get audit logs for system activity."""
    # For hackathon: Return mock audit logs
    logs = MOCK_AUDIT_LOGS
    
    # Apply event type filter if specified
    if event_type:
        logs = [log for log in logs if log["event_type"] == event_type]
    
    return logs[:limit]

# Get analytics endpoint
@app.get("/analytics", response_model=AnalyticsResponse)
async def get_analytics(
    days: int = Query(30, description="Number of days to include in analytics"),
    user: dict = Depends(check_admin_role)
):
    """Get analytics data for dashboard visualizations."""
    # For hackathon: Return mock analytics data
    return get_mock_analytics(days)

# WebSocket endpoint for dashboard
@app.websocket("/ws/dashboard")
async def dashboard_websocket(websocket: WebSocket):
    await websocket.accept()
    active_connections.append(websocket)
    
    try:
        # Send recent events immediately on connection
        recent_events = get_recent_events(10)
        for event in recent_events:
            await websocket.send_text(json.dumps(event))
        
        # Keep connection alive and handle incoming messages
        while True:
            data = await websocket.receive_text()
            # Process any incoming messages if needed
    except WebSocketDisconnect:
        # Remove connection when client disconnects
        active_connections.remove(websocket)

# Health check endpoint
@app.get("/health")
async def health_check():
    """API health check endpoint."""
    return {
        "status": "healthy",
        "version": app.version,
        "timestamp": datetime.now().isoformat()
    }

# Stats endpoint
@app.get("/stats")
async def get_stats(user: dict = Depends(get_current_user)):
    """Get basic system stats."""
    # For hackathon: Return mock stats
    analytics = get_mock_analytics()
    return {
        "total_documents": analytics["total_documents"],
        "total_recipients": analytics["total_recipients"],
        "active_connections": len(active_connections),
        "uptime": "12 hours 34 minutes",
        "system_load": 0.42
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True) 