import React from "react";
import { Container, Typography, Box } from "@mui/material";

export default function Home() {
  return (
    <Container sx={{ mt: 6 }}>
      <Box textAlign="center">
        <Typography variant="h3" gutterBottom>
          Welcome to WhisperPrint + Privacy-Guardian
        </Typography>
        <Typography variant="h6" color="text.secondary" gutterBottom>
          Secure your documents. Prevent leaks. Protect privacy.
        </Typography>
        <img
          src="https://cdn-icons-png.flaticon.com/512/3064/3064197.png"
          alt="Security"
          width={120}
          style={{ margin: "2rem 0" }}
        />
        <Typography>
          Use the navigation above to try document fingerprinting, privacy checks, and see real-time analytics!
        </Typography>
        <Box sx={{ mt: 8, color: 'text.secondary', fontSize: 14 }}>
          © 2025 WhisperPrint + Privacy-Guardian | <a href="https://github.com/" target="_blank" rel="noopener noreferrer">GitHub</a>
        </Box>
      </Box>
    </Container>
  );
} 