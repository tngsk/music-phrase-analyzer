import json

def generate_report(analysis_results: dict) -> dict:
    """
    Takes aggregated analysis results and generates a Markdown and JSON report.
    """
    json_report = json.dumps(analysis_results, indent=2)
    
    md = "# Music Phrase Analysis Report\n\n"
    
    if "melody" in analysis_results:
        md += "## Melody Analysis\n"
        melody = analysis_results["melody"]
        if "pitch_range" in melody:
            pr = melody["pitch_range"]
            md += f"- **Pitch Range**: Min {pr.get('min')}, Max {pr.get('max')}\n"
        if "transitions" in melody:
            tr = melody["transitions"]
            md += f"- **Step Ratio**: {tr.get('step_ratio', 0):.2f}\n"
            md += f"- **Skip Ratio**: {tr.get('skip_ratio', 0):.2f}\n"
    
    if "harmony" in analysis_results:
        md += "\n## Harmony Analysis\n"
        harmony = analysis_results["harmony"]
        chords = harmony.get("chords", [])
        for c in chords:
            md += f"- {c.get('time')}s: {c.get('chord')} ({c.get('roman')} - {c.get('function')})\n"
            
    if "rhythm" in analysis_results:
        md += "\n## Rhythm Analysis\n"
        rhythm = analysis_results["rhythm"]
        md += f"- **Tempo**: {rhythm.get('bpm', 0)} BPM\n"
        
    if "timbre" in analysis_results:
        md += "\n## Timbre Analysis\n"
        timbre = analysis_results["timbre"]
        md += f"- **Spectral Centroid**: {timbre.get('spectral_centroid_mean', 0):.2f}\n"
        md += f"- **RMS**: {timbre.get('rms_mean', 0):.5f}\n"
        
    return {
        "json": analysis_results,
        "markdown": md
    }
