import pretty_midi
from pathlib import Path
import librosa
import numpy as np

def run_audio_to_midi(audio_path: Path, output_midi_path: Path, stem_name: str = "other") -> list:
    """
    Converts audio stem to MIDI using Adaptive Local Voice Activity Detection.
    Reliably captures quiet passages, sparse notes, and sustained tones without generating false ghost notes.
    """
    audio_path = Path(audio_path)
    output_midi_path = Path(output_midi_path)
    
    if not audio_path.exists():
        raise FileNotFoundError(f"Audio file not found for MIDI transcription: {audio_path}")
        
    y, sr = librosa.load(audio_path, sr=22050)
    if len(y) == 0:
        raise ValueError(f"Audio file is empty: {audio_path}")
        
    hop_length = 512
    frame_duration = hop_length / sr
    
    # 1. Compute frame-level RMS energy
    rms_frames = librosa.feature.rms(y=y, hop_length=hop_length)[0]
    max_rms = float(np.max(rms_frames)) if len(rms_frames) > 0 else 0.0
    
    pm = pretty_midi.PrettyMIDI()
    program_map = {
        "vocals": 53, # Choir Aahs
        "bass": 33,   # Electric Bass (finger)
        "drums": 0,   # Acoustic Grand Piano (drum channel)
        "guitar": 27, # Electric Guitar (clean)
        "piano": 0,   # Acoustic Grand Piano
        "other": 80,  # Lead 1 (square)
    }
    program = program_map.get(stem_name.lower(), 0)
    is_drum = stem_name.lower() == "drums"
    inst = pretty_midi.Instrument(program=program, is_drum=is_drum)
    
    # Absolute silence limit: only skip if track is under -60dBFS (pure digital silence/dead floor)
    ABSOLUTE_SILENCE_LIMIT = 0.001
    if max_rms < ABSOLUTE_SILENCE_LIMIT:
        pm.instruments.append(inst)
        output_midi_path.parent.mkdir(parents=True, exist_ok=True)
        pm.write(str(output_midi_path))
        print(f"Stem '{stem_name}' is silent (max_rms={max_rms:.5f}). 0 notes extracted.")
        return []

    # Local noise gate: -50dBFS floor allows very quiet pianissimo/arpeggios (rms > 0.0025)
    LOCAL_NOISE_GATE = 0.0025
    note_dicts = []
    
    if is_drum:
        # Dynamic onset threshold adapting to audio dynamics
        delta_val = max(0.05, float(np.std(rms_frames)) * 0.4)
        onset_frames = librosa.onset.onset_detect(
            y=y, 
            sr=sr, 
            hop_length=hop_length, 
            delta=delta_val, 
            wait=int(0.04 * sr / hop_length) # Min 40ms between hits
        )
        onset_times = librosa.frames_to_time(onset_frames, sr=sr, hop_length=hop_length)
        
        for onset_frame, onset_time in zip(onset_frames, onset_times):
            frame_idx = min(int(onset_frame), len(rms_frames) - 1)
            frame_rms = rms_frames[frame_idx]
            if frame_rms >= LOCAL_NOISE_GATE:
                vel = int(np.clip((frame_rms / (max_rms + 1e-6)) * 127, 40, 127))
                note = pretty_midi.Note(
                    velocity=vel,
                    pitch=36, # Kick drum default
                    start=float(onset_time),
                    end=float(onset_time + 0.1)
                )
                inst.notes.append(note)
                note_dicts.append({
                    "pitch": 36,
                    "name": pretty_midi.note_number_to_name(36),
                    "start": float(onset_time),
                    "duration": 0.1,
                    "velocity": vel,
                    "stem": stem_name
                })
    else:
        # Dynamic pitch tracking using pyin with register-aware pitch bounds
        fmin = librosa.note_to_hz('E1') if stem_name == "bass" else librosa.note_to_hz('C2')
        fmax = librosa.note_to_hz('G4') if stem_name == "bass" else librosa.note_to_hz('C7')
        
        f0, voiced_flag, voiced_probs = librosa.pyin(
            y, 
            fmin=fmin, 
            fmax=fmax,
            sr=sr,
            hop_length=hop_length
        )
        
        current_note_start = None
        current_pitches = []
        current_velocities = []
        
        if len(f0) > 0 and len(voiced_flag) > 0:
            for i, (f, voiced, prob) in enumerate(zip(f0, voiced_flag, voiced_probs)):
                time_sec = i * frame_duration
                frame_rms = rms_frames[min(i, len(rms_frames) - 1)]
                
                # Active note condition:
                # 1. Periodicity identified by pyin (voiced & prob >= 0.40)
                # 2. Local frame energy above noise floor (-50dB)
                is_active = voiced and (prob >= 0.40) and (not np.isnan(f)) and (frame_rms >= LOCAL_NOISE_GATE)
                
                if is_active:
                    if current_note_start is None:
                        current_note_start = time_sec
                    current_pitches.append(f)
                    current_velocities.append(frame_rms)
                else:
                    if current_note_start is not None and len(current_pitches) > 0:
                        note_duration = time_sec - current_note_start
                        
                        # Short duration filter (>= 50ms)
                        if note_duration >= 0.05:
                            median_hz = np.median(current_pitches)
                            midi_pitch = int(round(librosa.hz_to_midi(median_hz)))
                            midi_pitch = max(0, min(127, midi_pitch))
                            
                            avg_vel = float(np.mean(current_velocities))
                            vel = int(np.clip((avg_vel / (max_rms + 1e-6)) * 127, 35, 127))
                            
                            note = pretty_midi.Note(
                                velocity=vel, 
                                pitch=midi_pitch, 
                                start=float(current_note_start), 
                                end=float(time_sec)
                            )
                            inst.notes.append(note)
                            
                            note_dicts.append({
                                "pitch": midi_pitch,
                                "name": pretty_midi.note_number_to_name(midi_pitch),
                                "start": float(current_note_start),
                                "duration": float(note_duration),
                                "velocity": vel,
                                "stem": stem_name
                            })
                            
                        current_note_start = None
                        current_pitches = []
                        current_velocities = []
            
            # Handle tail note
            if current_note_start is not None and len(current_pitches) > 0:
                end_time = len(f0) * frame_duration
                note_duration = end_time - current_note_start
                if note_duration >= 0.05:
                    median_hz = np.median(current_pitches)
                    midi_pitch = int(round(librosa.hz_to_midi(median_hz)))
                    midi_pitch = max(0, min(127, midi_pitch))
                    avg_vel = float(np.mean(current_velocities)) if current_velocities else max_rms
                    vel = int(np.clip((avg_vel / (max_rms + 1e-6)) * 127, 35, 127))
                    
                    note = pretty_midi.Note(
                        velocity=vel, 
                        pitch=midi_pitch, 
                        start=float(current_note_start), 
                        end=float(end_time)
                    )
                    inst.notes.append(note)
                    note_dicts.append({
                        "pitch": midi_pitch,
                        "name": pretty_midi.note_number_to_name(midi_pitch),
                        "start": float(current_note_start),
                        "duration": float(note_duration),
                        "velocity": vel,
                        "stem": stem_name
                    })
    
    pm.instruments.append(inst)
    output_midi_path.parent.mkdir(parents=True, exist_ok=True)
    pm.write(str(output_midi_path))
    
    return note_dicts
