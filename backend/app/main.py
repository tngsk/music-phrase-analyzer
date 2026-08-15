from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="music-phrase-analyzer API",
    description="Demucs + Mirelo + music21 + librosa Music Phrase Analysis API",
    version="0.1.0",
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

from app.routers import upload_router, analyze_router, export_router

app.include_router(upload_router)
app.include_router(analyze_router)
app.include_router(export_router)
