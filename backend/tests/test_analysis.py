import pytest
import numpy as np
import librosa
import pretty_midi
import soundfile as sf
import os
from pathlib import Path

from app.services.analysis_melody import analyze_melody
from app.services.analysis_harmony import analyze_harmony
from app.services.analysis_rhythm import analyze_rhythm
from app.services.analysis_timbre import analyze_timbre
from app.services.report_gen import generate_report

@pytest.fixture
def dummy_audio_file(tmp_path):
    """Create a dummy 1-second 440Hz sine wave audio file."""
    sr = 22050
    t = np.linspace(0, 1.0, sr)
    y = np.sin(2 * np.pi * 440 * t)
    file_path = tmp_path / "dummy.wav"
    sf.write(str(file_path), y, sr)
    return str(file_path)

@pytest.fixture
def dummy_midi_file(tmp_path):
    """Create a dummy MIDI file with C-E-G triad notes."""
    pm = pretty_midi.PrettyMIDI()
    inst = pretty_midi.Instrument(program=0)
    inst.notes.append(pretty_midi.Note(velocity=100, pitch=60, start=0.0, end=0.5))
    inst.notes.append(pretty_midi.Note(velocity=100, pitch=64, start=0.0, end=0.5))
    inst.notes.append(pretty_midi.Note(velocity=100, pitch=67, start=0.0, end=0.5))
    pm.instruments.append(inst)
    
    file_path = tmp_path / "dummy.mid"
    pm.write(str(file_path))
    return str(file_path)

def test_analyze_melody(dummy_midi_file):
    res = analyze_melody(dummy_midi_file)
    assert "error" not in res
    assert res["pitch_range"]["min"] == 60
    assert res["pitch_range"]["max"] == 67
    assert res["pitch_range"]["range"] == 7

def test_analyze_harmony(dummy_midi_file):
    res = analyze_harmony(dummy_midi_file)
    assert "error" not in res
    assert "chords" in res
    assert len(res["chords"]) > 0

def test_analyze_rhythm(dummy_audio_file):
    res = analyze_rhythm(dummy_audio_file)
    assert "error" not in res
    assert "bpm" in res
    assert "beat_times" in res

def test_analyze_timbre(dummy_audio_file):
    res = analyze_timbre(dummy_audio_file)
    assert "error" not in res
    assert "spectral_centroid_mean" in res
    assert "rms_mean" in res

def test_generate_report():
    dummy_data = {
        "melody": {"pitch_range": {"min": 60, "max": 72}},
        "rhythm": {"bpm": 120},
    }
    res = generate_report(dummy_data)
    assert "json" in res
    assert "markdown" in res
    assert "120" in res["markdown"]
    assert "Min 60" in res["markdown"]
