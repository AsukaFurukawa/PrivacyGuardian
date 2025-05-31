export const dummyAnalytics = {
  total_documents: 156,
  total_recipients: 42,
  risk_score_distribution: {
    "Low (0-20%)": 45,
    "Medium (21-50%)": 78,
    "High (51-80%)": 23,
    "Critical (81-100%)": 10
  }
};

export const dummyEvents = [
  {
    event_type: "document_fingerprinted",
    timestamp: "2024-03-15T14:30:00Z",
    event_data: {
      document_id: "doc_123",
      recipient_id: "rec_456",
      risk_score: 0.35
    }
  },
  {
    event_type: "privacy_check",
    timestamp: "2024-03-15T14:25:00Z",
    event_data: {
      content: "Sample document with SSN: 123-45-6789",
      risk_score: 0.85,
      detections: [
        { type: "SSN", confidence: 0.95 },
        { type: "PII", confidence: 0.75 }
      ]
    }
  },
  {
    event_type: "leak_detected",
    timestamp: "2024-03-15T14:20:00Z",
    event_data: {
      document_id: "doc_789",
      source: "GitHub",
      confidence: 0.92
    }
  },
  {
    event_type: "document_fingerprinted",
    timestamp: "2024-03-15T14:15:00Z",
    event_data: {
      document_id: "doc_101",
      recipient_id: "rec_202",
      risk_score: 0.15
    }
  },
  {
    event_type: "privacy_check",
    timestamp: "2024-03-15T14:10:00Z",
    event_data: {
      content: "Internal memo about Q2 earnings",
      risk_score: 0.25,
      detections: [
        { type: "Financial", confidence: 0.65 }
      ]
    }
  }
];

export const dummyFingerprintResult = {
  tracking_id: "TRK_123456",
  recipient_uuid: "REC_789012",
  fingerprinted_text: "This is a sample document with an invisible watermark. The watermark contains tracking information that can be used to identify the source of any leaks."
};

export const dummyPrivacyCheckResult = {
  risk_score: 0.75,
  recommendation: "High risk content detected. Consider redacting sensitive information before sharing.",
  detections: [
    { type: "SSN", confidence: 0.95 },
    { type: "Credit Card", confidence: 0.85 },
    { type: "Email", confidence: 0.75 }
  ]
}; 