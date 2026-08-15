import librosa
import numpy as np

def analyze_timbre(audio_path: str):
    """
    Analyzes timbre (spectral features, MFCC).
    """
    try:
        y, sr = librosa.load(audio_path, sr=22050)
        
        # Spectral Centroid
        cent = librosa.feature.spectral_centroid(y=y, sr=sr)
        
        # Spectral Flatness
        flatness = librosa.feature.spectral_flatness(y=y)
        
        # MFCC
        mfccs = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=13)
        
        # RMS
        rms = librosa.feature.rms(y=y)
        
    except Exception as e:
        return {"error": str(e)}
        
    return {
        "spectral_centroid_mean": float(np.mean(cent)),
        "spectral_flatness_mean": float(np.mean(flatness)),
        "mfcc_means": np.mean(mfccs, axis=1).tolist(),
        "rms_mean": float(np.mean(rms))
    }
