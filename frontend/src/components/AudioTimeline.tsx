import { useEffect, useRef, useState } from 'react'
import WaveSurfer from 'wavesurfer.js'

interface Props {
  onRangeChange?: (start: number, end: number) => void;
  audioUrl?: string;
}

export default function AudioTimeline({ onRangeChange, audioUrl }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const wavesurfer = useRef<WaveSurfer | null>(null)
  const [range, setRange] = useState({ start: 0, end: 10 })
  const isReady = useRef(false)

  useEffect(() => {
    if (!containerRef.current) return;

    wavesurfer.current = WaveSurfer.create({
      container: containerRef.current,
      waveColor: '#4b5563',
      progressColor: '#3b82f6',
      cursorColor: '#ef4444',
      height: 96,
      barWidth: 2,
      barRadius: 2,
    });

    if (audioUrl) {
      wavesurfer.current.load(audioUrl);
    }

    wavesurfer.current.on('ready', () => {
      isReady.current = true;
    });

    return () => {
      wavesurfer.current?.destroy();
    }
  }, [audioUrl])

  const handleRangeChange = (start: number, end: number) => {
    setRange({ start, end });
    if (onRangeChange) onRangeChange(start, end);
  }

  useEffect(() => {
    if (onRangeChange) onRangeChange(0, 10);
  }, []);

  return (
    <div className="bg-gray-800 p-4 rounded-lg">
      <h2 className="text-xl mb-4 font-semibold flex justify-between items-center">
        <span>Audio Timeline</span>
        <span className="text-sm font-normal text-gray-400">Selected: {range.start.toFixed(1)}s - {range.end.toFixed(1)}s</span>
      </h2>
      
      <div className="relative">
        <div ref={containerRef} className="w-full bg-gray-700 rounded overflow-hidden border border-gray-600" />
        <div className="absolute top-0 left-[20%] w-[30%] h-full bg-blue-500/20 border-l border-r border-blue-400 pointer-events-none" />
      </div>

      <div className="mt-4 flex gap-4 text-sm text-gray-400 items-center justify-center">
         <span>Quick adjust range:</span>
         <button onClick={() => handleRangeChange(0, 5)} className="hover:text-white transition px-2 py-1 bg-gray-700 rounded">0-5s</button>
         <button onClick={() => handleRangeChange(5, 15)} className="hover:text-white transition px-2 py-1 bg-gray-700 rounded">5-15s</button>
      </div>
    </div>
  )
}
