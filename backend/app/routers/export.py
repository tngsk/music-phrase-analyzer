from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from app.config import OUTPUT_DIR
from pathlib import Path
import pretty_midi

router = APIRouter(prefix="/export", tags=["Export"])

@router.get("/report/{task_id}")
async def get_report(task_id: str):
    report_file = OUTPUT_DIR / task_id / "report.md"
    if not report_file.exists():
        raise HTTPException(status_code=404, detail="Report not found")
        
    with open(report_file, "r") as f:
        content = f.read()
    return {"status": "success", "report": content}

@router.get("/midi/{task_id}/{stem}")
async def get_midi(task_id: str, stem: str):
    task_dir = OUTPUT_DIR / task_id
    if not task_dir.exists():
        raise HTTPException(status_code=404, detail="Task not found")

    if stem == "all":
        midi_file = task_dir / "all_stems.mid"
        if not midi_file.exists():
            # Combine individual stem MIDIs into a single multi-track PrettyMIDI
            combined_pm = pretty_midi.PrettyMIDI()
            for mf in sorted(task_dir.glob("*.mid")):
                if mf.name != "all_stems.mid":
                    try:
                        pm = pretty_midi.PrettyMIDI(str(mf))
                        for inst in pm.instruments:
                            combined_pm.instruments.append(inst)
                    except Exception:
                        pass
            combined_pm.write(str(midi_file))
        return FileResponse(midi_file, media_type="audio/midi", filename="all_stems.mid")

    midi_file = task_dir / f"{stem}.mid"
    if not midi_file.exists():
        raise HTTPException(status_code=404, detail=f"MIDI for stem '{stem}' not found")
        
    return FileResponse(midi_file, media_type="audio/midi", filename=f"{stem}.mid")

@router.get("/audio/{task_id}/{stem}")
async def get_stem_audio(task_id: str, stem: str):
    """
    Stream or download separated audio stem WAV file.
    """
    task_dir = OUTPUT_DIR / task_id
    if not task_dir.exists():
        raise HTTPException(status_code=404, detail="Task not found")

    if stem in ["sliced", "full"]:
        audio_file = task_dir / "sliced.wav"
    else:
        audio_file = task_dir / "stems" / f"{stem}.wav"
        if not audio_file.exists():
            # fallback to sliced.wav if specific stem file not found
            audio_file = task_dir / "sliced.wav"

    if not audio_file.exists():
        raise HTTPException(status_code=404, detail=f"Audio for stem '{stem}' not found")

    return FileResponse(audio_file, media_type="audio/wav", filename=f"{stem}.wav")
