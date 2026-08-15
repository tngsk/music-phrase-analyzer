from pathlib import Path
import shutil
import subprocess
import sys
import os

def run_demucs_separation(input_path: Path, output_dir: Path, stems: list[str], model: str = "htdemucs") -> dict[str, Path]:
    """
    Runs Demucs for neural audio stem separation.
    Uses sys.executable -m demucs.separate to ensure execution within the active Python environment.
    """
    output_dir.mkdir(parents=True, exist_ok=True)
    separated_paths: dict[str, Path] = {}
    
    input_path = Path(input_path).resolve()
    output_dir = Path(output_dir).resolve()
    
    try:
        # Run Demucs separation CLI via the active virtualenv python interpreter
        cmd = [
            sys.executable, 
            "-m", "demucs.separate", 
            "-n", model, 
            "-o", str(output_dir), 
            str(input_path)
        ]
        print(f"Executing Demucs: {' '.join(cmd)}")
        result = subprocess.run(cmd, check=True, capture_output=True, text=True)
        print(f"Demucs output: {result.stdout[:200]}")
        
        # Demucs outputs to <output_dir>/<model>/<filename_without_ext>/<stem>.wav
        base_name = input_path.stem
        demucs_out = output_dir / model / base_name
        
        # In macOS /tmp symlink resolution, check both output_dir and resolved path
        if not demucs_out.exists():
            for cand in output_dir.rglob(f"{base_name}"):
                if cand.is_dir():
                    demucs_out = cand
                    break
        
        if demucs_out.exists():
            for stem in stems:
                src_stem = demucs_out / f"{stem}.wav"
                dst_stem = output_dir / f"{stem}.wav"
                
                if src_stem.exists():
                    shutil.copy2(src_stem, dst_stem)
                    separated_paths[stem] = dst_stem
                    print(f"✓ Separated stem '{stem}' successfully saved to {dst_stem}")
                else:
                    # If specific stem is not present in model outputs (e.g. guitar in 4-stem model)
                    print(f"Stem '{stem}' not found in Demucs output directory. Using other/input.")
                    other_stem = demucs_out / "other.wav"
                    if other_stem.exists():
                        shutil.copy2(other_stem, dst_stem)
                    else:
                        shutil.copy2(input_path, dst_stem)
                    separated_paths[stem] = dst_stem
            
            # Cleanup nested model directory
            shutil.rmtree(output_dir / model, ignore_errors=True)
            return separated_paths
        else:
            raise FileNotFoundError(f"Expected Demucs output dir '{demucs_out}' not found.")
            
    except Exception as e:
        print(f"Demucs neural separation failed: {e}. Falling back to original audio.")
        if hasattr(e, 'stderr') and e.stderr:
            print(f"Demucs STDERR: {e.stderr}")
    
    # Fallback to original audio if separation completely fails
    for stem in stems:
        stem_path = output_dir / f"{stem}.wav"
        if not stem_path.exists():
            shutil.copy2(input_path, stem_path)
        separated_paths[stem] = stem_path
        
    return separated_paths
