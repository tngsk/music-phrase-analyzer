import pytest
import pretty_midi
import music21
from app.services.analysis_harmony import analyze_harmony

@pytest.fixture
def oudo_midi_file(tmp_path):
    pm = pretty_midi.PrettyMIDI()
    inst = pretty_midi.Instrument(program=0) # piano
    
    # Establish C major, then play IV-V-iii-vi (F-G-Em-Am)
    
    # C major
    inst.notes.append(pretty_midi.Note(velocity=100, pitch=60, start=0.0, end=1.0)) # C
    inst.notes.append(pretty_midi.Note(velocity=100, pitch=64, start=0.0, end=1.0)) # E
    inst.notes.append(pretty_midi.Note(velocity=100, pitch=67, start=0.0, end=1.0)) # G
    
    # F major
    inst.notes.append(pretty_midi.Note(velocity=100, pitch=65, start=1.0, end=2.0)) # F
    inst.notes.append(pretty_midi.Note(velocity=100, pitch=69, start=1.0, end=2.0)) # A
    inst.notes.append(pretty_midi.Note(velocity=100, pitch=72, start=1.0, end=2.0)) # C
    
    # G major
    inst.notes.append(pretty_midi.Note(velocity=100, pitch=67, start=2.0, end=3.0)) # G
    inst.notes.append(pretty_midi.Note(velocity=100, pitch=71, start=2.0, end=3.0)) # B
    inst.notes.append(pretty_midi.Note(velocity=100, pitch=74, start=2.0, end=3.0)) # D
    
    # E minor
    inst.notes.append(pretty_midi.Note(velocity=100, pitch=64, start=3.0, end=4.0)) # E
    inst.notes.append(pretty_midi.Note(velocity=100, pitch=67, start=3.0, end=4.0)) # G
    inst.notes.append(pretty_midi.Note(velocity=100, pitch=71, start=3.0, end=4.0)) # B
    
    # A minor
    inst.notes.append(pretty_midi.Note(velocity=100, pitch=69, start=4.0, end=5.0)) # A
    inst.notes.append(pretty_midi.Note(velocity=100, pitch=72, start=4.0, end=5.0)) # C
    inst.notes.append(pretty_midi.Note(velocity=100, pitch=76, start=4.0, end=5.0)) # E

    # G major
    inst.notes.append(pretty_midi.Note(velocity=100, pitch=67, start=5.0, end=6.0)) # G
    inst.notes.append(pretty_midi.Note(velocity=100, pitch=71, start=5.0, end=6.0)) # B
    inst.notes.append(pretty_midi.Note(velocity=100, pitch=74, start=5.0, end=6.0)) # D
    
    # C major
    inst.notes.append(pretty_midi.Note(velocity=100, pitch=60, start=6.0, end=7.0)) # C
    inst.notes.append(pretty_midi.Note(velocity=100, pitch=64, start=6.0, end=7.0)) # E
    inst.notes.append(pretty_midi.Note(velocity=100, pitch=67, start=6.0, end=7.0)) # G

    pm.instruments.append(inst)
    
    file_path = tmp_path / "oudo.mid"
    pm.write(str(file_path))
    return str(file_path)

def test_chord_progression_matching(oudo_midi_file):
    res = analyze_harmony(oudo_midi_file)
    assert "error" not in res
    assert "王道進行" in res["progressions"]
    
    oudo_match = next((m for m in res["detected_patterns"] if m["name"] == "王道進行"), None)
    assert oudo_match is not None
    assert oudo_match["confidence"] >= 0.8

