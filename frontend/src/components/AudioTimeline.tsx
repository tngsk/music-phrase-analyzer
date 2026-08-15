import { useEffect, useRef, useState, useCallback } from 'react'
import WaveSurfer from 'wavesurfer.js'
import RegionsPlugin, { Region } from 'wavesurfer.js/dist/plugins/regions.js'
import TimelinePlugin from 'wavesurfer.js/dist/plugins/timeline.js'
import { Play, Pause, Square, Repeat, Volume2 } from 'lucide-react'

interface Props {
  onRangeChange?: (start: number, end: number) => void;
  audioUrl?: string;
}

export default function AudioTimeline({ onRangeChange, audioUrl }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const timelineRef = useRef<HTMLDivElement>(null)
  const wavesurfer = useRef<WaveSurfer | null>(null)
  const regionsPlugin = useRef<RegionsPlugin | null>(null)
  const activeRegion = useRef<Region | null>(null)
  
  const [range, setRange] = useState({ start: 0, end: 10 })
  const rangeRef = useRef(range)
  useEffect(() => {
    rangeRef.current = range;
  }, [range]);

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
    setRange({ start: s, end: e });
    if (onRangeChange) onRangeChange(s, e);
  }, [onRangeChange])

  const handleRangeChangeRef = useRef(handleRangeChange)
  useEffect(() => {
    handleRangeChangeRef.current = handleRangeChange;
  }, [handleRangeChange]);

  // Initialize WaveSurfer instance
  useEffect(() => {
    if (!containerRef.current || !timelineRef.current) return;

    const regions = RegionsPlugin.create()
    regionsPlugin.current = regions

    const timeline = TimelinePlugin.create({
      container: timelineRef.current,
      height: 20,
      timeInterval: 2,
      primaryLabelInterval: 5,
      style: {
        fontSize: '11px',
        color: '#9ca3af',
      }
    })

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

    // Enable drag selection on waveform
    regions.enableDragSelection({
      color: 'rgba(59, 130, 246, 0.25)',
    });

    ws.on('ready', () => {
      const dur = ws.getDuration();
      setDuration(dur);
      setIsLoaded(true);

      // Clear existing regions
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
    ws.on('finish', () => setIsPlaying(false));

    // Timeupdate boundary monitoring for precise region playback and looping
    ws.on('timeupdate', (currentTime) => {
      const currentEnd = rangeRef.current.end;
      const currentStart = rangeRef.current.start;

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
      // Keep only one active selection region
      const all = regions.getRegions();
      all.forEach((r) => {
        if (r.id !== region.id) {
          r.remove();
        }
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
    }
  }, []);

  // Load audioUrl when changed
  useEffect(() => {
    if (wavesurfer.current && audioUrl) {
      setIsLoaded(false);
      setIsPlaying(false);
      wavesurfer.current.load(audioUrl);
    }
  }, [audioUrl]);

  const handlePlayRegion = async () => {
    if (!wavesurfer.current) return;
    
    if (isPlaying) {
      wavesurfer.current.pause();
      setIsPlaying(false);
      return;
    }

    const start = range.start;
    const end = range.end;
    const currentTime = wavesurfer.current.getCurrentTime();

    // If playhead is outside region, move to region start
    if (currentTime < start || currentTime >= end) {
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
    setIsLooping(false);
    wavesurfer.current.pause();
    wavesurfer.current.setTime(range.start);
    setIsPlaying(false);
  };

  const toggleLoop = () => {
    setIsLooping(!isLooping);
  };

  const setFixedRange = (start: number, end: number) => {
    if (!wavesurfer.current || !regionsPlugin.current) return;
    const dur = duration || wavesurfer.current.getDuration() || 1;
    const safeEnd = Math.min(end, dur);

    if (activeRegion.current) {
      activeRegion.current.setOptions({
        start: start,
        end: safeEnd,
      });
    } else {
      activeRegion.current = regionsPlugin.current.addRegion({
        start: start,
        end: safeEnd,
        color: 'rgba(59, 130, 246, 0.25)',
        drag: true,
        resize: true,
      });
    }
    handleRangeChange(start, safeEnd);
    wavesurfer.current.setTime(start);
  };

  return (
    <div className="bg-gray-800 p-5 rounded-xl border border-gray-700 shadow-md">
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <Volume2 size={20} className="text-blue-400" />
          <span>Audio Timeline & Phrase Selector</span>
        </h2>
        <span className="text-sm font-mono px-3 py-1 bg-gray-900 text-blue-300 rounded border border-gray-700">
          Selected: {range.start.toFixed(2)}s – {range.end.toFixed(2)}s ({(range.end - range.start).toFixed(2)}s)
        </span>
      </div>
      
      {!audioUrl && (
        <div className="text-center py-8 bg-gray-900/60 rounded-lg border-2 border-dashed border-gray-700 text-gray-400 text-sm">
          ⬆️ Please upload an audio file above to view waveform and select phrase
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
      </div>
      
      {audioUrl && (
        <div className="mt-4 flex flex-wrap gap-4 items-center justify-between">
          <div className="flex items-center gap-2">
            <button 
              onClick={handlePlayRegion}
              disabled={!isLoaded}
              className={`flex items-center gap-1.5 transition px-4 py-2 rounded-lg text-sm font-medium shadow ${
                isPlaying 
                  ? 'bg-amber-600 hover:bg-amber-500 text-white' 
                  : 'bg-blue-600 hover:bg-blue-500 text-white disabled:bg-gray-700'
              }`}
            >
              {isPlaying ? <Pause size={16} /> : <Play size={16} />}
              {isPlaying ? 'Pause' : 'Play Region'}
            </button>
            
            <button 
              onClick={handleStop}
              disabled={!isLoaded}
              className="flex items-center gap-1.5 hover:bg-gray-700 transition px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm text-gray-300 disabled:opacity-50"
            >
              <Square size={16} /> Stop
            </button>
            
            <button 
              onClick={toggleLoop}
              disabled={!isLoaded}
              className={`flex items-center gap-1.5 transition px-3.5 py-2 rounded-lg text-sm font-medium border ${
                isLooping 
                  ? 'bg-green-600/30 border-green-500 text-green-300' 
                  : 'bg-gray-900 border-gray-700 text-gray-400 hover:bg-gray-700'
              }`}
            >
              <Repeat size={16} /> Loop Region {isLooping ? '(ON)' : ''}
            </button>
          </div>

          <div className="flex gap-2 text-xs text-gray-400 items-center">
             <span>Quick Presets:</span>
             <button onClick={() => setFixedRange(0, 5)} className="hover:text-white px-2.5 py-1 bg-gray-700 hover:bg-gray-600 rounded transition">0–5s</button>
             <button onClick={() => setFixedRange(0, 10)} className="hover:text-white px-2.5 py-1 bg-gray-700 hover:bg-gray-600 rounded transition">0–10s</button>
             <button onClick={() => setFixedRange(5, 15)} className="hover:text-white px-2.5 py-1 bg-gray-700 hover:bg-gray-600 rounded transition">5–15s</button>
          </div>
        </div>
      )}
    </div>
  )
}
