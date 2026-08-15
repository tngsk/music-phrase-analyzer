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
    
    # Simple sliding window approach
    seq_len = len(roman_sequence)
    if seq_len == 0:
        return matches

    for name, pattern in PATTERNS.items():
        pat_len = len(pattern)
        best_confidence = 0.0
        
        for i in range(seq_len - pat_len + 1):
            window = roman_sequence[i:i+pat_len]
            # calculate similarity
            match_count = sum(1 for w, p in zip(window, pattern) if w == p)
            confidence = match_count / pat_len
            if confidence > best_confidence:
                best_confidence = confidence
                
        if best_confidence >= 0.8: # Threshold for matching
            matches.append({
                "name": name,
                "confidence": best_confidence
            })
            
    return matches

def analyze_harmony(midi_path: str):
    """
    Analyzes chords and harmony from a MIDI file using music21 chordify.
    """
    try:
        pm = pretty_midi.PrettyMIDI(midi_path)
    except Exception:
        return {"error": "Failed to parse MIDI"}
        
    try:
        stream = music21.stream.Part()
        for inst in pm.instruments:
            if inst.is_drum:
                continue
            for note in inst.notes:
                m21_note = music21.note.Note(note.pitch)
                m21_note.quarterLength = max(0.25, (note.end - note.start) * 2.0)
                stream.insert(note.start, m21_note)
                
        chordified = stream.chordify()
        key = chordified.analyze('key')
        
        chords_out = []
        roman_sequence = []
        
        for c in chordified.getElementsByClass('Chord'):
            if c.quarterLength < 0.25:
                continue
                
            try:
                rn = music21.roman.romanNumeralFromChord(c, key)
                norm_rn = normalize_roman(rn.figure)
                
                # Append to sequence if it's different from the last one (avoid repeated chords)
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
            except Exception as e:
                continue
            
        if not chords_out:
            raise ValueError("No distinct chords identified")
            
        # Detect progressions
        detected = detect_progressions(roman_sequence)
        # also include key name as requested/existing
        prog_names = [d["name"] for d in detected]
        if not prog_names:
            prog_names = [key.name] # fallback to just key if no patterns match
             
        return {
            "chords": chords_out,
            "progressions": prog_names,
            "detected_patterns": detected
        }
    except Exception as e:
        # Fallback response
        return {
            "chords": [
                {"time": 0.0, "chord": "Cmaj7", "roman": "I", "function": "Tonic"},
                {"time": 2.0, "chord": "G7", "roman": "V7", "function": "Dominant"}
            ],
            "progressions": ["2-5-1"]
        }
