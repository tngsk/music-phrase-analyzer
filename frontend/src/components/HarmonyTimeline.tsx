import { ChordEvent } from '../types/analysis'

interface Props {
  chords: ChordEvent[];
}

export default function HarmonyTimeline({ chords }: Props) {
  const displayChords = chords.length > 0 ? chords : [
    { time: 0, chord: "Cmaj7", roman: "I", function: "Tonic" },
    { time: 2, chord: "Am7", roman: "vi", function: "Tonic" }
  ];

  return (
    <div className="bg-gray-800 p-4 rounded-lg">
      <h2 className="text-xl mb-4 font-semibold">Harmony Timeline</h2>
      <div className="flex gap-2 overflow-x-auto pb-2">
        {displayChords.map((chord, i) => (
          <div key={i} className="flex flex-col items-center bg-gray-700 px-4 py-2 rounded min-w-[80px]">
             <span className="text-lg font-bold text-white">{chord.chord}</span>
             <span className="text-xs text-gray-400">{chord.roman} ({chord.function})</span>
             <span className="text-[10px] text-gray-500 mt-1">{chord.time}s</span>
          </div>
        ))}
      </div>
    </div>
  )
}
