import sys
import os
import json
import warnings
warnings.filterwarnings("ignore")

# Need Intel GPU/runtime DLL setup to avoid torch WinError 127
_dll_path = os.path.join(os.path.abspath('..'), ".venv", "Library", "bin")
if os.path.isdir(_dll_path):
    os.environ["PATH"] = _dll_path + os.pathsep + os.environ.get("PATH", "")

from fastapi.testclient import TestClient
from main import app

with TestClient(app) as client:
    print("Testing /api/v1/health...")
    health_response = client.get("/api/v1/health")
    print(f"Status Code: {health_response.status_code}")
    print(json.dumps(health_response.json(), indent=2))
    
    print("\nTesting /api/v1/predict...")
    predict_response = client.post(
        "/api/v1/predict",
        json={"text": "This movie was absolutely brilliant but the ending ruined everything", "models": ["lr", "lstm", "bert"]}
    )
    print(f"Status Code: {predict_response.status_code}")
    if predict_response.status_code == 200:
        print(json.dumps(predict_response.json(), indent=2))
    else:
        print(predict_response.text)
