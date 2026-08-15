import { ChordEvent } from '../types/analysis'
import { Music, Activity } from 'lucide-react'

interface Props {
  chords: ChordEvent[];
  progressions?: string[];
}

const FUNCTION_BADGES: Record<string, { label: string; bg: string; text: string; border: string }> = {
  Tonic: { label: 'T', bg: 'bg-sky-500/15', text: 'text-sky-300', border: 'border-sky-500/30' },
  Subdominant: { label: 'SD', bg: 'bg-amber-500/15', text: 'text-amber-300', border: 'border-amber-500/30' },
  Dominant: { label: 'D', bg: 'bg-rose-500/15', text: 'text-rose-300', border: 'border-rose-500/30' },
};

export default function HarmonyTimeline({ chords = [], progressions = [] }: Props) {
  if (!chords || chords.length === 0) {
    return (
      <div className="bg-gray-800 p-4 rounded-xl border border-gray-700 shadow-md">
        <div className="flex items-center gap-2 mb-2 text-white font-semibold">
          <Music size={18} className="text-purple-400" />
          <span>Harmony & Progression Timeline</span>
        </div>
        <div className="text-xs text-gray-400 py-3 text-center bg-gray-900/50 rounded-lg">
          和音データが検出されませんでした
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 p-4 rounded-xl border border-gray-700 shadow-md space-y-3">
      <div className="flex flex-wrap justify-between items-center gap-2 border-b border-gray-700/70 pb-2.5">
        <div className="flex items-center gap-2">
          <Music size={18} className="text-purple-400" />
          <h3 className="text-base font-semibold text-white">Harmony & Chord Progression</h3>
        </div>

        {/* Detected Progression Patterns (e.g. 王道進行, 丸サ進行, Key) */}
        {progressions.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <Activity size={14} className="text-indigo-400" />
            {progressions.map((prog, idx) => (
              <span
                key={idx}
                className="text-xs font-medium px-2 py-0.5 rounded-md bg-indigo-900/40 text-indigo-200 border border-indigo-700/50"
              >
                {prog}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Compact Chord Ribbon */}
      <div className="flex gap-2 overflow-x-auto pb-2 pt-1 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-900">
        {chords.map((chord, i) => {
          const fn = FUNCTION_BADGES[chord.function] || {
            label: chord.function ? chord.function.charAt(0) : '-',
            bg: 'bg-gray-700/30',
            text: 'text-gray-300',
            border: 'border-gray-600',
          };

          return (
            <div
              key={i}
              className="flex-shrink-0 flex flex-col items-center justify-between bg-gray-900/90 hover:bg-gray-750 px-3 py-2 rounded-lg border border-gray-700/80 transition min-w-[76px] shadow-sm"
            >
              {/* Timing Badge */}
              <span className="text-[10px] font-mono text-gray-500 mb-1">
                {chord.time.toFixed(1)}s
              </span>

              {/* Chord Name */}
              <span className="text-sm font-bold text-white tracking-wide">
                {chord.chord}
              </span>

              {/* Roman Numeral & Function Abbreviation */}
              <div className="flex items-center gap-1 mt-1.5">
                <span className="text-[11px] font-mono text-gray-300 font-medium">
                  {chord.roman || '-'}
                </span>
                {chord.function && (
                  <span
                    className={`text-[9px] font-bold px-1 py-0.2 rounded border ${fn.bg} ${fn.text} ${fn.border}`}
                    title={`Function: ${chord.function}`}
                  >
                    {fn.label}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
