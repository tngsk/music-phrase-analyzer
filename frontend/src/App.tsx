import { useState } from 'react'
import AudioTimeline from './components/AudioTimeline'
import StemSelector from './components/StemSelector'
import PlayerControls from './components/PlayerControls'
import PianoRoll from './components/PianoRoll'
import StemMixer from './components/StemMixer'
import HarmonyTimeline from './components/HarmonyTimeline'
import TheoryDashboard from './components/TheoryDashboard'
import ReportViewer from './components/ReportViewer'
import { uploadAudio, analyzeAudio, getReport } from './services/api'
import { AnalysisResponse } from './types/analysis'
import { UploadCloud, CheckCircle2, Loader2, Music } from 'lucide-react'

function App() {
  const [fileId, setFileId] = useState<string | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  
  const [taskId, setTaskId] = useState<string | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisResults, setAnalysisResults] = useState<AnalysisResponse | null>(null)
  const [reportMarkdown, setReportMarkdown] = useState<string>('')
  
  const [timeRange, setTimeRange] = useState({ start: 0, end: 10 })
  const [selectedStems, setSelectedStems] = useState<string[]>(["vocals", "bass", "drums", "other"])

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setFileName(file.name)
      
      // Create local object URL for instant zero-latency waveform rendering & preview
      const localUrl = URL.createObjectURL(file)
      setAudioUrl(localUrl)
      
      setIsUploading(true)
      try {
        const res = await uploadAudio(file)
        setFileId(res.file_id)
      } catch (err) {
        console.error("Upload failed", err)
      } finally {
        setIsUploading(false)
      }
    }
  }

  const handleAnalyze = async () => {
    if (!fileId) return
    setIsAnalyzing(true)
    try {
      const res: any = await analyzeAudio({
        file_id: fileId,
        start_time: timeRange.start,
        end_time: timeRange.end,
        stems: selectedStems
      })
      setTaskId(res.task_id)
      setAnalysisResults({
        ...res.results,
        notes: res.notes || [],
        stems: res.stems || [],
        all_midi_url: res.all_midi_url,
        task_id: res.task_id
      })
      
      const reportRes = await getReport(res.task_id)
      setReportMarkdown(reportRes.report)
      
    } catch (err) {
      console.error("Analysis failed", err)
    } finally {
      setIsAnalyzing(false)
    }
  }

  return (
    <div className="container mx-auto p-4 max-w-6xl space-y-6 pb-20">
      <header className="border-b border-gray-700 pb-4 flex flex-wrap justify-between items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            <Music className="text-blue-400" size={32} />
            <span>Music Phrase Analyzer</span>
          </h1>
          <p className="text-gray-400 mt-1 text-sm">
            音源をアップロードし、気になるフレーズを範囲選択して、メロディ・コード・音色・MIDIを徹底解析。
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-4 py-2.5 rounded-lg shadow transition">
            <UploadCloud size={18} />
            <span>{fileName ? '音源を変更' : '音源を選択 (WAV/MP3)'}</span>
            <input 
              type="file" 
              accept="audio/*" 
              onChange={handleFileUpload} 
              className="hidden"
            />
          </label>
        </div>
      </header>

      {/* Upload Status Banner */}
      {fileName && (
        <div className="flex items-center justify-between bg-gray-800/80 border border-gray-700 px-4 py-2.5 rounded-lg text-sm">
          <div className="flex items-center gap-2 text-gray-300">
            <Music size={16} className="text-blue-400" />
            <span className="font-mono">{fileName}</span>
          </div>
          <div className="flex items-center gap-2">
            {isUploading ? (
              <span className="flex items-center gap-1.5 text-amber-400 text-xs">
                <Loader2 size={14} className="animate-spin" /> アップロード中...
              </span>
            ) : fileId ? (
              <span className="flex items-center gap-1.5 text-green-400 text-xs">
                <CheckCircle2 size={14} /> アップロード完了 (ID: {fileId.slice(0, 8)}...)
              </span>
            ) : null}
          </div>
        </div>
      )}

      <main className="space-y-6">
        <section className="space-y-4">
           {/* Audio Timeline with Wavesurfer Waveform & Drag Region */}
           <AudioTimeline 
             audioUrl={audioUrl || undefined}
             onRangeChange={(start, end) => setTimeRange({ start, end })} 
           />
           
           <StemSelector selectedStems={selectedStems} onChange={setSelectedStems} />
           
           <div className="flex justify-between items-center bg-gray-800 p-4 rounded-xl border border-gray-700">
             <button 
               onClick={handleAnalyze} 
               disabled={!fileId || isAnalyzing || isUploading}
               className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:from-gray-700 disabled:to-gray-700 text-white font-bold py-2.5 px-7 rounded-lg shadow-lg transition disabled:cursor-not-allowed"
             >
               {isAnalyzing ? (
                 <>
                   <Loader2 size={18} className="animate-spin" />
                   <span>フレーズ解析中 (Demucs + music21)...</span>
                 </>
               ) : (
                 <span>選択範囲を解析する ({timeRange.start.toFixed(1)}s – {timeRange.end.toFixed(1)}s)</span>
               )}
             </button>
             <PlayerControls taskId={taskId} selectedStems={selectedStems} />
           </div>
        </section>

        {analysisResults && (
          <section className="space-y-6 animate-fade-in">
            <h2 className="text-2xl font-semibold border-b border-gray-700 pb-2 text-white flex items-center gap-2">
              <span>Analysis & Separation Results</span>
            </h2>
            
            {/* Stem Audio Mixer & Multi-track MIDI Download */}
            <StemMixer 
              stems={analysisResults.stems || []} 
              taskId={taskId} 
            />

            {/* Dynamic Interactive Piano Roll */}
            <PianoRoll notes={analysisResults.notes} />

            {/* Harmony & Progression Timeline */}
            <HarmonyTimeline chords={analysisResults.harmony?.chords || []} />

            {/* Theory Metrics & Summary */}
            <TheoryDashboard results={analysisResults} />
          </section>
        )}

        {reportMarkdown && (
          <section>
            <ReportViewer markdown={reportMarkdown} taskId={taskId} />
          </section>
        )}
      </main>
    </div>
  )
}

export default App
