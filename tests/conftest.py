"""
Pytest configuration ensuring ml_service modules are always on sys.path.
"""
import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[1]
ML_SERVICE_DIR = ROOT_DIR / "ml_service"

for p in [str(ROOT_DIR), str(ML_SERVICE_DIR)]:
    if p not in sys.path:
        sys.path.insert(0, p)

