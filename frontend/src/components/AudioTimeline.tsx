import { useEffect, useRef, useState, useCallback } from 'react'
import WaveSurfer from 'wavesurfer.js'
import RegionsPlugin, { Region } from 'wavesurfer.js/dist/plugins/regions.js'
import TimelinePlugin from 'wavesurfer.js/dist/plugins/timeline.js'
import { Play, Square, Repeat } from 'lucide-react'

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
  const isReady = useRef(false)
  
  const [isLooping, setIsLooping] = useState(false)
  const isLoopingRef = useRef(isLooping)
  useEffect(() => {
    isLoopingRef.current = isLooping;
  }, [isLooping]);

  const handleRangeChange = useCallback((start: number, end: number) => {
    setRange({ start, end });
    if (onRangeChange) onRangeChange(start, end);
  }, [onRangeChange])

  const handleRangeChangeRef = useRef(handleRangeChange)
  useEffect(() => {
    handleRangeChangeRef.current = handleRangeChange;
  }, [handleRangeChange]);

  useEffect(() => {
    if (!containerRef.current || !timelineRef.current) return;

    regionsPlugin.current = RegionsPlugin.create()
    const timelinePlugin = TimelinePlugin.create({
      container: timelineRef.current,
      height: 20,
      timeInterval: 5,
      primaryLabelInterval: 10,
    })

    wavesurfer.current = WaveSurfer.create({
      container: containerRef.current,
      waveColor: '#4b5563',
      progressColor: '#3b82f6',
      cursorColor: '#ef4444',
      height: 96,
      barWidth: 2,
      barRadius: 2,
      plugins: [regionsPlugin.current, timelinePlugin],
    });

    if (audioUrl) {
      wavesurfer.current.load(audioUrl);
    }

    wavesurfer.current.on('ready', () => {
      isReady.current = true;
      const duration = wavesurfer.current?.getDuration() || 0;
      const defaultStart = 0;
      const defaultEnd = Math.min(10, duration);
      
      activeRegion.current = regionsPlugin.current?.addRegion({
        start: defaultStart,
        end: defaultEnd,
        color: 'rgba(59, 130, 246, 0.2)', // blue-500 with opacity
        drag: true,
        resize: true,
      }) || null;

      handleRangeChangeRef.current(defaultStart, defaultEnd);
    });

    regionsPlugin.current.on('region-updated', (region) => {
      handleRangeChangeRef.current(region.start, region.end);
    });
    
    regionsPlugin.current.on('region-out', (region) => {
      if (activeRegion.current?.id === region.id) {
        if (isLoopingRef.current) {
          region.play();
        } else {
          wavesurfer.current?.pause();
        }
      }
    });

    return () => {
      wavesurfer.current?.destroy();
    }
  }, [audioUrl])

  const handlePlayRegion = () => {
    if (activeRegion.current) {
      activeRegion.current.play();
    }
  };

  const handleStop = () => {
    setIsLooping(false);
    wavesurfer.current?.pause();
    wavesurfer.current?.seekTo(0);
  };

  const toggleLoop = () => {
    setIsLooping(!isLooping);
  };

  const setFixedRange = (start: number, end: number) => {
    if (activeRegion.current && wavesurfer.current && isReady.current) {
      const duration = wavesurfer.current.getDuration() || 1;
      const safeEnd = Math.min(end, duration);
      
      activeRegion.current.setOptions({
        start: start,
        end: safeEnd
      });
      handleRangeChange(start, safeEnd);
    }
  };

  return (
    <div className="bg-gray-800 p-4 rounded-lg">
      <h2 className="text-xl mb-4 font-semibold flex justify-between items-center">
        <span>Audio Timeline</span>
        <span className="text-sm font-normal text-gray-400">Selected: {range.start.toFixed(1)}s - {range.end.toFixed(1)}s</span>
      </h2>
      
      <div className="relative">
        <div ref={containerRef} className="w-full bg-gray-700 rounded-t overflow-hidden border border-b-0 border-gray-600" />
        <div ref={timelineRef} className="w-full bg-gray-900 rounded-b overflow-hidden border border-gray-600 text-gray-400 text-xs" />
      </div>
      
      <div className="mt-4 flex flex-wrap gap-4 items-center justify-between">
        <div className="flex gap-2">
          <button 
            onClick={handlePlayRegion}
            className="flex items-center gap-1 hover:text-white hover:bg-blue-600 transition px-3 py-1.5 bg-blue-500 rounded text-sm text-white"
          >
            <Play size={16} /> Play Region
          </button>
          
          <button 
            onClick={handleStop}
            className="flex items-center gap-1 hover:text-white hover:bg-gray-600 transition px-3 py-1.5 bg-gray-700 rounded text-sm text-gray-200"
          >
            <Square size={16} /> Stop
          </button>
          
          <button 
            onClick={toggleLoop}
            className={`flex items-center gap-1 transition px-3 py-1.5 rounded text-sm ${isLooping ? 'bg-green-600 text-white hover:bg-green-500' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
          >
            <Repeat size={16} /> Loop Region
          </button>
        </div>

        <div className="flex gap-2 text-sm text-gray-400 items-center">
           <span>Quick adjust:</span>
           <button onClick={() => setFixedRange(0, 5)} className="hover:text-white transition px-2 py-1 bg-gray-700 rounded">0-5s</button>
           <button onClick={() => setFixedRange(5, 15)} className="hover:text-white transition px-2 py-1 bg-gray-700 rounded">5-15s</button>
        </div>
      </div>
    </div>
  )
}
