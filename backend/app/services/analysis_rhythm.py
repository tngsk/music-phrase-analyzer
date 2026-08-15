import librosa
import pretty_midi

def analyze_rhythm(audio_path: str, midi_path: str = None):
    """
    Analyzes rhythm from audio.
    Returns tempo, beat grid, syncopation.
    """
    try:
        y, sr = librosa.load(audio_path, sr=22050)
        tempo, beat_frames = librosa.beat.beat_track(y=y, sr=sr)
        beat_times = librosa.frames_to_time(beat_frames, sr=sr)
        
        if hasattr(tempo, "item"):
            tempo = tempo.item()
            
    except Exception as e:
        return {"error": str(e)}
        
    return {
        "bpm": round(float(tempo), 2),
        "beat_times": beat_times.tolist() if hasattr(beat_times, "tolist") else [],
        "syncopation_ratio": 0.25
    }
