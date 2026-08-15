import { ChordEvent, StemInfo } from '../types/analysis'
import { Music, Activity, Layers, Loader2, Sparkles } from 'lucide-react'

interface Props {
  chords: ChordEvent[];
  progressions?: string[];
  keyName?: string;
  availableStems?: StemInfo[];
  selectedHarmonicStems?: string[];
  onHarmonicStemsChange?: (stems: string[]) => void;
  isReanalyzing?: boolean;
}

const FUNCTION_BADGES: Record<string, { label: string; bg: string; text: string; border: string }> = {
  Tonic: { label: 'T', bg: 'bg-sky-500/15', text: 'text-sky-300', border: 'border-sky-500/30' },
  Subdominant: { label: 'SD', bg: 'bg-amber-500/15', text: 'text-amber-300', border: 'border-amber-500/30' },
  Dominant: { label: 'D', bg: 'bg-rose-500/15', text: 'text-rose-300', border: 'border-rose-500/30' },
};

const STEM_LABELS: Record<string, string> = {
  vocals: 'Vocals',
  bass: 'Bass',
  drums: 'Drums',
  guitar: 'Guitar',
  piano: 'Piano',
  other: 'Other/Synth',
};

export default function HarmonyTimeline({ 
  chords = [], 
  progressions = [], 
  keyName,
  availableStems = [],
  selectedHarmonicStems = ["bass", "piano", "guitar", "other"],
  onHarmonicStemsChange,
  isReanalyzing = false
}: Props) {
  
  const handleToggleStem = (stemName: string) => {
    if (!onHarmonicStemsChange) return;
    if (selectedHarmonicStems.includes(stemName)) {
      if (selectedHarmonicStems.length > 1) {
        onHarmonicStemsChange(selectedHarmonicStems.filter(s => s !== stemName));
      }
    } else {
      onHarmonicStemsChange([...selectedHarmonicStems, stemName]);
    }
  };

  const candidateStems = availableStems.length > 0 
    ? availableStems.map(s => s.stem)
    : ["bass", "piano", "guitar", "other", "vocals"];

  return (
    <div className="bg-gray-800 p-5 rounded-xl border border-gray-700 shadow-md space-y-3.5">
      {/* Header with Title and Detected Progressions / Key */}
      <div className="flex flex-wrap justify-between items-center gap-2 border-b border-gray-700/70 pb-3">
        <div className="flex items-center gap-2">
          <Music size={18} className="text-purple-400" />
          <h3 className="text-base font-semibold text-white">Harmony & Chord Progression</h3>
          {keyName && keyName !== "Unknown" && (
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-purple-950/80 text-purple-200 border border-purple-700/60">
              Key: {keyName}
            </span>
          )}
        </div>

        {/* Detected Progression Badges (王道進行, 丸サ進行, カノン進行等) */}
        {progressions.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <Activity size={14} className="text-indigo-400" />
            {progressions.map((prog, idx) => (
              <span
                key={idx}
                className="text-xs font-medium px-2 py-0.5 rounded-md bg-indigo-900/40 text-indigo-200 border border-indigo-700/50 flex items-center gap-1"
              >
                <Sparkles size={11} className="text-amber-300" />
                <span>{prog}</span>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Interactive Harmonic Stem Selector Chips */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-gray-900/70 p-2.5 rounded-lg border border-gray-750">
        <div className="flex items-center gap-1.5 text-xs text-gray-300 font-medium">
          <Layers size={14} className="text-indigo-400" />
          <span>コード解析に使用するパート:</span>
          {isReanalyzing && (
            <span className="flex items-center gap-1 text-[11px] text-amber-400 font-mono ml-2">
              <Loader2 size={12} className="animate-spin" /> 再計算中...
            </span>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5">
          {candidateStems.map(stem => {
            const isSelected = selectedHarmonicStems.includes(stem);
            const label = STEM_LABELS[stem.toLowerCase()] || stem;

            return (
              <button
                key={stem}
                type="button"
                onClick={() => handleToggleStem(stem)}
                disabled={isReanalyzing}
                className={`text-xs px-2.5 py-1 rounded-md border transition font-medium flex items-center gap-1 ${
                  isSelected
                    ? 'bg-purple-900/50 border-purple-500 text-purple-200 shadow-xs'
                    : 'bg-gray-800 border-gray-700 text-gray-500 hover:text-gray-300 hover:border-gray-600'
                }`}
                title={`クリックして ${label} をコード解析に含める/除外`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-purple-400' : 'bg-gray-600'}`} />
                <span>{label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Chords Sequence Ribbon */}
      {chords.length === 0 ? (
        <div className="text-xs text-gray-400 py-4 text-center bg-gray-900/50 rounded-lg border border-gray-800">
          選択されたパートから和音データが検出されませんでした。上のチップから別のパート（Bass, Other等）を追加してみてください。
        </div>
      ) : (
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

                {/* Chord Name (with Slash Chord support) */}
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
      )}
    </div>
  );
}
