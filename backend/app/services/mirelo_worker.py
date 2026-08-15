import pretty_midi
from pathlib import Path
import time
import librosa
import numpy as np

def run_audio_to_midi(audio_path: Path, output_midi_path: Path, stem_name: str = "other"):
    """
    Converts audio to MIDI.
    This uses librosa pyin for pitch tracking and converts to MIDI events.
    """
    try:
        y, sr = librosa.load(audio_path, sr=22050)
        # Dynamic pitch tracking using pyin
        f0, voiced_flag, voiced_probs = librosa.pyin(
            y, 
            fmin=librosa.note_to_hz('C2'), 
            fmax=librosa.note_to_hz('C7')
        )
    except Exception as e:
        print(f"Error loading or tracking pitch: {e}")
        # fallback to empty data if error
        f0 = np.array([])
        voiced_flag = np.array([])
        sr = 22050
    
    pm = pretty_midi.PrettyMIDI()
    program_map = {
        "vocals": 53, # Choir Aahs
        "bass": 33,   # Electric Bass (finger)
        "drums": 0,   # Acoustic Grand Piano (actually will use drum track)
        "guitar": 27, # Electric Guitar (clean)
        "piano": 0,   # Acoustic Grand Piano
        "other": 80,  # Lead 1 (square)
    }
    
    program = program_map.get(stem_name.lower(), 0)
    is_drum = stem_name.lower() == "drums"
    
    inst = pretty_midi.Instrument(program=program, is_drum=is_drum)
    
    hop_length = 512
    frame_duration = hop_length / sr
    
    note_dicts = []
    
    # Process pitch frames into notes
    # We group contiguous frames that are voiced into single note events
    current_note_start = None
    current_pitches = []
    
    if is_drum:
        # For drums, we can use onset detection instead of pitch tracking
        try:
            onset_frames = librosa.onset.onset_detect(y=y, sr=sr, hop_length=hop_length)
            onset_times = librosa.frames_to_time(onset_frames, sr=sr, hop_length=hop_length)
            for onset_time in onset_times:
                note = pretty_midi.Note(
                    velocity=100,
                    pitch=36, # Kick drum as default
                    start=onset_time,
                    end=onset_time + 0.1 # fixed short duration for drum hits
                )
                inst.notes.append(note)
                
                note_dicts.append({
                    "pitch": 36,
                    "name": pretty_midi.note_number_to_name(36),
                    "start": float(onset_time),
                    "duration": 0.1,
                    "velocity": 100,
                    "stem": stem_name
                })
        except Exception:
            pass
    elif len(f0) > 0 and len(voiced_flag) > 0:
        for i, (f, voiced) in enumerate(zip(f0, voiced_flag)):
            time_sec = i * frame_duration
            
            if voiced and not np.isnan(f):
                if current_note_start is None:
                    current_note_start = time_sec
                current_pitches.append(f)
            else:
                if current_note_start is not None and len(current_pitches) > 0:
                    # Calculate median pitch for the note duration
                    median_hz = np.median(current_pitches)
                    midi_pitch = int(round(librosa.hz_to_midi(median_hz)))
                    
                    # Ensure pitch is in valid MIDI range
                    midi_pitch = max(0, min(127, midi_pitch))
                    
                    note = pretty_midi.Note(
                        velocity=100, 
                        pitch=midi_pitch, 
                        start=current_note_start, 
                        end=time_sec
                    )
                    inst.notes.append(note)
                    
                    note_dicts.append({
                        "pitch": midi_pitch,
                        "name": pretty_midi.note_number_to_name(midi_pitch),
                        "start": float(current_note_start),
                        "duration": float(time_sec - current_note_start),
                        "velocity": 100,
                        "stem": stem_name
                    })
                    
                    current_note_start = None
                    current_pitches = []
        
        # Handle case where a note was active at the end of the file
        if current_note_start is not None and len(current_pitches) > 0:
            median_hz = np.median(current_pitches)
            midi_pitch = int(round(librosa.hz_to_midi(median_hz)))
            midi_pitch = max(0, min(127, midi_pitch))
            
            end_time = len(f0) * frame_duration
            note = pretty_midi.Note(
                velocity=100, 
                pitch=midi_pitch, 
                start=current_note_start, 
                end=end_time
            )
            inst.notes.append(note)
            
            note_dicts.append({
                "pitch": midi_pitch,
                "name": pretty_midi.note_number_to_name(midi_pitch),
                "start": float(current_note_start),
                "duration": float(end_time - current_note_start),
                "velocity": 100,
                "stem": stem_name
            })
        
    pm.instruments.append(inst)
    pm.write(str(output_midi_path))
    
    return note_dicts
