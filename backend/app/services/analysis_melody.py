import pretty_midi
import music21
from collections import Counter

def analyze_melody(midi_path: str):
    """
    Analyzes melody from MIDI file.
    Calculates pitch range, step/skip ratios, scale, and n-grams.
    """
    try:
        pm = pretty_midi.PrettyMIDI(midi_path)
    except Exception:
        return {"error": "Failed to parse MIDI"}
        
    all_notes = []
    for inst in pm.instruments:
        if not inst.is_drum:
            all_notes.extend(inst.notes)
            
    if not all_notes:
        return {"error": "No notes found"}
        
    # Sort notes by start time
    all_notes.sort(key=lambda x: x.start)
    pitches = [n.pitch for n in all_notes]
    
    # Pitch Range
    min_pitch = min(pitches)
    max_pitch = max(pitches)
    
    # Step vs Skip ratio (step <= 2, skip >= 3)
    steps = 0
    skips = 0
    intervals = []
    
    for i in range(1, len(pitches)):
        diff = abs(pitches[i] - pitches[i-1])
        intervals.append(diff)
        if diff <= 2:
            steps += 1
        elif diff >= 3:
            skips += 1
            
    total_transitions = steps + skips
    step_ratio = steps / total_transitions if total_transitions > 0 else 0
    skip_ratio = skips / total_transitions if total_transitions > 0 else 0
    
    # N-grams (intervals)
    ngrams = []
    if len(intervals) >= 3:
        for i in range(len(intervals) - 2):
            ngram = tuple(intervals[i:i+3])
            ngrams.append(ngram)
    
    ngram_counts = Counter(ngrams).most_common(3)
    
    return {
        "pitch_range": {
            "min": min_pitch,
            "max": max_pitch,
            "range": max_pitch - min_pitch
        },
        "transitions": {
            "step_ratio": step_ratio,
            "skip_ratio": skip_ratio
        },
        "motifs": [{"pattern": list(k), "count": v} for k, v in ngram_counts]
    }
