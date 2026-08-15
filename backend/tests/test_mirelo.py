import pytest
from pathlib import Path
import numpy as np
import librosa
import pretty_midi
import soundfile as sf
import os
import tempfile

from app.services.mirelo_worker import run_audio_to_midi

def test_run_audio_to_midi():
    # Create a 440Hz sine wave
    sr = 22050
    duration = 1.0
    t = np.linspace(0, duration, int(sr * duration), endpoint=False)
    # A4 is 440 Hz -> MIDI 69
    audio = 0.5 * np.sin(2 * np.pi * 440 * t)
    
    with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as audio_file:
        audio_path = audio_file.name
        sf.write(audio_path, audio, sr)
        
    with tempfile.NamedTemporaryFile(suffix='.mid', delete=False) as midi_file:
        midi_path = midi_file.name
        
    try:
        notes_list = run_audio_to_midi(Path(audio_path), Path(midi_path), stem_name="vocals")
        
        pm = pretty_midi.PrettyMIDI(midi_path)
        assert len(pm.instruments) == 1
        
        inst = pm.instruments[0]
        assert len(inst.notes) > 0
        
        # Verify it produces a note near pitch 69
        notes = inst.notes
        assert any(abs(n.pitch - 69) <= 1 for n in notes), f"Notes generated: {[n.pitch for n in notes]}"
        
        # Verify note dictionaries
        assert len(notes_list) > 0
        assert any(abs(n["pitch"] - 69) <= 1 for n in notes_list), f"Note dicts generated: {[n['pitch'] for n in notes_list]}"
        assert "stem" in notes_list[0]
        assert "name" in notes_list[0]
        assert "duration" in notes_list[0]
        assert "start" in notes_list[0]
    finally:
        if os.path.exists(audio_path):
            os.remove(audio_path)
        if os.path.exists(midi_path):
            os.remove(midi_path)
