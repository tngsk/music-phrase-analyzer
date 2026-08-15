import pretty_midi
from pathlib import Path
import time
import librosa
import numpy as np

def run_audio_to_midi(audio_path: Path, output_midi_path: Path, stem_name: str = "other"):
    """
    Converts audio to MIDI.
    This uses librosa pyin for pitch tracking and converts to MIDI events.
    Strictly follows Fail-Fast principles without silent error masking.
    """
    audio_path = Path(audio_path)
    output_midi_path = Path(output_midi_path)
    
    if not audio_path.exists():
        raise FileNotFoundError(f"Audio file not found for MIDI transcription: {audio_path}")
        
    y, sr = librosa.load(audio_path, sr=22050)
    if len(y) == 0:
        raise ValueError(f"Audio file is empty: {audio_path}")
        
    is_drum = stem_name.lower() == "drums"
    
    if not is_drum:
        # Dynamic pitch tracking using pyin
        f0, voiced_flag, voiced_probs = librosa.pyin(
            y, 
            fmin=librosa.note_to_hz('C2'), 
            fmax=librosa.note_to_hz('C7')
        )
    else:
        f0, voiced_flag = np.array([]), np.array([])
    
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
    inst = pretty_midi.Instrument(program=program, is_drum=is_drum)
    
    hop_length = 512
    frame_duration = hop_length / sr
    note_dicts = []
    
    current_note_start = None
    current_pitches = []
    
    if is_drum:
        # For drums, use onset detection
        onset_frames = librosa.onset.onset_detect(y=y, sr=sr, hop_length=hop_length)
        onset_times = librosa.frames_to_time(onset_frames, sr=sr, hop_length=hop_length)
        for onset_time in onset_times:
            note = pretty_midi.Note(
                velocity=100,
                pitch=36, # Kick drum as default
                start=float(onset_time),
                end=float(onset_time + 0.1)
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
    elif len(f0) > 0 and len(voiced_flag) > 0:
        for i, (f, voiced) in enumerate(zip(f0, voiced_flag)):
            time_sec = i * frame_duration
            
            if voiced and not np.isnan(f):
                if current_note_start is None:
                    current_note_start = time_sec
                current_pitches.append(f)
            else:
                if current_note_start is not None and len(current_pitches) > 0:
                    median_hz = np.median(current_pitches)
                    midi_pitch = int(round(librosa.hz_to_midi(median_hz)))
                    midi_pitch = max(0, min(127, midi_pitch))
                    
                    note = pretty_midi.Note(
                        velocity=100, 
                        pitch=midi_pitch, 
                        start=float(current_note_start), 
                        end=float(time_sec)
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
        
        # Handle active note at end of file
        if current_note_start is not None and len(current_pitches) > 0:
            median_hz = np.median(current_pitches)
            midi_pitch = int(round(librosa.hz_to_midi(median_hz)))
            midi_pitch = max(0, min(127, midi_pitch))
            
            end_time = len(f0) * frame_duration
            note = pretty_midi.Note(
                velocity=100, 
                pitch=midi_pitch, 
                start=float(current_note_start), 
                end=float(end_time)
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
    output_midi_path.parent.mkdir(parents=True, exist_ok=True)
    pm.write(str(output_midi_path))
    
    return note_dicts
