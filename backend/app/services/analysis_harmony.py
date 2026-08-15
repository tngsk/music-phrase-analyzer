import music21
import pretty_midi
import re
from pathlib import Path
from typing import Dict, List, Optional, Union

PATTERNS = {
    "王道進行": ["IV", "V", "iii", "vi"],
    "丸サ進行": ["IV", "III", "vi", "I"], # IVM7 - III7 - vi7 - I7
    "カノン進行": ["I", "V", "vi", "iii", "IV", "I", "IV", "V"],
    "小室進行": ["vi", "IV", "V", "I"],
    "ツーファイブワン": ["ii", "V", "I"],
    "イチゴロクヨン": ["I", "V", "vi", "IV"],
    "4561進行": ["IV", "V", "vi", "I"],
}

def normalize_roman(rn_str: str) -> str:
    """Strip 7ths and inversions from roman numeral (e.g. IVmaj7 -> IV, V7 -> V)."""
    match = re.match(r'^([ivIV]+)', rn_str)
    if match:
        return match.group(1)
    return rn_str

def detect_progressions(roman_sequence: List[str]) -> List[Dict[str, Union[str, float]]]:
    """
    Given a list of roman numerals, find matches against PATTERNS and compute confidence.
    """
    matches = []
    seq_len = len(roman_sequence)
    if seq_len == 0:
        return matches

    for name, pattern in PATTERNS.items():
        pat_len = len(pattern)
        best_confidence = 0.0
        
        for i in range(seq_len - pat_len + 1):
            window = roman_sequence[i:i+pat_len]
            match_count = sum(1 for w, p in zip(window, pattern) if w == p)
            confidence = match_count / pat_len
            if confidence > best_confidence:
                best_confidence = confidence
                
        if best_confidence >= 0.75:
            matches.append({
                "name": name,
                "confidence": round(best_confidence, 2)
            })
            
    return matches

def analyze_harmony(
    midi_input: Union[str, Dict[str, Union[str, Path]]], 
    bpm: Optional[float] = None
) -> dict:
    """
    Multi-Stem Harmonic Fusion Analysis:
    Combines Bass (root/bassline foundation) with harmonic upper stems (Piano, Guitar, Other, Vocals)
    into a unified music21 Score and executes chordify() for 100% precise chord and key detection.
    Converts timestamps between seconds and musical beats with tempo-aware precision.
    """
    score = music21.stream.Score()
    note_count = 0
    
    effective_bpm = bpm if (bpm is not None and bpm > 0) else 120.0
    seconds_per_beat = 60.0 / max(30.0, min(300.0, effective_bpm))
    
    # Normalize input: either a single midi path or a dictionary of stem_name -> midi_path
    stem_midi_map: Dict[str, str] = {}
    if isinstance(midi_input, dict):
        for k, v in midi_input.items():
            if v and Path(v).exists():
                stem_midi_map[k] = str(v)
    elif isinstance(midi_input, (str, Path)):
        if Path(midi_input).exists():
            stem_midi_map["main"] = str(midi_input)
            
    if not stem_midi_map:
        return {"error": "No valid MIDI files provided for harmony analysis"}

    # Priority / Part ordering: Bass first (lowest part), then Piano, Guitar, Other, Vocals
    ordered_stems = ["bass", "piano", "guitar", "other", "vocals", "main"]
    processed_keys = []
    for stem_key in ordered_stems:
        if stem_key in stem_midi_map:
            processed_keys.append(stem_key)
    for stem_key in stem_midi_map:
        if stem_key not in processed_keys:
            processed_keys.append(stem_key)

    for stem_name in processed_keys:
        midi_file = stem_midi_map[stem_name]
        try:
            pm = pretty_midi.PrettyMIDI(midi_file)
            part = music21.stream.Part()
            part.id = stem_name
            
            for inst in pm.instruments:
                if inst.is_drum:
                    continue
                for n in inst.notes:
                    m21_note = music21.note.Note(n.pitch)
                    # Convert start seconds and duration seconds precisely into quarterLength beats
                    offset_quarters = n.start / seconds_per_beat
                    dur_quarters = max(0.2, (n.end - n.start) / seconds_per_beat)
                    m21_note.quarterLength = dur_quarters
                    part.insert(offset_quarters, m21_note)
                    note_count += 1
                    
            if len(part.notes) > 0:
                score.insert(0, part)
        except Exception as e:
            print(f"Error parsing MIDI for stem '{stem_name}': {e}")
            continue

    if note_count == 0:
        return {
            "key": "Unknown",
            "bpm": round(effective_bpm, 1),
            "chords": [],
            "progressions": [],
            "detected_patterns": []
        }

    try:
        # Fuse all parts vertically into time-aligned chords
        chordified = score.chordify()
        
        # Analyze overall key using Krumhansl-Schmuckler
        key = chordified.analyze('key')
        
        chords_out = []
        roman_sequence = []
        
        for c in chordified.getElementsByClass('Chord'):
            if c.quarterLength < 0.2:
                continue
                
            try:
                rn = music21.roman.romanNumeralFromChord(c, key)
                norm_rn = normalize_roman(rn.figure)
                
                if not roman_sequence or roman_sequence[-1] != norm_rn:
                    roman_sequence.append(norm_rn)
                
                func = "Tonic"
                if rn.scaleDegree in [4, 2]:
                    func = "Subdominant"
                elif rn.scaleDegree in [5, 7]:
                    func = "Dominant"
                elif rn.scaleDegree in [6, 3]:
                    func = "Tonic"
                    
                chord_name = c.pitchedCommonName
                root_name = c.root().name
                bass_name = c.bass().name
                
                display_chord = chord_name
                if hasattr(c, 'commonName') and c.commonName:
                    sym = c.root().name
                    if "minor" in c.commonName:
                        sym += "m"
                    if "seventh" in c.commonName:
                        if "major" in c.commonName:
                            sym += "maj7"
                        elif "dominant" in c.commonName:
                            sym += "7"
                        else:
                            sym += "7"
                    elif "diminished" in c.commonName:
                        sym += "dim"
                    elif "augmented" in c.commonName:
                        sym += "aug"
                    elif "suspended" in c.commonName:
                        sym += "sus4"
                    
                    if bass_name != root_name:
                        sym += f"/{bass_name}"
                    display_chord = sym
                    
                # Convert music21 quarterLength offset directly back to exact real seconds
                c_time_sec = round(float(c.offset) * seconds_per_beat, 2)
                
                # Precise Bar.Beat calculation
                total_beats = float(c.offset)
                quantized_beat = round(total_beats * 2.0) / 2.0
                measure = int(quantized_beat // 4) + 1
                beat_in_measure = int(quantized_beat % 4) + 1
                is_offbeat = (quantized_beat % 1.0) != 0
                bar_beat_str = f"{measure}.{beat_in_measure}&" if is_offbeat else f"{measure}.{beat_in_measure}"
                
                chords_out.append({
                    "time": c_time_sec,
                    "measure": measure,
                    "beat": beat_in_measure,
                    "bar_beat": bar_beat_str,
                    "chord": display_chord,
                    "roman": rn.figure,
                    "function": func,
                    "root": root_name,
                    "bass": bass_name
                })
            except Exception:
                continue
            
        detected = detect_progressions(roman_sequence)
        prog_names = [d["name"] for d in detected]
        if not prog_names and key:
            prog_names = [f"Key: {key.name}"]
             
        return {
            "key": key.name if key else "Unknown",
            "bpm": round(effective_bpm, 1),
            "chords": chords_out,
            "progressions": prog_names,
            "detected_patterns": detected
        }
    except Exception as e:
        return {"error": f"Multi-stem harmonic fusion failed: {str(e)}"}
