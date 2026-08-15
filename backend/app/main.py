import atexit
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.services.cleanup_service import cleanup_all_temp_data


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: nothing special needed
    yield
    # Shutdown: clean up all temporary uploaded audio and generated stems/MIDIs
    cleanup_all_temp_data(keep_gitkeep=True)


# Also register atexit for normal process terminations
atexit.register(cleanup_all_temp_data, keep_gitkeep=True)

app = FastAPI(
    title="music-phrase-analyzer API",
    description="Demucs + Mirelo + music21 + librosa Music Phrase Analysis API",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000", "*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def read_root():
    return {
        "name": "music-phrase-analyzer API",
        "status": "running",
        "version": "0.1.0",
    }


@app.get("/health")
def health_check():
    return {"status": "ok"}


@app.post("/cleanup")
def cleanup_data():
    """Explicitly cleans up all uploaded audio and output stems/MIDIs."""
    result = cleanup_all_temp_data(keep_gitkeep=True)
    return result


from app.routers import upload_router, analyze_router, export_router

app.include_router(upload_router)
app.include_router(analyze_router)
app.include_router(export_router)
