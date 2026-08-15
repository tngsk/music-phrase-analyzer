import { useState, useRef, useEffect } from 'react'
import WaveSurfer from 'wavesurfer.js'
import RegionsPlugin, { Region } from 'wavesurfer.js/dist/plugins/regions.js'
import { StemInfo, AudioSubRegion } from '../types/analysis'
import { Play, Pause, Square, Repeat, Download, Volume2, Music2, Layers } from 'lucide-react'

interface Props {
  stems: StemInfo[];
  taskId: string | null;
  activeSubRegion?: AudioSubRegion | null;
}

const STEM_CONFIG: Record<string, { 
  label: string; 
  color: string; 
  bg: string; 
  border: string;
  waveColor: string;
  progressColor: string;
}> = {
  vocals: { 
    label: 'Vocals (ボーカル)', 
    color: 'text-blue-400', 
    bg: 'bg-blue-950/40', 
    border: 'border-blue-700/60',
    waveColor: '#1e3a8a',
    progressColor: '#3b82f6'
  },
  bass: { 
    label: 'Bass (ベース)', 
    color: 'text-purple-400', 
    bg: 'bg-purple-950/40', 
    border: 'border-purple-700/60',
    waveColor: '#581c87',
    progressColor: '#a855f7'
  },
  drums: { 
    label: 'Drums (ドラム)', 
    color: 'text-amber-400', 
    bg: 'bg-amber-950/40', 
    border: 'border-amber-700/60',
    waveColor: '#78350f',
    progressColor: '#f59e0b'
  },
  guitar: { 
    label: 'Guitar (ギター)', 
    color: 'text-rose-400', 
    bg: 'bg-rose-950/40', 
    border: 'border-rose-700/60',
    waveColor: '#881337',
    progressColor: '#f43f5e'
  },
  piano: { 
    label: 'Piano (ピアノ)', 
    color: 'text-cyan-400', 
    bg: 'bg-cyan-950/40', 
    border: 'border-cyan-700/60',
    waveColor: '#164e63',
    progressColor: '#06b6d4'
  },
  other: { 
    label: 'Other / Synth (伴奏/シンセ)', 
    color: 'text-green-400', 
    bg: 'bg-green-950/40', 
    border: 'border-green-700/60',
    waveColor: '#14532d',
    progressColor: '#22c55e'
  },
};

interface StemCardProps {
  stem: StemInfo;
  activeSubRegion?: AudioSubRegion | null;
}

function StemCard({ stem, activeSubRegion }: StemCardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wavesurfer = useRef<WaveSurfer | null>(null);
  const regionsPlugin = useRef<RegionsPlugin | null>(null);
  const activeRegion = useRef<Region | null>(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLooping, setIsLooping] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);

  const isDrum = stem.stem.toLowerCase() === 'drums';

  const cfg = STEM_CONFIG[stem.stem.toLowerCase()] || {
    label: stem.stem,
    color: 'text-gray-300',
    bg: 'bg-gray-900/40',
    border: 'border-gray-700',
    waveColor: '#374151',
    progressColor: '#60a5fa'
  };

  const isLoopingRef = useRef(isLooping);
  useEffect(() => {
    isLoopingRef.current = isLooping;
  }, [isLooping]);

  const activeSubRegionRef = useRef(activeSubRegion);
  useEffect(() => {
    activeSubRegionRef.current = activeSubRegion;
  }, [activeSubRegion]);

  // Synchronize chord sub-region highlight on stem mini-waveform
  useEffect(() => {
    if (!wavesurfer.current || !regionsPlugin.current || !isLoaded) return;

    regionsPlugin.current.clearRegions();

    if (activeSubRegion) {
      const reg = regionsPlugin.current.addRegion({
        start: activeSubRegion.startRel,
        end: activeSubRegion.endRel,
        color: 'rgba(168, 85, 247, 0.35)', // Purple highlight
        drag: false,
        resize: false,
      });
      activeRegion.current = reg;
      wavesurfer.current.setTime(activeSubRegion.startRel);
    } else {
      activeRegion.current = null;
    }
  }, [activeSubRegion, isLoaded]);

  // Initialize WaveSurfer
  useEffect(() => {
    if (!containerRef.current || !stem.audio_url) return;

    const regions = RegionsPlugin.create();
    regionsPlugin.current = regions;

    const ws = WaveSurfer.create({
      container: containerRef.current,
      waveColor: cfg.waveColor,
      progressColor: cfg.progressColor,
      cursorColor: '#f87171',
      cursorWidth: 2,
      height: 44,
      barWidth: 2,
      barGap: 1,
      barRadius: 2,
      url: stem.audio_url,
      plugins: [regions],
    });
    wavesurfer.current = ws;

    ws.on('ready', () => {
      setDuration(ws.getDuration());
      setIsLoaded(true);
    });

    ws.on('play', () => setIsPlaying(true));
    ws.on('pause', () => setIsPlaying(false));

    ws.on('timeupdate', (time) => {
      setCurrentTime(time);
      if (!ws.isPlaying()) return;

      if (activeSubRegionRef.current) {
        const subEnd = activeSubRegionRef.current.endRel;
        const subStart = activeSubRegionRef.current.startRel;

        if (time >= subEnd) {
          if (isLoopingRef.current) {
            ws.setTime(subStart);
            ws.play().catch(console.error);
          } else {
            ws.pause();
            ws.setTime(subStart);
            setIsPlaying(false);
          }
        }
      }
    });

    ws.on('finish', () => {
      if (isLoopingRef.current) {
        const restartTime = activeSubRegionRef.current ? activeSubRegionRef.current.startRel : 0;
        ws.setTime(restartTime);
        ws.play().catch(console.error);
      } else {
        setIsPlaying(false);
      }
    });

    return () => {
      ws.destroy();
      wavesurfer.current = null;
    };
  }, [stem.audio_url, cfg.waveColor, cfg.progressColor]);

  const handleTogglePlay = async () => {
    if (!wavesurfer.current || !isLoaded) return;

    if (isPlaying) {
      wavesurfer.current.pause();
      setIsPlaying(false);
    } else {
      const startTime = activeSubRegion ? activeSubRegion.startRel : 0;
      const curTime = wavesurfer.current.getCurrentTime();
      if (activeSubRegion && (curTime < startTime || curTime >= activeSubRegion.endRel)) {
        wavesurfer.current.setTime(startTime);
      }
      try {
        await wavesurfer.current.play();
        setIsPlaying(true);
      } catch (err) {
        console.error("Stem play error:", err);
      }
    }
  };

  const handleStop = () => {
    if (!wavesurfer.current) return;
    wavesurfer.current.pause();
    const startTime = activeSubRegion ? activeSubRegion.startRel : 0;
    wavesurfer.current.setTime(startTime);
    setIsPlaying(false);
  };

  const toggleLoop = () => {
    setIsLooping(!isLooping);
  };

  const handleDownload = (url: string, filename: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const noteStatusText = isDrum
    ? (stem.note_count > 0 ? `${stem.note_count} 個のドラムヒット` : '無音 (ドラムなし)')
    : (stem.note_count > 0 ? `${stem.note_count} 個のMIDIノート` : '無音 (演奏なし)');

  return (
    <div className={`p-4 rounded-xl border transition shadow-md flex flex-col justify-between gap-3 ${cfg.border} ${cfg.bg} hover:border-gray-500`}>
      {/* Header Info */}
      <div className="flex justify-between items-center">
        <div>
          <div className={`font-semibold text-sm ${cfg.color} flex items-center gap-1.5`}>
            <Volume2 size={16} />
            <span>{cfg.label}</span>
          </div>
          <div className={`text-[11px] mt-0.5 font-mono ${stem.note_count > 0 ? 'text-gray-300' : 'text-gray-500 italic'}`}>
            {noteStatusText}
          </div>
        </div>

        <div className="text-[11px] font-mono text-gray-400 bg-gray-900/80 px-2 py-0.5 rounded border border-gray-700">
          {currentTime.toFixed(1)}s / {duration.toFixed(1)}s
        </div>
      </div>

      {/* Mini Waveform Container with Sync Region Highlight */}
      <div 
        ref={containerRef} 
        className="w-full bg-gray-950/80 rounded border border-gray-800 cursor-pointer overflow-hidden" 
      />

      {/* Playback Controls & Downloads */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
        {/* Play / Stop / Loop Controls */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleTogglePlay}
            disabled={!isLoaded}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold shadow transition cursor-pointer ${
              isPlaying
                ? 'bg-amber-600 hover:bg-amber-500 text-white'
                : 'bg-blue-600 hover:bg-blue-500 text-white disabled:bg-gray-700 disabled:cursor-not-allowed'
            }`}
          >
            {isPlaying ? <Pause size={13} /> : <Play size={13} />}
            <span>{isPlaying ? 'Pause' : 'Play'}</span>
          </button>

          <button
            type="button"
            onClick={handleStop}
            disabled={!isLoaded}
            className="p-1 text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-md transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            title="停止"
          >
            <Square size={13} />
          </button>

          <button
            type="button"
            onClick={toggleLoop}
            className={`p-1 rounded-md text-xs border transition cursor-pointer ${
              isLooping
                ? 'bg-green-600/30 border-green-500 text-green-300 font-semibold'
                : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-gray-200'
            }`}
            title="ループ再生"
          >
            <Repeat size={13} />
          </button>
        </div>

        {/* Download Buttons */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => handleDownload(stem.audio_url, `${stem.stem}.wav`)}
            className="flex items-center gap-1 bg-gray-800 hover:bg-gray-700 border border-gray-600/80 text-gray-200 text-[11px] py-1 px-2 rounded-md transition cursor-pointer"
            title="WAV音声をダウンロード"
          >
            <Download size={11} />
            <span>WAV</span>
          </button>

          <button
            type="button"
            onClick={() => handleDownload(stem.midi_url, `${stem.stem}.mid`)}
            className="flex items-center gap-1 bg-purple-900/40 hover:bg-purple-800/60 border border-purple-600/50 text-purple-300 text-[11px] py-1 px-2 rounded-md transition cursor-pointer"
            title="MIDIファイルをダウンロード"
          >
            <Music2 size={11} />
            <span>MIDI</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default function StemMixer({ stems, taskId, activeSubRegion }: Props) {
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
      {/* Top Header */}
      <div className="flex flex-wrap justify-between items-center gap-3 border-b border-gray-700/80 pb-3">
        <div>
          <h3 className="text-base font-semibold text-white flex items-center gap-2">
            <Layers className="text-indigo-400" size={18} />
            <span>Separated Audio Stems (6 Stems)</span>
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">
            コード区間に同期した波形ハイライト・個別パート試聴・WAV / MIDI ダウンロード
          </p>
        </div>

        {taskId && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleDownload(`http://localhost:8000/export/midi/${taskId}/all`, 'all_stems.mid')}
              className="flex items-center gap-1 bg-purple-900/50 hover:bg-purple-800/60 border border-purple-600/60 text-purple-200 text-xs font-semibold px-2.5 py-1.5 rounded-md shadow-xs transition cursor-pointer"
              title="全パートのMIDIを1つのファイルに統合してダウンロード"
            >
              <Music2 size={13} />
              <span>全パート統合 MIDI</span>
            </button>

            <button
              type="button"
              onClick={() => handleDownload(`http://localhost:8000/export/audio/${taskId}/sliced`, 'sliced_phrase.wav')}
              className="flex items-center gap-1 bg-gray-900 hover:bg-gray-700 text-gray-200 text-xs font-medium px-2.5 py-1.5 rounded-md border border-gray-600/80 transition cursor-pointer"
              title="切り出したフレーズ全体のWAV音声をダウンロード"
            >
              <Download size={13} />
              <span>フレーズ全体 WAV</span>
            </button>
          </div>
        )}
      </div>

      {/* 6-Stem Waveform Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {stems.map((s) => (
          <StemCard
            key={s.stem}
            stem={s}
            activeSubRegion={activeSubRegion}
          />
        ))}
      </div>
    </div>
  );
}
