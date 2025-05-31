import uuid
import random
import datetime
from typing import Dict, List, Any, Optional

# Mock recipient data
MOCK_RECIPIENTS = [
    {
        "recipient_id": "john.doe@example.com",
        "created_at": "2023-06-15T09:30:00",
        "metadata": {"department": "Engineering", "access_level": "Confidential"}
    },
    {
        "recipient_id": "alice.smith@example.com",
        "created_at": "2023-06-15T10:15:00",
        "metadata": {"department": "Marketing", "access_level": "Public"}
    },
    {
        "recipient_id": "bob.jones@example.com",
        "created_at": "2023-06-16T14:20:00",
        "metadata": {"department": "Finance", "access_level": "Restricted"}
    },
    {
        "recipient_id": "sarah.wilson@example.com",
        "created_at": "2023-06-17T11:45:00",
        "metadata": {"department": "Legal", "access_level": "Confidential"}
    },
    {
        "recipient_id": "michael.brown@example.com",
        "created_at": "2023-06-18T16:30:00",
        "metadata": {"department": "HR", "access_level": "Internal"}
    }
]

# Mock audit logs
MOCK_AUDIT_LOGS = [
    {
        "id": 1,
        "event_type": "document_fingerprinted",
        "event_data": {
            "recipient_id": "john.doe@example.com",
            "tracking_id": str(uuid.uuid4()),
            "document_length": 2048
        },
        "timestamp": "2023-06-19T09:10:00",
        "user_id": "admin"
    },
    {
        "id": 2,
        "event_type": "leak_identified",
        "event_data": {
            "recipient_id": "alice.smith@example.com",
            "confidence": 0.93,
            "document_snippet": "...confidential financial projections for Q3..."
        },
        "timestamp": "2023-06-19T10:30:00",
        "user_id": "admin"
    },
    {
        "id": 3,
        "event_type": "sensitive_data_detected",
        "event_data": {
            "risk_score": 0.85,
            "detections": ["credit_card", "ssn"],
            "content_type": "clipboard"
        },
        "timestamp": "2023-06-19T11:45:00",
        "user_id": "user"
    },
    {
        "id": 4,
        "event_type": "document_fingerprinted",
        "event_data": {
            "recipient_id": "bob.jones@example.com",
            "tracking_id": str(uuid.uuid4()),
            "document_length": 4096
        },
        "timestamp": "2023-06-19T13:20:00",
        "user_id": "admin"
    },
    {
        "id": 5,
        "event_type": "feedback_recorded",
        "event_data": {
            "detection_id": str(uuid.uuid4()),
            "was_correct": True,
            "action": "redact"
        },
        "timestamp": "2023-06-19T14:30:00",
        "user_id": "user"
    },
    {
        "id": 6,
        "event_type": "leak_identified",
        "event_data": {
            "recipient_id": "sarah.wilson@example.com",
            "confidence": 0.78,
            "document_snippet": "...product roadmap for next fiscal year..."
        },
        "timestamp": "2023-06-19T15:45:00",
        "user_id": "admin"
    },
    {
        "id": 7,
        "event_type": "sensitive_data_detected",
        "event_data": {
            "risk_score": 0.92,
            "detections": ["api_key", "password"],
            "content_type": "text"
        },
        "timestamp": "2023-06-19T16:30:00",
        "user_id": "user"
    }
]

# Types of sensitive data for detection
SENSITIVE_DATA_TYPES = [
    "credit_card",
    "ssn", 
    "phone_number",
    "email_address",
    "password",
    "api_key",
    "address",
    "bank_account",
    "driver_license",
    "passport_number",
    "medical_record",
    "date_of_birth"
]

# Sample sensitive data (for demonstration only, DO NOT use real sensitive data)
SAMPLE_SENSITIVE_DATA = {
    "credit_card": "4111-1111-1111-1111",
    "ssn": "123-45-6789",
    "phone_number": "(555) 123-4567",
    "email_address": "someone@example.com",
    "password": "P@ssw0rd123!",
    "api_key": "sk_test_abcdefghijklmnopqrstuvwxyz123456",
    "address": "123 Main St, Anytown, CA 94123",
    "bank_account": "1234567890",
    "driver_license": "D1234567",
    "passport_number": "AB1234567",
    "medical_record": "MRN-1234567890",
    "date_of_birth": "01/01/1980"
}

# Mock analytics data
def get_mock_analytics(days: int = 30) -> Dict[str, Any]:
    """Generate mock analytics data for the dashboard."""
    today = datetime.datetime.now()
    
    # Generate documents by day
    documents_by_day = {}
    for i in range(days):
        date = (today - datetime.timedelta(days=i)).strftime("%Y-%m-%d")
        documents_by_day[date] = random.randint(5, 30)
    
    # Generate detections by type
    detections_by_type = {}
    for data_type in SENSITIVE_DATA_TYPES:
        detections_by_type[data_type] = random.randint(10, 100)
    
    # Generate risk score distribution
    risk_score_distribution = {
        "low (0-0.3)": random.randint(20, 50),
        "medium (0.3-0.7)": random.randint(30, 70),
        "high (0.7-1.0)": random.randint(15, 40)
    }
    
    return {
        "total_documents": sum(documents_by_day.values()),
        "total_recipients": len(MOCK_RECIPIENTS) + random.randint(5, 20),
        "documents_by_day": documents_by_day,
        "detections_by_type": detections_by_type,
        "risk_score_distribution": risk_score_distribution
    }

# Function to generate a mock fingerprinted document
def generate_fingerprinted_document(text: str, recipient_id: str) -> Dict[str, Any]:
    """Generate a mock fingerprinted document."""
    tracking_id = str(uuid.uuid4())
    recipient_uuid = str(uuid.uuid4())
    
    # Add a fake watermark to simulate fingerprinting
    fingerprinted_text = f"{text}\n\n[This document is fingerprinted with ID: {tracking_id[:8]}]"
    
    return {
        "fingerprinted_text": fingerprinted_text,
        "recipient_uuid": recipient_uuid,
        "tracking_id": tracking_id
    }

# Function to identify a mock leaked document
def identify_leaked_document(text: str) -> Dict[str, Any]:
    """Identify a mock leaked document."""
    # Check if the text contains a fingerprint marker
    if "[This document is fingerprinted with ID:" in text:
        # Extract the tracking ID from the text
        tracking_id = text.split("ID: ")[1].split("]")[0]
        # Randomly select a recipient
        recipient = random.choice(MOCK_RECIPIENTS)
        return {
            "recipient_id": recipient["recipient_id"],
            "confidence": random.uniform(0.8, 0.98),
            "metadata": recipient["metadata"]
        }
    else:
        # Random chance of finding a match even without explicit fingerprint
        if random.random() < 0.7:
            recipient = random.choice(MOCK_RECIPIENTS)
            return {
                "recipient_id": recipient["recipient_id"],
                "confidence": random.uniform(0.5, 0.85),
                "metadata": recipient["metadata"]
            }
        else:
            return {
                "recipient_id": None,
                "confidence": random.uniform(0.1, 0.4),
                "metadata": None
            }

# Function to check content for sensitive data
def check_content_for_sensitive_data(content: str) -> Dict[str, Any]:
    """Check content for sensitive data and return mock results."""
    # Randomly determine if sensitive data is present
    has_sensitive_data = random.random() < 0.8
    
    # If sensitive, randomly select 1-4 types of sensitive data
    detections = []
    if has_sensitive_data:
        num_detections = random.randint(1, 4)
        detection_types = random.sample(SENSITIVE_DATA_TYPES, num_detections)
        
        for detection_type in detection_types:
            # Create a detection with random position in the content
            start_pos = random.randint(0, max(0, len(content) - 20))
            end_pos = min(start_pos + len(SAMPLE_SENSITIVE_DATA[detection_type]), len(content))
            
            detections.append({
                "type": detection_type,
                "confidence": random.uniform(0.7, 0.99),
                "location": {"start": start_pos, "end": end_pos},
                "value": SAMPLE_SENSITIVE_DATA[detection_type][:5] + "****"  # Never show full sensitive data
            })
    
    # Calculate risk score based on number and types of detections
    risk_score = 0.0
    if detections:
        base_score = 0.5
        for detection in detections:
            # Higher confidence and certain types increase risk score more
            type_multiplier = 1.5 if detection["type"] in ["credit_card", "ssn", "password", "api_key"] else 1.0
            risk_score += (detection["confidence"] * type_multiplier) / len(detections)
        
        # Ensure score is between 0 and 1
        risk_score = min(0.95, max(0.1, risk_score))
    
    # Generate recommendation based on risk score
    recommendation = ""
    if risk_score > 0.8:
        recommendation = "High risk! Do not share this content. Consider redacting sensitive information."
    elif risk_score > 0.5:
        recommendation = "Medium risk. Review sensitive data before sharing."
    else:
        recommendation = "Low risk. Content appears safe to share."
    
    return {
        "has_sensitive_data": has_sensitive_data,
        "risk_score": risk_score,
        "recommendation": recommendation,
        "detections": detections,
        "tracking_id": str(uuid.uuid4())
    }

# Function to generate recent events for the dashboard
def get_recent_events(count: int = 10) -> List[Dict[str, Any]]:
    """Generate mock recent events for the dashboard."""
    now = datetime.datetime.now()
    events = []
    
    event_types = [
        "document_fingerprinted",
        "leak_identified",
        "sensitive_data_detected",
        "feedback_recorded",
        "new_recipient_added"
    ]
    
    for i in range(count):
        event_type = random.choice(event_types)
        timestamp = (now - datetime.timedelta(minutes=random.randint(1, 120))).isoformat()
        
        event_data = {}
        if event_type == "document_fingerprinted":
            recipient = random.choice(MOCK_RECIPIENTS)
            event_data = {
                "recipient_id": recipient["recipient_id"],
                "tracking_id": str(uuid.uuid4()),
                "document_length": random.randint(1000, 10000)
            }
        elif event_type == "leak_identified":
            recipient = random.choice(MOCK_RECIPIENTS)
            event_data = {
                "recipient_id": recipient["recipient_id"],
                "confidence": random.uniform(0.6, 0.98),
                "document_snippet": "...confidential information..."
            }
        elif event_type == "sensitive_data_detected":
            detections = random.sample(SENSITIVE_DATA_TYPES, random.randint(1, 3))
            event_data = {
                "risk_score": random.uniform(0.5, 0.95),
                "detections": detections,
                "content_type": random.choice(["text", "clipboard", "file"])
            }
        elif event_type == "feedback_recorded":
            event_data = {
                "detection_id": str(uuid.uuid4()),
                "was_correct": random.choice([True, True, False]),  # Bias toward correct
                "action": random.choice(["redact", "ignore", "report"])
            }
        elif event_type == "new_recipient_added":
            event_data = {
                "recipient_id": f"user{random.randint(100, 999)}@example.com",
                "department": random.choice(["Engineering", "Marketing", "Finance", "Legal", "HR"]),
                "access_level": random.choice(["Public", "Internal", "Confidential", "Restricted"])
            }
        
        events.append({
            "event_type": event_type,
            "event_data": event_data,
            "timestamp": timestamp
        })
    
    # Sort by timestamp (newest first)
    events.sort(key=lambda x: x["timestamp"], reverse=True)
    return events 