from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

class NoteEventSchema(BaseModel):
    pitch: int = Field(..., description="MIDI pitch number (0-127)")
    name: str = Field(..., description="Note name (e.g. C4, F#4)")
    start: float = Field(..., description="Start time in seconds")
    duration: float = Field(..., description="Duration in seconds")
    velocity: int = Field(100, description="Velocity 1-127")
    stem: Optional[str] = Field(None, description="Stem name")

class ChordEventSchema(BaseModel):
    time: float
    chord: str
    roman: str
    function: str

class ProgressionMatchSchema(BaseModel):
    name: str
    pattern: str
    confidence: float
    description: Optional[str] = None

class MelodyAnalysisSchema(BaseModel):
    pitch_range: Dict[str, Any]
    transitions: Dict[str, float]
    motifs: Optional[List[Dict[str, Any]]] = None

class HarmonyAnalysisSchema(BaseModel):
    chords: List[ChordEventSchema]
    progressions: List[str]
    matches: Optional[List[ProgressionMatchSchema]] = None

class RhythmAnalysisSchema(BaseModel):
    bpm: float
    beat_times: List[float]
    syncopation_ratio: Optional[float] = 0.25
    recommended_loop: Optional[Dict[str, Any]] = None

class TimbreAnalysisSchema(BaseModel):
    spectral_centroid_mean: float
    spectral_flatness_mean: Optional[float] = None
    mfcc_means: Optional[List[float]] = None
    rms_mean: float

class AnalysisResponseSchema(BaseModel):
    status: str
    task_id: str
    results: Dict[str, Any]
    notes: Optional[List[NoteEventSchema]] = None

class AnalyzeRequestSchema(BaseModel):
    file_id: str
    start_time: float
    end_time: float
    stems: List[str]
