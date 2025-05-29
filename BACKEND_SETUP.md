# WhisperPrint + Privacy-Guardian Backend Setup

This guide will help you set up and run the backend server for the WhisperPrint + Privacy-Guardian application.

## Prerequisites

- Python 3.8 or higher
- pip (Python package installer)
- Git (to clone the repository)

## Installation

1. Create a Python virtual environment:
   ```bash
   # Windows
   python -m venv venv
   .\venv\Scripts\activate

   # macOS/Linux
   python3 -m venv venv
   source venv/bin/activate
   ```

2. Install the dependencies:
   ```bash
   # You might want to install a subset of the dependencies to avoid errors
   pip install fastapi uvicorn pydantic python-multipart websockets
   ```

   If you want to install all dependencies (this might cause errors on some systems):
   ```bash
   pip install -r requirements.txt
   ```

3. Run the server:
   ```bash
   python run_server.py
   ```

## Troubleshooting Common Issues

### Installation Issues

If you encounter errors with some of the dependencies like `spacy` or `torch`, you can try installing a minimal set of dependencies:

```bash
pip install fastapi==0.95.0 uvicorn==0.21.1 pydantic==1.10.7 python-multipart==0.0.6 websockets==11.0.2
```

### Connection Issues

- Make sure the server is running on `localhost:8000`
- Check if your firewall is blocking the connection
- If you're using a different host or port, update the settings in the client application

## Running in Demo Mode

If you're having trouble setting up the backend, the client application can run in demo mode without a backend:

1. Open the client application
2. Go to Settings
3. Check "Run in Demo Mode"

In demo mode, all backend functionality is simulated client-side.

## Building Your Own Backend

If you want to implement a custom backend, you need to provide the following endpoints:

- `POST /fingerprint` - Create fingerprinted text
- `POST /fingerprint/file` - Create fingerprinted document
- `POST /identify` - Identify source of leaked content
- `POST /check` - Check content for sensitive information
- `GET /stats` - Get usage statistics
- WebSocket endpoint at `/ws/dashboard` for real-time updates

Check the API implementation in the `api/` directory for reference. 