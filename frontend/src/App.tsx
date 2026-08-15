import { useState } from 'react'
import AudioTimeline from './components/AudioTimeline'
import StemSelector from './components/StemSelector'
import PlayerControls from './components/PlayerControls'
import PianoRoll from './components/PianoRoll'
import HarmonyTimeline from './components/HarmonyTimeline'
import TheoryDashboard from './components/TheoryDashboard'
import ReportViewer from './components/ReportViewer'
import { uploadAudio, analyzeAudio, getReport } from './services/api'
import { AnalysisResponse } from './types/analysis'

function App() {
  const [fileId, setFileId] = useState<string | null>(null)
  const [taskId, setTaskId] = useState<string | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisResults, setAnalysisResults] = useState<AnalysisResponse | null>(null)
  const [reportMarkdown, setReportMarkdown] = useState<string>('')
  
  const [timeRange, setTimeRange] = useState({ start: 0, end: 10 })
  const [selectedStems, setSelectedStems] = useState<string[]>(["vocals", "bass", "drums", "other"])

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      try {
        const res = await uploadAudio(e.target.files[0])
        setFileId(res.file_id)
      } catch (err) {
        console.error("Upload failed", err)
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
      setAnalysisResults(res.results)
      
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
      <header className="border-b border-gray-700 pb-4 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Music Phrase Analyzer</h1>
          <p className="text-gray-400 mt-2">Upload audio, select a phrase, analyze harmony & rhythm, and export stems.</p>
        </div>
        <div>
           <input type="file" accept="audio/*" onChange={handleFileUpload} className="text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-gray-700 file:text-white hover:file:bg-gray-600 cursor-pointer"/>
        </div>
      </header>

      <main className="space-y-6">
        <section className="space-y-4">
           <AudioTimeline onRangeChange={(start, end) => setTimeRange({start, end})} />
           <StemSelector selectedStems={selectedStems} onChange={setSelectedStems} />
           
           <div className="flex justify-between items-center bg-gray-800 p-4 rounded-lg">
             <button 
               onClick={handleAnalyze} 
               disabled={!fileId || isAnalyzing}
               className="bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 text-white font-bold py-2 px-6 rounded transition"
             >
               {isAnalyzing ? 'Analyzing...' : 'Analyze Selection'}
             </button>
             <PlayerControls taskId={taskId} selectedStems={selectedStems} />
           </div>
        </section>

        {analysisResults && (
          <section className="space-y-4">
            <h2 className="text-2xl font-semibold border-b border-gray-700 pb-2">Analysis Results</h2>
            <PianoRoll notes={analysisResults.notes} />
            <HarmonyTimeline chords={analysisResults.harmony?.chords || []} />
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
