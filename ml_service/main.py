import os
os.environ["KMP_DUPLICATE_LIB_OK"] = "TRUE"

# Bypass protobuf gencode validation mismatch across local environment packages
try:
    import google.protobuf.runtime_version as rv
    rv.ValidateProtobufRuntimeVersion = lambda *args, **kwargs: None
except Exception:
    pass

# Need Intel GPU/runtime DLL setup to avoid torch WinError 127
_dll_path = os.path.join(os.path.abspath('..'), ".venv", "Library", "bin")
if os.path.isdir(_dll_path):
    os.environ["PATH"] = _dll_path + os.pathsep + os.environ.get("PATH", "")

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.config import settings
from app.api.routes import router
from app.api.revio_routes import revio_router
from app.services.model_loader import model_manager

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Load all ML models at startup
    print("Loading ML models...")
    model_manager.load_all_models()
    print("Model loading complete.")
    yield
    # Clean up resources on shutdown if needed
    print("Shutting down ML Service...")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    lifespan=lifespan
)

# Set up CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict to gateway URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix=settings.API_V1_STR)
app.include_router(revio_router, prefix=settings.API_V1_STR)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
