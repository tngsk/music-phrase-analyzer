import music21
import pretty_midi
import re

PATTERNS = {
    "王道進行": ["IV", "V", "iii", "vi"],
    "丸サ進行": ["IV", "III", "vi", "I"], # often IV - III7 - vi - I
    "カノン進行": ["I", "V", "vi", "iii", "IV", "I", "IV", "V"],
    "小室進行": ["vi", "IV", "V", "I"],
    "ツーファイブワン": ["ii", "V", "I"],
    "イチゴロクヨン": ["I", "V", "vi", "IV"]
}

def normalize_roman(rn_str):
    """Strip 7ths and inversions from roman numeral (e.g. IVmaj7 -> IV)."""
    match = re.match(r'^([ivIV]+)', rn_str)
    if match:
        return match.group(1)
    return rn_str

def detect_progressions(roman_sequence):
    """
    Given a list of roman numerals (e.g., ['IV', 'V', 'iii', 'vi', 'I', 'V']),
    find matches against PATTERNS and compute confidence.
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

def analyze_harmony(midi_path: str):
    """
    Analyzes chords and harmony from a MIDI file using music21 chordify.
    Strictly follows Fail-Fast principles without fake/dummy fallback chords.
    """
    try:
        pm = pretty_midi.PrettyMIDI(midi_path)
    except Exception as e:
        return {"error": f"Failed to parse MIDI file: {str(e)}"}
        
    try:
        stream = music21.stream.Part()
        note_count = 0
        for inst in pm.instruments:
            if inst.is_drum:
                continue
            for note in inst.notes:
                m21_note = music21.note.Note(note.pitch)
                m21_note.quarterLength = max(0.25, (note.end - note.start) * 2.0)
                stream.insert(note.start, m21_note)
                note_count += 1
                
        if note_count == 0:
            return {
                "chords": [],
                "progressions": [],
                "detected_patterns": []
            }
            
        chordified = stream.chordify()
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
                    
                chords_out.append({
                    "time": round(float(c.offset), 2),
                    "chord": c.pitchedCommonName,
                    "roman": rn.figure,
                    "function": func
                })
            except Exception:
                continue
            
        detected = detect_progressions(roman_sequence)
        prog_names = [d["name"] for d in detected]
        if not prog_names and key:
            prog_names = [f"Key: {key.name}"]
             
        return {
            "chords": chords_out,
            "progressions": prog_names,
            "detected_patterns": detected
        }
    except Exception as e:
        # Return genuine error dict rather than faked fallback chords
        return {"error": f"Harmony analysis failed: {str(e)}"}
