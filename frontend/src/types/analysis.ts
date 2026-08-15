export interface NoteEvent {
  pitch: number;      // MIDI note number (e.g. 60)
  name: string;       // Note name with octave (e.g. "C4", "F#4")
  start: number;      // Start time in seconds (relative to clip)
  duration: number;   // Duration in seconds
  velocity: number;   // Velocity 1-127
  stem?: string;      // Stem name ("vocals", "bass", "drums", "other", etc.)
}

export interface ChordEvent {
  time: number;          // Start time in seconds (e.g. 1.5)
  measure?: number;      // Measure / Bar index (1, 2, 3...)
  beat?: number;         // Beat in measure (1, 2, 3, 4)
  bar_beat?: string;     // DAW notation (e.g. "1.1", "1.3", "2.1")
  chord: string;         // Chord name (e.g. "Cmaj7", "Am7", "C/E")
  roman: string;         // Roman numeral (e.g. "IVM7", "V7", "vi")
  function: string;      // "Tonic" | "Subdominant" | "Dominant"
  root?: string;         // Root note (e.g. "C")
  bass?: string;         // Bass note (e.g. "E")
}

export interface ProgressionMatch {
  name: string;        // e.g. "王道進行", "丸サ進行"
  pattern: string;     // e.g. "IV - V - iii - vi"
  confidence: number;  // 0.0 - 1.0
  description?: string;
}

export interface StemInfo {
  stem: string;
  audio_url: string;
  midi_url: string;
  note_count: number;
}

export interface AnalysisResponse {
  melody?: {
    pitch_range: { min: number; max: number; range: number };
    transitions: { step_ratio: number; skip_ratio: number };
    motifs?: Array<{ pattern: number[]; count: number }>;
  };
  harmony?: {
    key?: string;
    bpm?: number;
    chords: ChordEvent[];
    progressions: string[];
    matches?: ProgressionMatch[];
    detected_patterns?: Array<{ name: string; confidence: number }>;
  };
  rhythm?: {
    bpm: number;
    beat_times: number[];
    syncopation_ratio?: number;
    recommended_loop?: { start: number; end: number; beats: number };
  };
  timbre?: {
    spectral_centroid_mean: number;
    spectral_flatness_mean?: number;
    mfcc_means?: number[];
    rms_mean: number;
  };
  notes?: NoteEvent[];
  stems?: StemInfo[];
  all_midi_url?: string;
  task_id?: string;
}

export interface AnalysisRequest {
  file_id: string;
  start_time: number;
  end_time: number;
  stems: string[];
}
