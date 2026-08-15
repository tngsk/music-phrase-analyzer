from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from app.config import OUTPUT_DIR

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
    midi_file = OUTPUT_DIR / task_id / f"{stem}.mid"
    if not midi_file.exists():
        raise HTTPException(status_code=404, detail="MIDI not found")
        
    return FileResponse(midi_file, media_type="audio/midi", filename=f"{stem}.mid")
