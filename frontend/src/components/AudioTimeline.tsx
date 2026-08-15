import { useEffect, useRef, useState, useCallback } from 'react'
import WaveSurfer from 'wavesurfer.js'
import RegionsPlugin, { Region } from 'wavesurfer.js/dist/plugins/regions.js'
import TimelinePlugin from 'wavesurfer.js/dist/plugins/timeline.js'
import { Play, Pause, Square, Repeat, Volume2, UploadCloud } from 'lucide-react'

interface Props {
  audioUrl?: string;
  onFileSelect?: (file: File) => void;
  onRangeChange?: (start: number, end: number) => void;
  targetRange?: { id?: number; start: number; end: number; autoPlay?: boolean } | null;
}

export default function AudioTimeline({ audioUrl, onFileSelect, onRangeChange, targetRange }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const timelineRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const wavesurfer = useRef<WaveSurfer | null>(null)
  const regionsPlugin = useRef<RegionsPlugin | null>(null)
  const activeRegion = useRef<Region | null>(null)
  const prevHandledTargetId = useRef<number | string | null>(null)

  const [isDraggingFile, setIsDraggingFile] = useState(false)
  const [range, setRange] = useState({ start: 0, end: 10 })
  const rangeRef = useRef(range)

  const [duration, setDuration] = useState<number>(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isLooping, setIsLooping] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)

  const isLoopingRef = useRef(isLooping)
  useEffect(() => {
    isLoopingRef.current = isLooping;
  }, [isLooping]);

  const handleRangeChange = useCallback((start: number, end: number) => {
    const s = Math.max(0, Math.round(start * 100) / 100);
    const e = Math.max(s + 0.1, Math.round(end * 100) / 100);
    rangeRef.current = { start: s, end: e };
    setRange({ start: s, end: e });
    if (onRangeChange) onRangeChange(s, e);
  }, [onRangeChange]);

  const handleRangeChangeRef = useRef(handleRangeChange);
  useEffect(() => {
    handleRangeChangeRef.current = handleRangeChange;
  }, [handleRangeChange]);

  // Drag & Drop Handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFile(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFile(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFile(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('audio/') || file.name.match(/\.(wav|mp3|flac|m4a|ogg)$/i)) {
        if (onFileSelect) {
          onFileSelect(file);
        }
      }
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (onFileSelect) {
        onFileSelect(file);
      }
    }
  };

  // Handle external region selection (e.g. Chord card clicked)
  useEffect(() => {
    if (!targetRange || !wavesurfer.current || !regionsPlugin.current || !isLoaded) return;

    // Prevent infinite re-trigger loop on React re-render
    const currentId = targetRange.id !== undefined ? targetRange.id : `${targetRange.start}-${targetRange.end}`;
    if (prevHandledTargetId.current === currentId) {
      return;
    }
    prevHandledTargetId.current = currentId;

    const dur = duration || wavesurfer.current.getDuration() || 1;
    const start = Math.max(0, Math.min(targetRange.start, dur));
    const end = Math.min(Math.max(start + 0.2, targetRange.end), dur);

    rangeRef.current = { start, end };
    setRange({ start, end });

    if (activeRegion.current) {
      activeRegion.current.setOptions({ start, end });
    } else {
      activeRegion.current = regionsPlugin.current.addRegion({
        start,
        end,
        color: 'rgba(59, 130, 246, 0.25)',
        drag: true,
        resize: true,
      });
    }

    wavesurfer.current.setTime(start);

    if (targetRange.autoPlay) {
      wavesurfer.current.play().then(() => {
        setIsPlaying(true);
      }).catch(console.error);
    }
  }, [targetRange, duration, isLoaded]);

  // Initialize WaveSurfer
  useEffect(() => {
    if (!containerRef.current || !timelineRef.current) return;

    const regions = RegionsPlugin.create();
    regionsPlugin.current = regions;

    const timeline = TimelinePlugin.create({
      container: timelineRef.current,
      height: 20,
      timeInterval: 2,
      primaryLabelInterval: 5,
      style: {
        fontSize: '11px',
        color: '#9ca3af',
      }
    });

    const ws = WaveSurfer.create({
      container: containerRef.current,
      waveColor: '#64748b',
      progressColor: '#3b82f6',
      cursorColor: '#ef4444',
      cursorWidth: 2,
      height: 100,
      barWidth: 2,
      barGap: 1,
      barRadius: 2,
      plugins: [regions, timeline],
    });
    wavesurfer.current = ws;

    regions.enableDragSelection({
      color: 'rgba(59, 130, 246, 0.25)',
    });

    ws.on('ready', () => {
      const dur = ws.getDuration();
      setDuration(dur);
      setIsLoaded(true);

      regions.clearRegions();
      const defaultStart = 0;
      const defaultEnd = Math.min(10, dur > 0 ? dur : 10);

      const reg = regions.addRegion({
        start: defaultStart,
        end: defaultEnd,
        color: 'rgba(59, 130, 246, 0.25)',
        drag: true,
        resize: true,
      });
      activeRegion.current = reg;
      handleRangeChangeRef.current(defaultStart, defaultEnd);
    });

    ws.on('play', () => setIsPlaying(true));
    ws.on('pause', () => setIsPlaying(false));
    ws.on('finish', () => {
      if (isLoopingRef.current) {
        ws.setTime(rangeRef.current.start);
        ws.play().catch(console.error);
      } else {
        setIsPlaying(false);
      }
    });

    ws.on('timeupdate', (currentTime) => {
      if (!ws.isPlaying()) return;

      const currentStart = rangeRef.current.start;
      const currentEnd = rangeRef.current.end;

      if (currentTime >= currentEnd) {
        if (isLoopingRef.current) {
          ws.setTime(currentStart);
          ws.play().catch(console.error);
        } else {
          ws.pause();
          ws.setTime(currentStart);
          setIsPlaying(false);
        }
      }
    });

    regions.on('region-created', (region) => {
      const all = regions.getRegions();
      all.forEach((r) => {
        if (r.id !== region.id) r.remove();
      });
      activeRegion.current = region;
      handleRangeChangeRef.current(region.start, region.end);
    });

    regions.on('region-updated', (region) => {
      activeRegion.current = region;
      handleRangeChangeRef.current(region.start, region.end);
    });

    return () => {
      ws.destroy();
      wavesurfer.current = null;
    };
  }, []);

  // Load Audio
  useEffect(() => {
    if (wavesurfer.current && audioUrl) {
      setIsLoaded(false);
      setIsPlaying(false);
      prevHandledTargetId.current = null;
      wavesurfer.current.load(audioUrl);
    }
  }, [audioUrl]);

  const handlePlayPause = async () => {
    if (!wavesurfer.current || !isLoaded) return;

    if (isPlaying) {
      wavesurfer.current.pause();
      setIsPlaying(false);
      return;
    }

    const cur = wavesurfer.current.getCurrentTime();
    const start = rangeRef.current.start;
    const end = rangeRef.current.end;

    if (cur < start || cur >= end) {
      wavesurfer.current.setTime(start);
    }

    try {
      await wavesurfer.current.play();
      setIsPlaying(true);
    } catch (err) {
      console.error("WaveSurfer play error:", err);
    }
  };

  const handleStop = () => {
    if (!wavesurfer.current) return;
    wavesurfer.current.pause();
    wavesurfer.current.setTime(rangeRef.current.start);
    setIsPlaying(false);
  };

  const toggleLoop = () => {
    setIsLooping(!isLooping);
  };

  const setPresetRange = (start: number, end: number) => {
    if (!wavesurfer.current || !regionsPlugin.current) return;
    const dur = duration || wavesurfer.current.getDuration() || 1;
    const safeEnd = Math.min(end, dur);

    rangeRef.current = { start, end: safeEnd };
    setRange({ start, end: safeEnd });
    if (onRangeChange) onRangeChange(start, safeEnd);

    if (activeRegion.current) {
      activeRegion.current.setOptions({ start, end: safeEnd });
    } else {
      activeRegion.current = regionsPlugin.current.addRegion({
        start,
        end: safeEnd,
        color: 'rgba(59, 130, 246, 0.25)',
        drag: true,
        resize: true,
      });
    }
    wavesurfer.current.setTime(start);
  };

  return (
    <div 
      className={`bg-gray-800 p-5 rounded-xl border transition shadow-md ${
        isDraggingFile 
          ? 'border-blue-500 ring-2 ring-blue-500/50 bg-gray-800/95' 
          : 'border-gray-700'
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileInputChange} 
        accept="audio/*" 
        className="hidden" 
      />

      <div className="flex justify-between items-center mb-3">
        <h2 className="text-base font-semibold text-white flex items-center gap-2">
          <Volume2 size={18} className="text-blue-400" />
          <span>Audio Timeline & Phrase Selector</span>
        </h2>
        {audioUrl && (
          <span className="text-xs font-mono px-2.5 py-1 bg-gray-900 text-blue-300 rounded border border-gray-700">
            Selected: {range.start.toFixed(2)}s – {range.end.toFixed(2)}s ({(range.end - range.start).toFixed(2)}s)
          </span>
        )}
      </div>
      
      {!audioUrl && (
        <div 
          onClick={() => fileInputRef.current?.click()}
          className={`cursor-pointer text-center py-12 px-4 rounded-xl border-2 border-dashed transition flex flex-col items-center justify-center gap-3 ${
            isDraggingFile 
              ? 'border-blue-400 bg-blue-900/20 text-blue-200 scale-[1.01]' 
              : 'border-gray-600 hover:border-gray-500 bg-gray-900/60 hover:bg-gray-900/80 text-gray-400'
          }`}
        >
          <div className="p-3 bg-gray-800 rounded-full border border-gray-700 text-blue-400 shadow-inner">
            <UploadCloud size={28} />
          </div>
          <div>
            <div className="text-sm font-semibold text-gray-200">
              {isDraggingFile ? 'ここに音声をドロップ！' : '音声ファイルをドラッグ＆ドロップ、またはクリックして選択'}
            </div>
            <div className="text-xs text-gray-500 mt-1 font-mono">
              WAV, MP3, FLAC, M4A, OGG 対応
            </div>
          </div>
        </div>
      )}

      <div className={`relative ${!audioUrl ? 'hidden' : ''}`}>
        <div 
          ref={containerRef} 
          className="w-full bg-gray-900 rounded-t overflow-hidden border border-b-0 border-gray-700 cursor-crosshair" 
        />
        <div 
          ref={timelineRef} 
          className="w-full bg-gray-950 rounded-b overflow-hidden border border-gray-700" 
        />
        
        {isDraggingFile && (
          <div className="absolute inset-0 bg-blue-900/40 backdrop-blur-xs border-2 border-blue-500 border-dashed rounded flex items-center justify-center pointer-events-none z-20">
            <span className="text-sm font-semibold text-white bg-blue-600 px-4 py-1.5 rounded-full shadow-lg">
              新しい音声をドロップして差し替え
            </span>
          </div>
        )}
      </div>
      
      {audioUrl && (
        <div className="mt-4 flex flex-wrap gap-4 items-center justify-between">
          <div className="flex items-center gap-2">
            <button 
              onClick={handlePlayPause}
              disabled={!isLoaded}
              className={`flex items-center gap-1.5 transition px-4 py-2 rounded-lg text-xs font-semibold shadow cursor-pointer ${
                isPlaying 
                  ? 'bg-amber-600 hover:bg-amber-500 text-white' 
                  : 'bg-blue-600 hover:bg-blue-500 text-white disabled:bg-gray-700'
              }`}
            >
              {isPlaying ? <Pause size={15} /> : <Play size={15} />}
              {isPlaying ? 'Pause' : 'Play Region'}
            </button>
            
            <button 
              onClick={handleStop}
              disabled={!isLoaded}
              className="flex items-center gap-1.5 hover:bg-gray-700 transition px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-xs text-gray-300 disabled:opacity-50 cursor-pointer"
            >
              <Square size={14} /> Stop
            </button>
            
            <button 
              onClick={toggleLoop}
              disabled={!isLoaded}
              className={`flex items-center gap-1.5 transition px-3 py-2 rounded-lg text-xs font-medium border cursor-pointer ${
                isLooping 
                  ? 'bg-green-600/30 border-green-500 text-green-300 font-semibold' 
                  : 'bg-gray-900 border-gray-700 text-gray-400 hover:bg-gray-700'
              }`}
            >
              <Repeat size={14} /> Loop Region {isLooping ? '(ON)' : ''}
            </button>
          </div>

          <div className="flex gap-1.5 text-xs text-gray-400 items-center">
             <span className="text-[11px]">Presets:</span>
             <button onClick={() => setPresetRange(0, 5)} className="hover:text-white px-2 py-0.5 bg-gray-700 hover:bg-gray-600 rounded text-[11px] transition cursor-pointer">0–5s</button>
             <button onClick={() => setPresetRange(0, 10)} className="hover:text-white px-2 py-0.5 bg-gray-700 hover:bg-gray-600 rounded text-[11px] transition cursor-pointer">0–10s</button>
             <button onClick={() => setPresetRange(5, 15)} className="hover:text-white px-2 py-0.5 bg-gray-700 hover:bg-gray-600 rounded text-[11px] transition cursor-pointer">5–15s</button>
          </div>
        </div>
      )}
    </div>
  )
}
