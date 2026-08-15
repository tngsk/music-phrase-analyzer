import pytest
import numpy as np
import soundfile as sf
import pretty_midi
import tempfile
from pathlib import Path

from app.services.analysis_melody import analyze_melody
from app.services.analysis_harmony import analyze_harmony
from app.services.analysis_rhythm import analyze_rhythm
from app.services.analysis_timbre import analyze_timbre
from app.services.report_gen import generate_report

@pytest.fixture
def sample_midi_path(tmp_path):
    midi_file = tmp_path / "test.mid"
    pm = pretty_midi.PrettyMIDI()
    inst = pretty_midi.Instrument(program=0)
    
    # C major triad notes (C4, E4, G4)
    for pitch in [60, 64, 67]:
        inst.notes.append(pretty_midi.Note(
            velocity=100, pitch=pitch, start=0.0, end=1.0
        ))
    pm.instruments.append(inst)
    pm.write(str(midi_file))
    return str(midi_file)

@pytest.fixture
def sample_audio_path(tmp_path):
    """Generates a 3-second audio clip with 120 BPM clicks (every 0.5s) and harmonic tone."""
    audio_file = tmp_path / "test.wav"
    sr = 22050
    duration = 3.0
    t = np.linspace(0, duration, int(sr * duration))
    
    # 440 Hz tone
    y = 0.3 * np.sin(2 * np.pi * 440 * t)
    
    # Add percussive clicks at 120 BPM (0.0s, 0.5s, 1.0s, 1.5s, 2.0s, 2.5s)
    for beat_time in np.arange(0, duration, 0.5):
        idx = int(beat_time * sr)
        click_len = min(int(0.02 * sr), len(y) - idx)
        y[idx:idx + click_len] += np.random.uniform(0.5, 0.9, click_len)
        
    sf.write(str(audio_file), y, sr)
    return str(audio_file)

def test_analyze_melody(sample_midi_path):
    res = analyze_melody(sample_midi_path)
    assert "error" not in res
    assert "pitch_range" in res
    # C4(60) to G4(67)
    assert res["pitch_range"]["min"] == 60
    assert res["pitch_range"]["max"] == 67
    assert res["pitch_range"]["range"] == 7

def test_analyze_harmony(sample_midi_path):
    res = analyze_harmony(sample_midi_path)
    assert "error" not in res
    assert "chords" in res
    assert len(res["chords"]) > 0
    # Must identify C major chord
    chord_names = [c["chord"] for c in res["chords"]]
    assert any("C" in name for name in chord_names)

def test_analyze_rhythm(sample_audio_path):
    res = analyze_rhythm(sample_audio_path)
    assert "error" not in res
    assert "bpm" in res
    assert res["bpm"] > 0
    assert "syncopation_ratio" in res
    assert 0.0 <= res["syncopation_ratio"] <= 1.0

def test_analyze_timbre(sample_audio_path):
    res = analyze_timbre(sample_audio_path)
    assert "error" not in res
    assert "spectral_centroid_mean" in res
    # 440 Hz tone with clicks
    assert 300 < res["spectral_centroid_mean"] < 4000
    assert "rms_mean" in res
    assert res["rms_mean"] > 0

def test_generate_report():
    dummy_results = {
        "melody": {"pitch_range": {"min": 60, "max": 72, "range": 12}, "transitions": {"step_ratio": 0.8, "skip_ratio": 0.2}},
        "harmony": {"chords": [{"time": 0.0, "chord": "C", "roman": "I", "function": "Tonic"}], "progressions": ["Key: C major"]},
        "rhythm": {"bpm": 120, "syncopation_ratio": 0.15},
        "timbre": {"spectral_centroid_mean": 1200.5, "rms_mean": 0.05}
    }
    report = generate_report(dummy_results)
    assert "markdown" in report
    assert "json" in report
    assert "120" in report["markdown"]
    assert "C" in report["markdown"]
