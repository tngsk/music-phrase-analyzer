from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from pathlib import Path
import os
import uuid
import json

from app.config import UPLOAD_DIR, OUTPUT_DIR
from app.services import (
    slice_and_normalize_audio,
    run_demucs_separation,
    run_audio_to_midi,
    analyze_melody,
    analyze_harmony,
    analyze_rhythm,
    analyze_timbre,
    generate_report
)

router = APIRouter(prefix="/analyze", tags=["Analyze"])

class AnalyzeRequest(BaseModel):
    file_id: str
    start_time: float
    end_time: float
    stems: List[str]

@router.post("/")
async def analyze_phrase(request: AnalyzeRequest):
    # Find uploaded file
    file_path = None
    for ext in [".wav", ".mp3", ".flac", ".m4a", ".ogg", ".WAV", ".MP3", ".FLAC"]:
        candidate = UPLOAD_DIR / f"{request.file_id}{ext}"
        if candidate.exists():
            file_path = candidate
            break
            
    if not file_path:
        raise HTTPException(status_code=404, detail="File not found")

    task_id = str(uuid.uuid4())
    task_dir = OUTPUT_DIR / task_id
    task_dir.mkdir(parents=True, exist_ok=True)
    
    sliced_audio_path = task_dir / "sliced.wav"
    
    # 1. Slice audio
    try:
        slice_and_normalize_audio(file_path, sliced_audio_path, request.start_time, request.end_time)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Audio slicing failed: {str(e)}")

    # 2. Stem separation
    stem_dir = task_dir / "stems"
    stems_to_separate = request.stems if request.stems else ["vocals", "bass", "drums", "other"]
    separated_stems = run_demucs_separation(sliced_audio_path, stem_dir, stems_to_separate)

    analysis_results = {}
    all_notes = []

    # 3. Process each stem
    midi_paths = {}
    melody_results = {}
    harmony_results = {}
    
    for stem, stem_path in separated_stems.items():
        midi_path = task_dir / f"{stem}.mid"
        notes = run_audio_to_midi(stem_path, midi_path, stem_name=stem)
        all_notes.extend(notes)
        midi_paths[stem] = midi_path
        
        if stem in ["other", "vocals", "piano", "guitar"]:
            m_res = analyze_melody(str(midi_path))
            if "error" not in m_res:
                melody_results[stem] = m_res
                
            h_res = analyze_harmony(str(midi_path))
            if "error" not in h_res:
                harmony_results[stem] = h_res

    # 4. Global analysis (rhythm, timbre on sliced audio)
    rhythm_res = analyze_rhythm(str(sliced_audio_path))
    timbre_res = analyze_timbre(str(sliced_audio_path))
    
    # Aggregate results
    if melody_results:
        analysis_results["melody"] = list(melody_results.values())[0]
    if harmony_results:
        analysis_results["harmony"] = list(harmony_results.values())[0]
        
    analysis_results["rhythm"] = rhythm_res
    analysis_results["timbre"] = timbre_res
    
    # 5. Generate Report
    report = generate_report(analysis_results)
    
    # Save report
    with open(task_dir / "report.json", "w") as f:
        json.dump(report["json"], f)
        
    with open(task_dir / "report.md", "w") as f:
        f.write(report["markdown"])
        
    return {
        "status": "completed", 
        "task_id": task_id,
        "results": analysis_results,
        "notes": all_notes
    }
