import { useState, useRef } from 'react'
import { StemInfo } from '../types/analysis'
import { Play, Pause, Download, Volume2, Music2, Layers } from 'lucide-react'

interface Props {
  stems: StemInfo[];
  taskId: string | null;
}

const STEM_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  vocals: { label: 'Vocals (ボーカル)', color: 'text-blue-400', bg: 'bg-blue-900/30', border: 'border-blue-700/60' },
  bass: { label: 'Bass (ベース)', color: 'text-purple-400', bg: 'bg-purple-900/30', border: 'border-purple-700/60' },
  drums: { label: 'Drums (ドラム)', color: 'text-amber-400', bg: 'bg-amber-900/30', border: 'border-amber-700/60' },
  other: { label: 'Other / Instruments (楽器伴奏)', color: 'text-green-400', bg: 'bg-green-900/30', border: 'border-green-700/60' },
  guitar: { label: 'Guitar (ギター)', color: 'text-rose-400', bg: 'bg-rose-900/30', border: 'border-rose-700/60' },
  piano: { label: 'Piano (ピアノ)', color: 'text-cyan-400', bg: 'bg-cyan-900/30', border: 'border-cyan-700/60' },
};

export default function StemMixer({ stems, taskId }: Props) {
  const [playingStem, setPlayingStem] = useState<string | null>(null);
  const audioRefs = useRef<Record<string, HTMLAudioElement>>({});

  const handleTogglePlay = (stemName: string, audioUrl: string) => {
    // If clicking current playing stem, pause it
    if (playingStem === stemName) {
      if (audioRefs.current[stemName]) {
        audioRefs.current[stemName].pause();
      }
      setPlayingStem(null);
      return;
    }

    // Stop previous audio
    if (playingStem && audioRefs.current[playingStem]) {
      audioRefs.current[playingStem].pause();
      audioRefs.current[playingStem].currentTime = 0;
    }

    // Play selected audio
    if (!audioRefs.current[stemName]) {
      const audio = new Audio(audioUrl);
      audio.onended = () => setPlayingStem(null);
      audioRefs.current[stemName] = audio;
    }

    audioRefs.current[stemName].currentTime = 0;
    audioRefs.current[stemName].play().catch(console.error);
    setPlayingStem(stemName);
  };

  const handleDownload = (url: string, filename: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!stems || stems.length === 0) return null;

  return (
    <div className="bg-gray-800 p-5 rounded-xl border border-gray-700 shadow-md space-y-4">
      <div className="flex flex-wrap justify-between items-center gap-2 border-b border-gray-700/80 pb-3">
        <div>
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Layers className="text-indigo-400" size={20} />
            <span>Separated Audio Stems & MIDI Export</span>
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">
            Demucs で分離された各トラックの個別試聴と、パート別 WAV / MIDI エクスポート
          </p>
        </div>

        {taskId && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleDownload(`http://localhost:8000/export/midi/${taskId}/all`, 'all_stems.mid')}
              className="flex items-center gap-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-semibold px-3.5 py-2 rounded-lg shadow transition"
              title="全パートのMIDIを1つのファイルに統合してダウンロード"
            >
              <Music2 size={15} />
              <span>全パート統合 MIDI (All-in-One)</span>
            </button>

            <button
              onClick={() => handleDownload(`http://localhost:8000/export/audio/${taskId}/sliced`, 'sliced_phrase.wav')}
              className="flex items-center gap-1.5 bg-gray-700 hover:bg-gray-600 text-gray-200 text-xs font-medium px-3 py-2 rounded-lg border border-gray-600 transition"
              title="切り出したフレーズ全体のWAV音声をダウンロード"
            >
              <Download size={14} />
              <span>フレーズ全体 WAV</span>
            </button>
          </div>
        )}
      </div>

      {/* Stem Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {stems.map((s) => {
          const cfg = STEM_CONFIG[s.stem.toLowerCase()] || {
            label: s.stem,
            color: 'text-gray-300',
            bg: 'bg-gray-900/40',
            border: 'border-gray-700',
          };
          const isCurrentPlaying = playingStem === s.stem;

          return (
            <div
              key={s.stem}
              className={`p-4 rounded-xl border ${cfg.border} ${cfg.bg} flex flex-col justify-between gap-3 transition hover:border-gray-500`}
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className={`font-semibold text-sm ${cfg.color} flex items-center gap-1.5`}>
                    <Volume2 size={16} />
                    <span>{cfg.label}</span>
                  </div>
                  <div className="text-xs text-gray-400 mt-1 font-mono">
                    {s.note_count > 0 ? `${s.note_count} 個のMIDIノートを検出` : 'リズム/打楽器トラック'}
                  </div>
                </div>

                {/* Play / Pause Preview Button */}
                <button
                  onClick={() => handleTogglePlay(s.stem, s.audio_url)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition shadow ${
                    isCurrentPlaying
                      ? 'bg-amber-600 hover:bg-amber-500 text-white animate-pulse'
                      : 'bg-gray-700 hover:bg-gray-600 text-gray-200'
                  }`}
                  title={`${s.stem} の音声を試聴`}
                >
                  {isCurrentPlaying ? <Pause size={14} /> : <Play size={14} />}
                  <span>{isCurrentPlaying ? '再生中 (停止)' : '試聴する'}</span>
                </button>
              </div>

              {/* Download Actions */}
              <div className="flex items-center gap-2 pt-2 border-t border-gray-700/50">
                <button
                  onClick={() => handleDownload(s.audio_url, `${s.stem}.wav`)}
                  className="flex-1 flex items-center justify-center gap-1 bg-gray-800 hover:bg-gray-700 border border-gray-600/80 text-gray-200 text-xs py-1.5 px-2.5 rounded-md transition"
                >
                  <Download size={13} />
                  <span>WAV 音声</span>
                </button>

                <button
                  onClick={() => handleDownload(s.midi_url, `${s.stem}.mid`)}
                  className="flex-1 flex items-center justify-center gap-1 bg-purple-900/40 hover:bg-purple-800/60 border border-purple-600/50 text-purple-300 text-xs py-1.5 px-2.5 rounded-md transition"
                >
                  <Music2 size={13} />
                  <span>MIDI 出力</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
