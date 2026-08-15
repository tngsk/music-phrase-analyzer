import { AnalysisResponse } from '../types/analysis'

interface Props {
  results: AnalysisResponse;
}

export default function TheoryDashboard({ results }: Props) {
  const melody = results.melody;
  const rhythm = results.rhythm;
  const timbre = results.timbre;

  return (
    <div className="bg-gray-800 p-4 rounded-lg">
      <h2 className="text-xl mb-4 font-semibold">Theory Dashboard</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gray-700 p-4 rounded">
          <h3 className="text-lg mb-2 text-gray-300">Melody & Pitch</h3>
          <ul className="text-sm text-gray-400 space-y-1">
            <li>Min Pitch (MIDI): {melody?.pitch_range?.min ?? 'N/A'}</li>
            <li>Max Pitch (MIDI): {melody?.pitch_range?.max ?? 'N/A'}</li>
            <li>Range (Semitones): {melody?.pitch_range?.range ?? 'N/A'}</li>
            <li>Step Ratio: {melody?.transitions ? (melody.transitions.step_ratio * 100).toFixed(1) + '%' : 'N/A'}</li>
            <li>Skip/Leap Ratio: {melody?.transitions ? (melody.transitions.skip_ratio * 100).toFixed(1) + '%' : 'N/A'}</li>
          </ul>
        </div>
        <div className="bg-gray-700 p-4 rounded">
          <h3 className="text-lg mb-2 text-gray-300">Rhythm & Timbre</h3>
          <ul className="text-sm text-gray-400 space-y-1">
            <li>Estimated BPM: {rhythm?.bpm ?? 'N/A'}</li>
            <li>Spectral Centroid (Brightness): {timbre?.spectral_centroid_mean ? timbre.spectral_centroid_mean.toFixed(2) : 'N/A'}</li>
            <li>RMS (Volume): {timbre?.rms_mean ? timbre.rms_mean.toFixed(4) : 'N/A'}</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
