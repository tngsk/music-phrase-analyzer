import soundfile as sf
import librosa
from pathlib import Path
import os
import io

def slice_and_normalize_audio(input_path: Path, output_path: Path, start_time: float, end_time: float, sample_rate: int = 44100):
    """
    Slices the audio from start_time to end_time and normalizes the format.
    """
    y, sr = librosa.load(input_path, sr=sample_rate, offset=start_time, duration=end_time - start_time)
    sf.write(output_path, y, sr)
    return output_path
