import uvicorn
import os
import sys

if __name__ == "__main__":
    # Add the current directory to the path so imports work
    sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))
    
    # Run the FastAPI server
    uvicorn.run("api.main:app", host="0.0.0.0", port=8000, reload=True) 