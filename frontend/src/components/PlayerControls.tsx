import { Play, Square, Download } from 'lucide-react'
import * as Tone from 'tone'
import { useState, useRef } from 'react'

interface Props {
  taskId: string | null;
  selectedStems: string[];
}

export default function PlayerControls({ taskId, selectedStems }: Props) {
  const [isPlaying, setIsPlaying] = useState(false);
  const synthRef = useRef<Tone.PolySynth | null>(null);

  const initTone = async () => {
    await Tone.start();
    if (!synthRef.current) {
      synthRef.current = new Tone.PolySynth(Tone.Synth).toDestination();
    }
  }

  const handlePlay = async () => {
    await initTone();
    const synth = synthRef.current;
    if (!synth) return;
    
    if (Tone.Transport.state !== 'started') {
      Tone.Transport.start();
      setIsPlaying(true);
      
      const now = Tone.now();
      synth.triggerAttackRelease("C4", "8n", now);
      synth.triggerAttackRelease("E4", "8n", now + 0.5);
      synth.triggerAttackRelease("G4", "8n", now + 1);
      
      setTimeout(() => {
        Tone.Transport.stop();
        setIsPlaying(false);
      }, 2000);
    }
  }

  const handleStop = () => {
    Tone.Transport.stop();
    setIsPlaying(false);
  }

  const handleExportMIDI = () => {
    if (!taskId) return;
    
    const stemToDownload = selectedStems.length > 0 ? selectedStems[0] : "other";
    const link = document.createElement("a");
    link.href = `http://localhost:8000/export/midi/${taskId}/${stemToDownload}`;
    link.download = `${stemToDownload}.mid`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <div className="flex items-center space-x-6">
      <div className="flex space-x-4">
        <button 
          onClick={handlePlay} 
          className={`${isPlaying ? 'bg-green-400' : 'bg-green-600 hover:bg-green-500'} text-white p-2 rounded-full flex items-center justify-center transition`} 
          title="Play (Tone.js Synth Demo)"
        >
          <Play size={24} />
        </button>
        <button 
          onClick={handleStop} 
          className="bg-red-600 hover:bg-red-500 text-white p-2 rounded-full flex items-center justify-center transition" 
          title="Stop"
        >
          <Square size={24} />
        </button>
      </div>
      
      <button 
        onClick={handleExportMIDI}
        disabled={!taskId}
        className="bg-purple-600 hover:bg-purple-500 disabled:bg-gray-600 text-white px-4 py-2 rounded flex items-center space-x-2 transition"
      >
        <Download size={18} />
        <span>Export MIDI</span>
      </button>
    </div>
  )
}
