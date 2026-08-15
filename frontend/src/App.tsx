import { useState } from 'react'
import AudioTimeline from './components/AudioTimeline'
import StemSelector from './components/StemSelector'
import StemMixer from './components/StemMixer'
import HarmonyTimeline from './components/HarmonyTimeline'
import ReportViewer from './components/ReportViewer'
import { uploadAudio, analyzeAudio, getReport } from './services/api'
import { AnalysisResponse } from './types/analysis'
import { UploadCloud, CheckCircle2, Loader2, Music, Sparkles } from 'lucide-react'

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

  const processFile = async (file: File) => {
    setFileName(file.name)
    
    // Create local object URL for instant zero-latency waveform rendering & preview
    const localUrl = URL.createObjectURL(file)
    setAudioUrl(localUrl)
    
    // Reset previous analysis
    setTaskId(null)
    setAnalysisResults(null)
    setReportMarkdown('')
    
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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0])
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
    <div className="container mx-auto p-4 max-w-5xl space-y-6 pb-20">
      <header className="border-b border-gray-700 pb-4 flex flex-wrap justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <Music className="text-blue-400" size={28} />
            <span>Music Phrase Analyzer</span>
          </h1>
          <p className="text-gray-400 mt-0.5 text-xs">
            音源をドラッグ＆ドロップし、気になるフレーズを選択してパート分離（Demucs）＋ 和声解析 ＋ MIDI抽出。
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-4 py-2 rounded-lg shadow transition">
            <UploadCloud size={16} />
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
        <div className="flex items-center justify-between bg-gray-800/80 border border-gray-700 px-3.5 py-2 rounded-lg text-xs">
          <div className="flex items-center gap-2 text-gray-300">
            <Music size={15} className="text-blue-400" />
            <span className="font-mono">{fileName}</span>
          </div>
          <div className="flex items-center gap-2">
            {isUploading ? (
              <span className="flex items-center gap-1.5 text-amber-400 text-xs">
                <Loader2 size={13} className="animate-spin" /> アップロード中...
              </span>
            ) : fileId ? (
              <span className="flex items-center gap-1.5 text-green-400 text-xs">
                <CheckCircle2 size={13} /> アップロード完了 (ID: {fileId.slice(0, 8)}...)
              </span>
            ) : null}
          </div>
        </div>
      )}

      <main className="space-y-6">
        <section className="space-y-4">
           {/* Audio Timeline with Drag & Drop, Waveform, and Drag Region */}
           <AudioTimeline 
             audioUrl={audioUrl || undefined}
             onFileSelect={processFile}
             onRangeChange={(start, end) => setTimeRange({ start, end })} 
           />
           
           <StemSelector selectedStems={selectedStems} onChange={setSelectedStems} />
           
           <div className="flex justify-between items-center bg-gray-800 p-3.5 rounded-xl border border-gray-700">
             <button 
               onClick={handleAnalyze} 
               disabled={!fileId || isAnalyzing || isUploading}
               className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:from-gray-700 disabled:to-gray-700 text-white font-bold py-2.5 px-6 rounded-lg shadow transition disabled:cursor-not-allowed text-sm"
             >
               {isAnalyzing ? (
                 <>
                   <Loader2 size={16} className="animate-spin" />
                   <span>フレーズ解析中 (Demucs + music21)...</span>
                 </>
               ) : (
                 <>
                   <Sparkles size={16} />
                   <span>選択範囲を解析する ({timeRange.start.toFixed(1)}s – {timeRange.end.toFixed(1)}s)</span>
                 </>
               )}
             </button>

             {taskId && (
               <span className="text-xs text-gray-400 font-mono">
                 Task: {taskId.slice(0, 8)}
               </span>
             )}
           </div>
        </section>

        {analysisResults && (
          <section className="space-y-5 animate-fade-in">
            {/* Stem Audio Mixer & Multi-track MIDI Download */}
            <StemMixer 
              stems={analysisResults.stems || []} 
              taskId={taskId} 
            />

            {/* Compact Harmony & Progression Timeline */}
            <HarmonyTimeline 
              chords={analysisResults.harmony?.chords || []}
              progressions={analysisResults.harmony?.progressions || []}
            />
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
