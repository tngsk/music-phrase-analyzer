import librosa
import numpy as np

def analyze_rhythm(audio_path: str, midi_path: str = None):
    """
    Analyzes rhythm from audio using librosa onset and beat tracking.
    Computes genuine tempo, beat times, and off-beat syncopation ratio.
    """
    try:
        y, sr = librosa.load(audio_path, sr=22050)
        tempo, beat_frames = librosa.beat.beat_track(y=y, sr=sr)
        beat_times = librosa.frames_to_time(beat_frames, sr=sr)
        
        if hasattr(tempo, "item"):
            tempo = tempo.item()
            
        # Compute genuine syncopation ratio from onset envelope
        onset_env = librosa.onset.onset_strength(y=y, sr=sr)
        onset_frames = librosa.onset.onset_detect(onset_envelope=onset_env, sr=sr)
        
        if len(beat_frames) > 0 and len(onset_frames) > 0:
            # Measure how many onsets occur away from the nearest on-beat grid
            distances = []
            for of in onset_frames:
                min_dist = np.min(np.abs(beat_frames - of))
                distances.append(min_dist)
            
            # Average distance relative to average beat interval
            avg_beat_dist = np.mean(np.diff(beat_frames)) if len(beat_frames) > 1 else 1.0
            syncopation_ratio = float(np.clip(np.mean(distances) / (avg_beat_dist + 1e-6), 0.0, 1.0))
        else:
            syncopation_ratio = 0.0
            
    except Exception as e:
        return {"error": f"Rhythm analysis failed: {str(e)}"}
        
    return {
        "bpm": round(float(tempo), 2),
        "beat_times": [round(float(b), 3) for b in beat_times] if hasattr(beat_times, "__iter__") else [],
        "syncopation_ratio": round(syncopation_ratio, 3)
    }
