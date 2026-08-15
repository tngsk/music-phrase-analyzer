import { useState, useRef, useMemo } from 'react';
import { NoteEvent } from '../types/analysis';

interface PianoRollProps {
  notes?: NoteEvent[];
}

const STEM_COLORS: Record<string, string> = {
  vocals: 'rgba(59, 130, 246, 0.8)', // blue-500
  bass: 'rgba(168, 85, 247, 0.8)', // purple-500
  drums: 'rgba(245, 158, 11, 0.8)', // amber-500
  other: 'rgba(34, 197, 94, 0.8)', // green-500
  default: 'rgba(156, 163, 175, 0.8)', // gray-400
};

const STEM_BORDERS: Record<string, string> = {
  vocals: 'rgb(37, 99, 235)', // blue-600
  bass: 'rgb(147, 51, 234)', // purple-600
  drums: 'rgb(217, 119, 6)', // amber-600
  other: 'rgb(22, 163, 74)', // green-600
  default: 'rgb(107, 114, 128)', // gray-500
};

// C2 to C7 range (MIDI 36 to 96)
const MIN_PITCH = 36;
const MAX_PITCH = 96;
const PITCH_RANGE = MAX_PITCH - MIN_PITCH + 1;

function isBlackKey(pitch: number) {
  const note = pitch % 12;
  return [1, 3, 6, 8, 10].includes(note);
}

function getNoteName(pitch: number) {
  const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const note = notes[pitch % 12];
  const octave = Math.floor(pitch / 12) - 1;
  return `${note}${octave}`;
}

export default function PianoRoll({ notes = [] }: PianoRollProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredNote, setHoveredNote] = useState<NoteEvent | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // If no notes, generate a clean fallback visualization
  const displayNotes = notes && notes.length > 0 ? notes : [];
  
  // X-axis scale based on max time
  const maxTime = useMemo(() => {
    if (displayNotes.length === 0) return 10;
    return Math.max(...displayNotes.map(n => n.start + n.duration), 10);
  }, [displayNotes]);

  // Handle zooming / resizing via CSS width 100% and viewBox
  // SVG handles scaling well.

  return (
    <div className="bg-gray-800 p-4 rounded-lg flex flex-col w-full h-full">
      <h2 className="text-xl mb-4 font-semibold text-white">Piano Roll</h2>
      <div 
        className="relative flex-1 bg-gray-900 rounded border border-gray-700 overflow-hidden shadow-inner h-96 w-full"
        ref={containerRef}
      >
        {/* Pitch Y-Axis Labels (HTML overlay instead of distorted SVG text) */}
        <div className="absolute left-0 top-0 bottom-0 w-8 flex flex-col pointer-events-none z-10 border-r border-gray-600 bg-gray-900 bg-opacity-70">
          {Array.from({ length: PITCH_RANGE }).map((_, i) => {
            const pitch = MAX_PITCH - i;
            const isC = pitch % 12 === 0;
            const rowHeight = 100 / PITCH_RANGE;
            const top = `${i * rowHeight}%`;
            
            if (!isC) return null;
            
            return (
              <div 
                key={`label-${pitch}`}
                className="absolute w-full text-right pr-1 text-[10px] text-gray-400 font-medium leading-none"
                style={{ top, transform: 'translateY(-50%)' }}
              >
                C{Math.floor(pitch / 12) - 1}
              </div>
            );
          })}
        </div>

        <svg 
          className="w-full h-full"
          preserveAspectRatio="none"
          viewBox={`0 0 100 100`}
          onMouseMove={(e) => {
            if (containerRef.current) {
              const rect = containerRef.current.getBoundingClientRect();
              setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
            }
          }}
          onMouseLeave={() => setHoveredNote(null)}
        >
          {/* Pitch Grid Background */}
          {Array.from({ length: PITCH_RANGE }).map((_, i) => {
            const pitch = MAX_PITCH - i;
            const black = isBlackKey(pitch);
            const rowHeight = 100 / PITCH_RANGE;
            const y = i * rowHeight;
            
            return (
              <rect
                key={`bg-${pitch}`}
                x="0"
                y={y}
                width="100%"
                height={rowHeight}
                fill={black ? '#1f2937' : '#374151'} // gray-800 / gray-700
                stroke="#4b5563" // gray-600
                strokeWidth="0.1"
              />
            );
          })}

          {/* Grid lines for time X-axis (rough markers) */}
          {Array.from({ length: Math.ceil(maxTime) + 1 }).map((_, i) => {
             const x = (i / maxTime) * 100;
             return (
               <line 
                 key={`time-${i}`}
                 x1={x} y1="0" x2={x} y2="100"
                 stroke="#4b5563"
                 strokeWidth="0.1"
                 strokeDasharray="1,1"
               />
             )
          })}

          {/* Notes */}
          {displayNotes.map((note, index) => {
            // Only render notes within the PITCH_RANGE
            if (note.pitch > MAX_PITCH || note.pitch < MIN_PITCH) return null;

            const startX = (note.start / maxTime) * 100;
            const widthX = (note.duration / maxTime) * 100;
            
            const rowHeight = 100 / PITCH_RANGE;
            const y = (MAX_PITCH - note.pitch) * rowHeight;
            
            const stem = note.stem || 'default';
            const color = STEM_COLORS[stem] || STEM_COLORS.default;
            const borderColor = STEM_BORDERS[stem] || STEM_BORDERS.default;

            return (
              <rect
                key={index}
                x={startX}
                y={y}
                width={widthX}
                height={rowHeight * 0.9} // slight padding
                rx="0.5"
                ry="0.5"
                fill={color}
                stroke={borderColor}
                strokeWidth="0.2"
                onMouseEnter={() => setHoveredNote(note)}
                onMouseLeave={() => setHoveredNote(null)}
                className="cursor-pointer transition-colors duration-200 hover:brightness-125"
              />
            );
          })}
        </svg>

        {/* Hover Inspector Tooltip */}
        {hoveredNote && (
          <div 
            className="absolute z-10 bg-gray-900 border border-gray-600 text-xs text-white p-2 rounded shadow-lg pointer-events-none"
            style={{
              left: mousePos.x + 10,
              top: mousePos.y + 10,
              transform: 'translate(0, 0)' // Let it flow naturally relative to mouse
            }}
          >
            <div className="font-bold mb-1">{hoveredNote.name || getNoteName(hoveredNote.pitch)} (MIDI: {hoveredNote.pitch})</div>
            <div>Start: {hoveredNote.start.toFixed(2)}s</div>
            <div>Duration: {hoveredNote.duration.toFixed(2)}s</div>
            <div>Velocity: {hoveredNote.velocity}</div>
            {hoveredNote.stem && <div className="capitalize mt-1 text-gray-400">Stem: {hoveredNote.stem}</div>}
          </div>
        )}
        
        {displayNotes.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
             <span className="text-gray-500 font-medium">No note data available</span>
          </div>
        )}
      </div>
    </div>
  );
}
