export interface AnalysisRequest {
  file_id: string;
  start_time: number;
  end_time: number;
  stems: string[];
}

export interface ChordEvent {
  time: number;
  chord: string;
  roman: string;
  function: string;
}

export interface AnalysisResponse {
  melody?: {
    pitch_range: { min: number; max: number; range: number };
    transitions: { step_ratio: number; skip_ratio: number };
  };
  harmony?: {
    chords: ChordEvent[];
    progressions: string[];
  };
  rhythm?: {
    bpm: number;
    beat_times: number[];
  };
  timbre?: {
    spectral_centroid_mean: number;
    rms_mean: number;
  };
}
