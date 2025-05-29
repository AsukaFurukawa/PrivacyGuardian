import re
import uuid
import json
from typing import Dict, List, Any, Optional, Tuple
import spacy
from transformers import pipeline
from datetime import datetime

class PrivacyGuardian:
    """
    Privacy-Guardian: A module for detecting sensitive information in text.
    
    This uses a combination of NLP techniques to identify and highlight
    personal information, sensitive data, and potentially confidential content.
    """
    
    def __init__(self, models_path: Optional[str] = None):
        """
        Initialize the Privacy Guardian detector.
        
        Args:
            models_path: Optional path to load models from. If None, will download from HuggingFace.
        """
        # Load models
        self.load_models(models_path)
        
        # Regex patterns for sensitive data
        self.patterns = {
            "EMAIL": r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b',
            "PHONE": r'\b(?:\+\d{1,3}[- ]?)?\(?\d{3}\)?[- ]?\d{3}[- ]?\d{4}\b',
            "SSN": r'\b\d{3}[-]?\d{2}[-]?\d{4}\b',
            "CREDIT_CARD": r'\b(?:\d{4}[- ]?){3}\d{4}\b',
            "IP_ADDRESS": r'\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b',
            "ADDRESS": r'\b\d+\s+[A-Za-z0-9\s,.-]+(?:Avenue|Lane|Road|Boulevard|Drive|Street|Ave|Dr|Rd|Blvd|Ln|St)\.?\b',
            "DATE_OF_BIRTH": r'\b(?:0[1-9]|1[0-2])[/.-](?:0[1-9]|[12][0-9]|3[01])[/.-](?:19|20)\d\d\b',
            "PASSPORT": r'\b[A-Z]{1,2}[0-9]{6,9}\b',
            "API_KEY": r'\b(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=|[A-Za-z0-9+/]{4})\b'
        }
        
        # Sensitive topics and keywords
        self.sensitive_topics = {
            "MEDICAL": ["diagnosis", "patient", "treatment", "hospital", "medication", "disease", "symptom", "doctor", "health", "medical", "clinical"],
            "FINANCIAL": ["bank", "account", "credit", "debit", "loan", "mortgage", "payment", "transaction", "finance", "salary", "income", "tax"],
            "LEGAL": ["contract", "agreement", "lawsuit", "legal", "attorney", "court", "judge", "plaintiff", "defendant", "settlement", "confidential"],
            "CORPORATE": ["confidential", "internal", "proprietary", "trade secret", "intellectual property", "strategy", "roadmap", "unreleased", "merger", "acquisition"]
        }
        
        # Feedback store for continuous learning
        self.feedback_store = []
        
    def load_models(self, models_path: Optional[str] = None):
        """
        Load NLP models for detection.
        
        Args:
            models_path: Optional path to load models from.
        """
        try:
            # Load NER model for named entity recognition
            self.nlp = spacy.load("en_core_web_md")
            
            # Load zero-shot classification model for sensitive topic detection
            self.classifier = pipeline("zero-shot-classification", 
                                       model="facebook/bart-large-mnli", 
                                       device=-1)  # Use CPU
            
            print("Privacy-Guardian models loaded successfully")
        except Exception as e:
            print(f"Error loading models: {e}")
            # Fallback to simpler models
            self.nlp = spacy.load("en_core_web_sm")
            # Disable classifier if it fails to load
            self.classifier = None
            print("Loaded fallback models")
    
    def check_content(self, content: str, content_type: str = "text") -> Dict[str, Any]:
        """
        Check content for sensitive information.
        
        Args:
            content: The text content to check.
            content_type: Type of content (text, email, code, etc.)
            
        Returns:
            Dict with detection results.
        """
        # Generate a tracking ID for this check
        tracking_id = str(uuid.uuid4())
        
        # Run detections
        regex_detections = self._detect_with_regex(content)
        ner_detections = self._detect_with_ner(content)
        topic_detections = self._detect_sensitive_topics(content)
        
        # Combine all detections
        all_detections = regex_detections + ner_detections + topic_detections
        
        # Calculate risk score (0.0 to 1.0)
        risk_score = self._calculate_risk_score(all_detections, content_type)
        
        # Generate recommendation
        recommendation = self._generate_recommendation(risk_score, all_detections)
        
        # Prepare result
        result = {
            "tracking_id": tracking_id,
            "has_sensitive_data": len(all_detections) > 0,
            "risk_score": risk_score,
            "recommendation": recommendation,
            "detections": all_detections,
            "content_type": content_type
        }
        
        return result
    
    def _detect_with_regex(self, content: str) -> List[Dict[str, Any]]:
        """
        Detect sensitive information using regex patterns.
        
        Args:
            content: The text content to check.
            
        Returns:
            List of detections.
        """
        detections = []
        
        for label, pattern in self.patterns.items():
            matches = re.finditer(pattern, content)
            for match in matches:
                detection = {
                    "id": str(uuid.uuid4()),
                    "label": label,
                    "text": match.group(),
                    "confidence": 0.95,
                    "method": "regex",
                    "span": (match.start(), match.end())
                }
                detections.append(detection)
                
        return detections
    
    def _detect_with_ner(self, content: str) -> List[Dict[str, Any]]:
        """
        Detect sensitive information using named entity recognition.
        
        Args:
            content: The text content to check.
            
        Returns:
            List of detections.
        """
        detections = []
        
        # Process with spaCy
        doc = self.nlp(content)
        
        # Map of entity types to sensitivity
        sensitive_entities = {
            "PERSON": 0.8,
            "ORG": 0.5,
            "GPE": 0.5,  # Geo-political entity
            "LOC": 0.4,  # Location
            "MONEY": 0.9,
            "DATE": 0.3
        }
        
        # Extract entities
        for ent in doc.ents:
            if ent.label_ in sensitive_entities:
                confidence = sensitive_entities[ent.label_]
                
                detection = {
                    "id": str(uuid.uuid4()),
                    "label": f"NER_{ent.label_}",
                    "text": ent.text,
                    "confidence": confidence,
                    "method": "ner",
                    "span": (ent.start_char, ent.end_char)
                }
                detections.append(detection)
                
        return detections
    
    def _detect_sensitive_topics(self, content: str) -> List[Dict[str, Any]]:
        """
        Detect sensitive topics in the content.
        
        Args:
            content: The text content to check.
            
        Returns:
            List of detections.
        """
        detections = []
        
        # Simple keyword-based detection
        for topic, keywords in self.sensitive_topics.items():
            for keyword in keywords:
                if re.search(r'\b' + re.escape(keyword) + r'\b', content, re.IGNORECASE):
                    detection = {
                        "id": str(uuid.uuid4()),
                        "label": f"TOPIC_{topic}",
                        "text": f"Contains sensitive {topic.lower()} information",
                        "confidence": 0.7,
                        "method": "keyword",
                        "span": None  # No specific span for topic detection
                    }
                    detections.append(detection)
                    break  # Only report once per topic
        
        # Use zero-shot classification if available
        if self.classifier and len(content.split()) > 5:  # Only for non-trivial content
            try:
                # Truncate content if too long
                truncated_content = ' '.join(content.split()[:500])
                
                # Define candidate labels for classification
                topics = list(self.sensitive_topics.keys())
                
                # Run classification
                result = self.classifier(truncated_content, topics, multi_label=True)
                
                # Add high-confidence topics
                for i, topic in enumerate(result['labels']):
                    confidence = result['scores'][i]
                    if confidence > 0.7:  # Only include high-confidence matches
                        detection = {
                            "id": str(uuid.uuid4()),
                            "label": f"TOPIC_{topic}",
                            "text": f"Contains sensitive {topic.lower()} information (ML)",
                            "confidence": confidence,
                            "method": "ml_classification",
                            "span": None
                        }
                        detections.append(detection)
            except Exception as e:
                print(f"Error in topic classification: {e}")
                
        return detections
    
    def _calculate_risk_score(self, detections: List[Dict[str, Any]], content_type: str) -> float:
        """
        Calculate a risk score based on detections.
        
        Args:
            detections: List of detected sensitive items.
            content_type: Type of content being checked.
            
        Returns:
            Risk score between 0.0 and 1.0.
        """
        if not detections:
            return 0.0
        
        # Base weights for different types of sensitive data
        weights = {
            "EMAIL": 0.4,
            "PHONE": 0.4,
            "SSN": 0.9,
            "CREDIT_CARD": 0.9,
            "IP_ADDRESS": 0.3,
            "ADDRESS": 0.6,
            "DATE_OF_BIRTH": 0.7,
            "PASSPORT": 0.8,
            "API_KEY": 0.8,
            "NER_PERSON": 0.5,
            "NER_ORG": 0.3,
            "NER_GPE": 0.3,
            "NER_LOC": 0.2,
            "NER_MONEY": 0.7,
            "NER_DATE": 0.2,
            "TOPIC_MEDICAL": 0.8,
            "TOPIC_FINANCIAL": 0.7,
            "TOPIC_LEGAL": 0.6,
            "TOPIC_CORPORATE": 0.5
        }
        
        # Adjust weights based on content type
        if content_type == "email":
            # Emails naturally contain emails and names
            weights["EMAIL"] *= 0.5
            weights["NER_PERSON"] *= 0.7
        elif content_type == "code":
            # Code might contain API keys
            weights["API_KEY"] *= 1.2
        
        # Calculate score based on detections and their confidence
        total_weight = 0.0
        for detection in detections:
            label = detection["label"]
            confidence = detection["confidence"]
            
            # Get weight for this type of detection
            weight = weights.get(label, 0.5)  # Default weight if unknown label
            
            # Add to total weight, factoring in confidence
            total_weight += weight * confidence
        
        # Normalize to 0-1 range with a sigmoid-like curve
        normalized_score = min(0.95, total_weight / (total_weight + 3.0))
        
        return normalized_score
    
    def _generate_recommendation(self, risk_score: float, detections: List[Dict[str, Any]]) -> str:
        """
        Generate a recommendation based on the risk score.
        
        Args:
            risk_score: The calculated risk score.
            detections: List of detected sensitive items.
            
        Returns:
            Recommendation string: "safe", "review", or "block".
        """
        if risk_score < 0.3:
            return "safe"
        elif risk_score < 0.7:
            return "review"
        else:
            return "block"
    
    def record_feedback(self, detection_id: str, action: str, was_correct: bool, comments: Optional[str] = None) -> bool:
        """
        Record user feedback for continuous improvement.
        
        Args:
            detection_id: ID of the detection being rated.
            action: The action taken (safe, review, block).
            was_correct: Whether the detection/recommendation was correct.
            comments: Optional user comments.
            
        Returns:
            True if feedback was recorded successfully.
        """
        feedback = {
            "detection_id": detection_id,
            "action": action,
            "was_correct": was_correct,
            "comments": comments,
            "timestamp": str(datetime.now())
        }
        
        self.feedback_store.append(feedback)
        
        # In a real implementation, this would be stored in a database
        # and used to retrain/adjust the models over time
        
        return True
    
    def get_detection_statistics(self) -> Dict[str, Any]:
        """
        Get statistics about detections.
        
        Returns:
            Dictionary of detection statistics.
        """
        stats = {
            "total_feedback": len(self.feedback_store),
            "correct_percentage": 0.0,
            "most_common_detections": {}
        }
        
        if self.feedback_store:
            # Calculate correct percentage
            correct_count = sum(1 for f in self.feedback_store if f["was_correct"])
            stats["correct_percentage"] = correct_count / len(self.feedback_store)
        
        return stats

if __name__ == "__main__":
    # Simple test
    guardian = PrivacyGuardian()
    
    test_text = """
    John Smith lives at 123 Main St, New York, NY 10001.
    His email is john.smith@example.com and phone number is (555) 123-4567.
    His credit card number is 4111-1111-1111-1111 and his SSN is 123-45-6789.
    He was diagnosed with hypertension last year and his doctor prescribed him medication.
    """
    
    result = guardian.check_content(test_text)
    
    print(f"Risk Score: {result['risk_score']:.2f}")
    print(f"Recommendation: {result['recommendation']}")
    print("\nDetections:")
    
    for detection in result["detections"]:
        print(f"- {detection['label']}: {detection['text']} (Confidence: {detection['confidence']:.2f})") 