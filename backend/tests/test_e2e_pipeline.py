import pytest
import numpy as np
import soundfile as sf
import io
from pathlib import Path
from fastapi.testclient import TestClient
from app.main import app

@pytest.fixture
def client():
    return TestClient(app)

@pytest.fixture
def sample_wav_bytes():
    """Create a 2-second synthesized polyphonic WAV file in memory."""
    sr = 22050
    t = np.linspace(0, 2.0, sr * 2)
    # Vocal-like sine + bass-like low frequency + percussive clicks
    y = 0.4 * np.sin(2 * np.pi * 440 * t) + 0.3 * np.sin(2 * np.pi * 110 * t)
    
    buf = io.BytesIO()
    sf.write(buf, y, sr, format='WAV')
    buf.seek(0)
    return buf.read()

def test_full_pipeline_integration(client, sample_wav_bytes):
    """
    E2E Dataflow Integration Test for 6-Stem Pipeline & Interactive Harmony Re-analysis:
    Upload Audio -> Analyze with Demucs 6s -> Instantaneous Harmony Re-analysis -> Verify Exports.
    Strictly asserts genuine data generation without silent fallbacks.
    """
    # 1. Upload Audio
    files = {"file": ("test_clip.wav", io.BytesIO(sample_wav_bytes), "audio/wav")}
    res_up = client.post("/upload/", files=files)
    assert res_up.status_code == 200, f"Upload failed: {res_up.text}"
    file_id = res_up.json().get("file_id")
    assert file_id is not None
    
    # 2. Analyze Phrase (Demucs 6s separation: vocals, bass, drums, guitar, piano, other)
    stems_6 = ["vocals", "bass", "drums", "guitar", "piano", "other"]
    analyze_payload = {
        "file_id": file_id,
        "start_time": 0.0,
        "end_time": 2.0,
        "stems": stems_6
    }
    res_an = client.post("/analyze/", json=analyze_payload)
    assert res_an.status_code == 200, f"Analysis failed: {res_an.text}"
    data = res_an.json()
    
    task_id = data.get("task_id")
    assert task_id is not None
    assert "results" in data
    assert "notes" in data
    assert "stems" in data
    assert len(data["stems"]) == 6

    # 3. Test On-demand Harmony Re-analysis with custom stems (e.g. ['bass', 'other'])
    res_reharmony = client.post("/analyze/harmony", json={
        "task_id": task_id,
        "stems": ["bass", "other"]
    })
    assert res_reharmony.status_code == 200
    reharmony_data = res_reharmony.json()
    assert reharmony_data["status"] == "success"
    assert "harmony" in reharmony_data
    assert "chords" in reharmony_data["harmony"]

    # 4. Verify All 6 Stem Audio & MIDI Endpoints
    for stem_info in data["stems"]:
        stem_name = stem_info["stem"]
        assert stem_name in stems_6
        
        res_audio = client.get(f"/export/audio/{task_id}/{stem_name}")
        assert res_audio.status_code == 200, f"Stem audio download failed for '{stem_name}'"
        assert len(res_audio.content) > 1000, f"Stem '{stem_name}' audio is suspiciously small"
        
        res_midi = client.get(f"/export/midi/{task_id}/{stem_name}")
        assert res_midi.status_code == 200, f"Stem MIDI download failed for '{stem_name}'"
        assert len(res_midi.content) > 50, f"Stem '{stem_name}' MIDI is empty"

    # 5. Verify Multi-track Combined MIDI
    res_all_midi = client.get(f"/export/midi/{task_id}/all")
    assert res_all_midi.status_code == 200
    assert len(res_all_midi.content) > 100

    # 6. Verify Report
    res_rep = client.get(f"/export/report/{task_id}")
    assert res_rep.status_code == 200
    assert "report" in res_rep.json()
    assert len(res_rep.json()["report"]) > 50
