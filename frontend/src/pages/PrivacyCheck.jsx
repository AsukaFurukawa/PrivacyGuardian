import React, { useState } from "react";
import { Container, Card, Typography, TextField, Button, Box, Alert, CircularProgress, Chip, LinearProgress } from "@mui/material";
import { api } from "../api";
import { dummyPrivacyCheckResult } from "../dummyData";

const SAMPLE_CONTENT = `Employee: John Doe\nSSN: 123-45-6789\nCredit Card: 4111 1111 1111 1111\nEmail: john.doe@email.com`;

export default function PrivacyCheck() {
  const [content, setContent] = useState(SAMPLE_CONTENT);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleCheck = async () => {
    setLoading(true);
    setResult(null);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      setResult(dummyPrivacyCheckResult);
    } catch (err) {
      setResult({ error: "Error: " + (err.response?.data?.detail || err.message) });
    }
    setLoading(false);
  };

  const getRiskColor = (score) => {
    if (score < 0.3) return "success";
    if (score < 0.6) return "warning";
    return "error";
  };

  return (
    <Container sx={{ mt: 4 }}>
      <Card sx={{ p: 3, maxWidth: 800, mx: "auto" }}>
        <Typography variant="h5" gutterBottom>
          Privacy Check
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Scan your content for sensitive information and get privacy risk assessment.
        </Typography>
        
        <TextField
          label="Content to Check"
          fullWidth
          multiline
          rows={6}
          margin="normal"
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="Paste your content here to check for sensitive information..."
          helperText="We'll scan for PII, secrets, and other sensitive data"
        />
        
        <Button
          variant="contained"
          onClick={handleCheck}
          sx={{ mt: 3 }}
          disabled={loading || !content}
          fullWidth
        >
          {loading ? (
            <>
              <CircularProgress size={24} sx={{ mr: 1 }} />
              Scanning...
            </>
          ) : (
            "Check Privacy"
          )}
        </Button>

        {result && (
          <Box sx={{ mt: 4 }}>
            {result.error ? (
              <Alert severity="error">{result.error}</Alert>
            ) : (
              <>
                <Alert severity={getRiskColor(result.risk_score)} sx={{ mb: 2 }}>
                  Risk Score: {Math.round(result.risk_score * 100)}%
                </Alert>
                
                <Card variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="subtitle1" gutterBottom>
                    Risk Assessment
                  </Typography>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" gutterBottom>
                      Risk Level
                    </Typography>
                    <LinearProgress 
                      variant="determinate" 
                      value={result.risk_score * 100}
                      color={getRiskColor(result.risk_score)}
                      sx={{ height: 10, borderRadius: 5 }}
                    />
                  </Box>
                  
                  <Typography variant="subtitle1" gutterBottom>
                    Recommendation
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 2 }}>
                    {result.recommendation}
                  </Typography>
                  
                  <Typography variant="subtitle1" gutterBottom>
                    Detected Sensitive Information
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {result.detections.map((detection, index) => (
                      <Chip
                        key={index}
                        label={`${detection.type} (${Math.round(detection.confidence * 100)}%)`}
                        color={detection.confidence > 0.8 ? "error" : "warning"}
                        variant="outlined"
                      />
                    ))}
                  </Box>
                </Card>
              </>
            )}
          </Box>
        )}
      </Card>
    </Container>
  );
} 