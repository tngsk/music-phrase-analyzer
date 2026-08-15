import { Music2 } from 'lucide-react'

interface Props {
  taskId: string | null;
  selectedStems: string[];
}

export default function PlayerControls({ taskId }: Props) {
  const handleExportAllMIDI = () => {
    if (!taskId) return;
    const link = document.createElement("a");
    link.href = `http://localhost:8000/export/midi/${taskId}/all`;
    link.download = `all_stems.mid`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <div className="flex items-center gap-3">
      <button 
        onClick={handleExportAllMIDI}
        disabled={!taskId}
        className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:from-gray-700 disabled:to-gray-700 text-white text-xs font-semibold px-4 py-2.5 rounded-lg flex items-center gap-2 shadow transition disabled:cursor-not-allowed"
        title="全パートのMIDIをまとめてダウンロード"
      >
        <Music2 size={16} />
        <span>全パート統合 MIDI 出力</span>
      </button>
    </div>
  )
}
