export interface NoteEvent {
  pitch: number;      // MIDI note number (e.g. 60)
  name: string;       // Note name with octave (e.g. "C4", "F#4")
  start: number;      // Start time in seconds (relative to clip)
  duration: number;   // Duration in seconds
  velocity: number;   // Velocity 1-127
  stem?: string;      // Stem name ("vocals", "bass", "other", etc.)
}

export interface ChordEvent {
  time: number;       // Start time in seconds
  chord: string;      // Chord name (e.g. "Cmaj7", "Am7")
  roman: string;      // Roman numeral (e.g. "IVM7", "V7", "vi")
  function: string;   // "Tonic" | "Subdominant" | "Dominant"
}

export interface ProgressionMatch {
  name: string;        // e.g. "王道進行 (Royal Road)", "丸サ進行 (Just The Two Of Us)"
  pattern: string;     // e.g. "IV - V - iii - vi"
  confidence: number;  // 0.0 - 1.0
  description?: string;
}

export interface AnalysisResponse {
  melody?: {
    pitch_range: { min: number; max: number; range: number };
    transitions: { step_ratio: number; skip_ratio: number };
    motifs?: Array<{ pattern: number[]; count: number }>;
  };
  harmony?: {
    chords: ChordEvent[];
    progressions: string[];
    matches?: ProgressionMatch[];
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
  notes?: NoteEvent[]; // Notes for Piano Roll visualization
}

export interface AnalysisRequest {
  file_id: string;
  start_time: number;
  end_time: number;
  stems: string[];
}
