import React, { useState } from "react";
import { Container, Card, Typography, TextField, Button, Box, Alert, CircularProgress } from "@mui/material";
import { api } from "../api";
import { dummyFingerprintResult } from "../dummyData";

const SAMPLE_RECIPIENT = "alice.smith@acme-corp.com";
const SAMPLE_TEXT = `Confidential Q2 Financial Report\n\nRevenue: $1,200,000\nProfit: $350,000\nSSN: 123-45-6789\n`;

export default function Fingerprint() {
  const [recipient, setRecipient] = useState(SAMPLE_RECIPIENT);
  const [text, setText] = useState(SAMPLE_TEXT);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleFingerprint = async () => {
    setLoading(true);
    setResult(null);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      setResult(dummyFingerprintResult);
    } catch (err) {
      setResult({ error: "Error: " + (err.response?.data?.detail || err.message) });
    }
    setLoading(false);
  };

  return (
    <Container sx={{ mt: 4 }}>
      <Card sx={{ p: 3, maxWidth: 800, mx: "auto" }}>
        <Typography variant="h5" gutterBottom>
          Fingerprint Document
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Add an invisible watermark to your document to track its distribution and detect leaks.
        </Typography>
        
        <TextField
          label="Recipient Email"
          fullWidth
          margin="normal"
          value={recipient}
          onChange={e => setRecipient(e.target.value)}
          placeholder="Enter recipient's email address"
          helperText="This will be used to track document distribution"
        />
        
        <TextField
          label="Document Text"
          fullWidth
          multiline
          rows={6}
          margin="normal"
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Paste your document content here..."
          helperText="The watermark will be invisibly embedded in this text"
        />
        
        <Button
          variant="contained"
          onClick={handleFingerprint}
          sx={{ mt: 3 }}
          disabled={loading || !text || !recipient}
          fullWidth
        >
          {loading ? (
            <>
              <CircularProgress size={24} sx={{ mr: 1 }} />
              Processing...
            </>
          ) : (
            "Fingerprint Document"
          )}
        </Button>

        {result && (
          <Box sx={{ mt: 4 }}>
            {result.error ? (
              <Alert severity="error">{result.error}</Alert>
            ) : (
              <>
                <Alert severity="success" sx={{ mb: 2 }}>
                  Document successfully fingerprinted!
                </Alert>
                <Card variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="subtitle1" gutterBottom>
                    Tracking Information
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    <strong>Tracking ID:</strong> {result.tracking_id}
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    <strong>Recipient UUID:</strong> {result.recipient_uuid}
                  </Typography>
                  <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }}>
                    Fingerprinted Text
                  </Typography>
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      p: 2, 
                      bgcolor: 'grey.50', 
                      borderRadius: 1,
                      whiteSpace: 'pre-wrap'
                    }}
                  >
                    {result.fingerprinted_text}
                  </Typography>
                </Card>
              </>
            )}
          </Box>
        )}
      </Card>
    </Container>
  );
} 