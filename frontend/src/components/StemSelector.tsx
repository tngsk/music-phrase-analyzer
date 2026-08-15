import { Mic, Disc, Layers, Music, Piano, Guitar, Check } from 'lucide-react'

interface Props {
  selectedStems: string[];
  onChange: (stems: string[]) => void;
}

const STEM_OPTIONS = [
  { id: 'vocals', label: 'Vocals', ja: 'ボーカル', icon: Mic, color: 'border-blue-500 bg-blue-900/30 text-blue-300' },
  { id: 'bass', label: 'Bass', ja: 'ベース', icon: Disc, color: 'border-purple-500 bg-purple-900/30 text-purple-300' },
  { id: 'drums', label: 'Drums', ja: 'ドラム', icon: Music, color: 'border-amber-500 bg-amber-900/30 text-amber-300' },
  { id: 'guitar', label: 'Guitar', ja: 'ギター', icon: Guitar, color: 'border-rose-500 bg-rose-900/30 text-rose-300' },
  { id: 'piano', label: 'Piano', ja: 'ピアノ', icon: Piano, color: 'border-cyan-500 bg-cyan-900/30 text-cyan-300' },
  { id: 'other', label: 'Other', ja: '伴奏/シンセ', icon: Layers, color: 'border-green-500 bg-green-900/30 text-green-300' },
];

export default function StemSelector({ selectedStems, onChange }: Props) {
  const handleToggle = (stem: string) => {
    if (selectedStems.includes(stem)) {
      if (selectedStems.length > 1) {
        onChange(selectedStems.filter(s => s !== stem))
      }
    } else {
      onChange([...selectedStems, stem])
    }
  }

  const handleSelectAll = () => {
    onChange(STEM_OPTIONS.map(o => o.id))
  }

  return (
    <div className="bg-gray-800 p-4 rounded-xl border border-gray-700 shadow-md space-y-2.5">
      <div className="flex justify-between items-center">
        <h2 className="text-sm font-semibold text-white flex items-center gap-2">
          <Layers size={16} className="text-indigo-400" />
          <span>分離対象パート選択 (Demucs 6-Stem AI)</span>
        </h2>
        <button
          onClick={handleSelectAll}
          className="text-xs text-indigo-300 hover:text-indigo-200 transition underline underline-offset-2"
        >
          全選択 ({selectedStems.length}/6)
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
        {STEM_OPTIONS.map(opt => {
          const isSelected = selectedStems.includes(opt.id);
          const Icon = opt.icon;

          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => handleToggle(opt.id)}
              className={`flex flex-col items-center justify-center p-2.5 rounded-lg border transition text-center relative ${
                isSelected
                  ? `${opt.color} shadow-sm ring-1 ring-white/10`
                  : 'bg-gray-900/60 border-gray-700 text-gray-500 hover:border-gray-600 hover:text-gray-400'
              }`}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <Icon size={16} />
                <span className="text-xs font-bold">{opt.label}</span>
              </div>
              <span className="text-[10px] text-gray-400">{opt.ja}</span>
              {isSelected && (
                <div className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full bg-blue-500 text-white flex items-center justify-center text-[9px]">
                  <Check size={10} strokeWidth={3} />
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  )
}
