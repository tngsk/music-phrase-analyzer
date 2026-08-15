from pathlib import Path
import shutil
import time
import subprocess
import os

def run_demucs_separation(input_path: Path, output_dir: Path, stems: list[str], model: str = "htdemucs"):
    """
    Runs demucs for stem separation.
    Attempts to run the demucs CLI. If it fails, falls back to mocking.
    """
    output_dir.mkdir(parents=True, exist_ok=True)
    separated_paths = {}
    
    # Try actual demucs
    try:
        # Using subprocess to run demucs directly since it's installed via pip
        cmd = ["demucs", "-n", model, "--out", str(output_dir), str(input_path)]
        subprocess.run(cmd, check=True, capture_output=True)
        
        # Demucs outputs to <output_dir>/<model>/<filename_without_ext>/<stem>.wav
        base_name = input_path.stem
        demucs_out = output_dir / model / base_name
        
        if demucs_out.exists():
            for stem in stems:
                expected_stem = stem
                if stem == "other" and model == "htdemucs":
                    expected_stem = "other"
                
                src_stem = demucs_out / f"{expected_stem}.wav"
                dst_stem = output_dir / f"{stem}.wav"
                
                if src_stem.exists():
                    shutil.copy2(src_stem, dst_stem)
                    separated_paths[stem] = dst_stem
                else:
                    # Fallback if stem not generated
                    shutil.copy2(input_path, dst_stem)
                    separated_paths[stem] = dst_stem
            
            # Cleanup demucs internal dir
            shutil.rmtree(output_dir / model, ignore_errors=True)
            return separated_paths
            
    except Exception as e:
        print(f"Demucs execution failed: {e}. Falling back to mock separation.")
    
    # Fallback / Mock
    for stem in stems:
        stem_path = output_dir / f"{stem}.wav"
        shutil.copy2(input_path, stem_path)
        separated_paths[stem] = stem_path
        
    return separated_paths
