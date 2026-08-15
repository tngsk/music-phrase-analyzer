import pytest
import numpy as np
import soundfile as sf
import pretty_midi
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
def multi_stem_midi_paths(tmp_path):
    """
    Creates multi-stem MIDI files:
    - bass: Root C2 (36) and Inversion E2 (40)
    - piano: Upper triad notes E4 (64), G4 (67), B4 (71) -> creates Cmaj7 and C/E
    """
    bass_file = tmp_path / "bass.mid"
    piano_file = tmp_path / "piano.mid"
    
    # Bass track: C2 (0-1s), E2 (1-2s)
    pm_bass = pretty_midi.PrettyMIDI()
    inst_bass = pretty_midi.Instrument(program=33)
    inst_bass.notes.append(pretty_midi.Note(velocity=100, pitch=36, start=0.0, end=1.0))
    inst_bass.notes.append(pretty_midi.Note(velocity=100, pitch=40, start=1.0, end=2.0))
    pm_bass.instruments.append(inst_bass)
    pm_bass.write(str(bass_file))
    
    # Piano track: E4, G4, B4 (0-1s) -> Cmaj7 with Bass C2
    # C4, G4 (1-2s) -> C/E with Bass E2
    pm_piano = pretty_midi.PrettyMIDI()
    inst_piano = pretty_midi.Instrument(program=0)
    for p in [64, 67, 71]:
        inst_piano.notes.append(pretty_midi.Note(velocity=100, pitch=p, start=0.0, end=1.0))
    for p in [60, 67]:
        inst_piano.notes.append(pretty_midi.Note(velocity=100, pitch=p, start=1.0, end=2.0))
    pm_piano.instruments.append(inst_piano)
    pm_piano.write(str(piano_file))
    
    return {
        "bass": bass_file,
        "piano": piano_file
    }

@pytest.fixture
def sample_audio_path(tmp_path):
    audio_file = tmp_path / "test.wav"
    sr = 22050
    duration = 3.0
    t = np.linspace(0, duration, int(sr * duration))
    y = 0.3 * np.sin(2 * np.pi * 440 * t)
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
    assert res["pitch_range"]["min"] == 60
    assert res["pitch_range"]["max"] == 67
    assert res["pitch_range"]["range"] == 7

def test_analyze_harmony_single_track(sample_midi_path):
    res = analyze_harmony(sample_midi_path)
    assert "error" not in res
    assert "chords" in res
    assert len(res["chords"]) > 0
    chord_names = [c["chord"] for c in res["chords"]]
    assert any("C" in name for name in chord_names)

def test_analyze_harmony_multi_stem_fusion(multi_stem_midi_paths):
    """
    Verifies Multi-Stem Harmonic Fusion:
    - Bass (C2) + Piano (E4, G4, B4) correctly identifies C root / Cmaj7
    - Bass (E2) + Piano (C4, G4) correctly identifies slash chord C/E
    """
    res = analyze_harmony(multi_stem_midi_paths)
    assert "error" not in res
    assert "chords" in res
    assert len(res["chords"]) >= 2
    
    # Check first chord (Bass C + Upper E-G-B)
    first_chord = res["chords"][0]
    assert "C" in first_chord["root"] or "C" in first_chord["chord"]
    assert first_chord["bass"] == "C"
    
    # Check slash chord or second chord (Bass E + Upper C-G)
    second_chord = res["chords"][1]
    assert second_chord["bass"] == "E"
    assert "C" in second_chord["root"] or "C" in second_chord["chord"]

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
