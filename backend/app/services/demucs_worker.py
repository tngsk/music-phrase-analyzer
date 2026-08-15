from pathlib import Path
import shutil
import subprocess
import sys
import os

def run_demucs_separation(input_path: Path, output_dir: Path, stems: list[str], model: str = "htdemucs_6s") -> dict[str, Path]:
    """
    Runs Demucs for neural audio stem separation using 6-stem model (htdemucs_6s).
    Separates: vocals, bass, drums, guitar, piano, and other.
    Strictly follows Fail-Fast principle without silent fallbacks.
    """
    output_dir.mkdir(parents=True, exist_ok=True)
    separated_paths: dict[str, Path] = {}
    
    input_path = Path(input_path).resolve()
    output_dir = Path(output_dir).resolve()
    
    if not input_path.exists():
        raise FileNotFoundError(f"Input audio file not found: {input_path}")
    
    # Run Demucs separation CLI via the active virtualenv python interpreter
    cmd = [
        sys.executable, 
        "-m", "demucs.separate", 
        "-n", model, 
        "-o", str(output_dir), 
        str(input_path)
    ]
    print(f"Executing Demucs ({model}): {' '.join(cmd)}")
    
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        error_msg = f"Demucs execution failed with code {result.returncode}.\nSTDERR: {result.stderr}\nSTDOUT: {result.stdout}"
        print(error_msg)
        raise RuntimeError(error_msg)
    
    # Demucs outputs to <output_dir>/<model>/<filename_without_ext>/<stem>.wav
    base_name = input_path.stem
    demucs_out = output_dir / model / base_name
    
    # In macOS /tmp symlink resolution, check both output_dir and resolved path
    if not demucs_out.exists():
        for cand in output_dir.rglob(f"{base_name}"):
            if cand.is_dir():
                demucs_out = cand
                break
    
    if not demucs_out.exists():
        raise FileNotFoundError(f"Expected Demucs output dir '{demucs_out}' not found in {output_dir}.")
        
    for stem in stems:
        src_stem = demucs_out / f"{stem}.wav"
        dst_stem = output_dir / f"{stem}.wav"
        
        if src_stem.exists():
            shutil.copy2(src_stem, dst_stem)
            separated_paths[stem] = dst_stem
            print(f"✓ Separated stem '{stem}' successfully saved to {dst_stem}")
        else:
            raise FileNotFoundError(f"Stem '{stem}' was not produced by Demucs model '{model}'.")
    
    # Cleanup nested model directory
    shutil.rmtree(output_dir / model, ignore_errors=True)
    return separated_paths
