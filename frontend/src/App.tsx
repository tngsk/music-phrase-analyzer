import { useState, useCallback } from 'react'
import AudioTimeline from './components/AudioTimeline'
import StemSelector from './components/StemSelector'
import StemMixer from './components/StemMixer'
import HarmonyTimeline from './components/HarmonyTimeline'
import ReportViewer from './components/ReportViewer'
import { uploadAudio, analyzeAudio, reanalyzeHarmony, getReport, cleanupAllData } from './services/api'
import { AnalysisResponse, AudioSubRegion } from './types/analysis'
import { UploadCloud, CheckCircle2, Loader2, Music, Sparkles, Trash2 } from 'lucide-react'

function App() {
  const [fileId, setFileId] = useState<string | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isCleaning, setIsCleaning] = useState(false)
  
  const [taskId, setTaskId] = useState<string | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isReanalyzingHarmony, setIsReanalyzingHarmony] = useState(false)
  const [analysisResults, setAnalysisResults] = useState<AnalysisResponse | null>(null)
  const [reportMarkdown, setReportMarkdown] = useState<string>('')
  
  const [timeRange, setTimeRange] = useState({ start: 0, end: 10 })
  const [analyzedRange, setAnalyzedRange] = useState<{ start: number; end: number }>({ start: 0, end: 10 })
  const [targetRange, setTargetRange] = useState<{ id: number; start: number; end: number; autoPlay?: boolean } | null>(null)
  const [activeSubRegion, setActiveSubRegion] = useState<AudioSubRegion | null>(null)
  const [activeChordIndex, setActiveChordIndex] = useState<number | null>(null)

  const [selectedStems, setSelectedStems] = useState<string[]>([
    "vocals", "bass", "drums", "guitar", "piano", "other"
  ])
  const [selectedHarmonicStems, setSelectedHarmonicStems] = useState<string[]>([
    "bass", "piano", "guitar", "other"
  ])

  const processFile = async (file: File) => {
    setFileName(file.name)
    
    // Create local object URL for zero-latency waveform rendering & preview
    const localUrl = URL.createObjectURL(file)
    setAudioUrl(localUrl)
    
    // Reset previous analysis
    setTaskId(null)
    setAnalysisResults(null)
    setReportMarkdown('')
    setActiveChordIndex(null)
    setActiveSubRegion(null)
    setTargetRange(null)
    
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

  const handleRangeChange = useCallback((start: number, end: number) => {
    setTimeRange({ start, end })
  }, [])

  const handleAnalyze = async () => {
    if (!fileId) return
    setIsAnalyzing(true)
    setActiveChordIndex(null)
    setActiveSubRegion(null)
    
    // Lock the analyzed range for accurate chord time mapping
    const currentStart = timeRange.start
    const currentEnd = timeRange.end
    setAnalyzedRange({ start: currentStart, end: currentEnd })

    try {
      const res: any = await analyzeAudio({
        file_id: fileId,
        start_time: currentStart,
        end_time: currentEnd,
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

  const handleHarmonicStemsChange = async (newHarmonicStems: string[]) => {
    setSelectedHarmonicStems(newHarmonicStems)
    if (!taskId || !analysisResults) return

    setIsReanalyzingHarmony(true)
    try {
      const res = await reanalyzeHarmony(taskId, newHarmonicStems)
      if (res.harmony) {
        setAnalysisResults(prev => prev ? {
          ...prev,
          harmony: res.harmony
        } : null)
      }
    } catch (err) {
      console.error("Harmony re-analysis failed:", err)
    } finally {
      setIsReanalyzingHarmony(false)
    }
  }

  const handleChordClick = (chordStartRel: number, chordEndRel: number, index: number) => {
    setActiveChordIndex(index)
    
    const absStart = analyzedRange.start + chordStartRel
    const absEnd = analyzedRange.start + chordEndRel

    const subReg: AudioSubRegion = {
      startRel: Math.round(chordStartRel * 100) / 100,
      endRel: Math.round(chordEndRel * 100) / 100,
      startAbs: Math.round(absStart * 100) / 100,
      endAbs: Math.round(absEnd * 100) / 100,
      autoPlay: true
    }

    setActiveSubRegion(subReg)
    
    // Play the original audio timeline for this chord region with unique trigger ID
    setTargetRange({
      id: Date.now(),
      start: subReg.startAbs,
      end: subReg.endAbs,
      autoPlay: true
    })
  }

  const handleClearSubRegion = () => {
    setActiveSubRegion(null)
    setActiveChordIndex(null)
  }

  const handleCleanupAndReset = async () => {
    const confirmMessage = "アップロードされた音源と、サーバー上の中間生成物（ステム音源・MIDI・レポート）をすべて削除して初期状態にリセットしますか？";
    if (!window.confirm(confirmMessage)) return;

    setIsCleaning(true);
    try {
      await cleanupAllData();
      // Reset all application states
      setFileId(null);
      setAudioUrl(null);
      setFileName(null);
      setTaskId(null);
      setAnalysisResults(null);
      setReportMarkdown('');
      setActiveChordIndex(null);
      setActiveSubRegion(null);
      setTargetRange(null);
    } catch (err) {
      console.error("Cleanup failed:", err);
      alert("クリーンアップ中にエラーが発生しました。");
    } finally {
      setIsCleaning(false);
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-5xl space-y-6 pb-20">
      <header className="border-b border-gray-700 pb-4 flex flex-wrap justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <Music className="text-blue-400" size={28} />
            <span>Music Phrase Analyzer</span>
          </h1>
          <p className="text-gray-400 mt-0.5 text-xs">
            音源をドラッグ＆ドロップし、気になるフレーズを選択して 6パート音源分離（Demucs 6s）＋ 和声解析 ＋ MIDI抽出。
          </p>
        </div>
        
        <div className="flex items-center gap-2.5">
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

          {(fileId || taskId || fileName) && (
            <button
              type="button"
              onClick={handleCleanupAndReset}
              disabled={isCleaning}
              className="flex items-center gap-1.5 bg-red-950/60 hover:bg-red-900/80 text-red-300 hover:text-white border border-red-800/60 text-xs font-medium px-3 py-2 rounded-lg transition shadow-xs cursor-pointer disabled:opacity-50"
              title="サーバー上の音源・生成物を全削除して初期状態にリセット"
            >
              {isCleaning ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
              <span>{isCleaning ? '消去中...' : 'データ全消去＆リセット'}</span>
            </button>
          )}
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
           {/* Audio Timeline: Original Waveform & Phrase Selector */}
           <AudioTimeline 
             audioUrl={audioUrl || undefined}
             onFileSelect={processFile}
             onRangeChange={handleRangeChange} 
             targetRange={targetRange}
           />

           {/* Harmony & Chord Progression Timeline (Directly below Audio Timeline) */}
           {analysisResults && (
             <div className="animate-fade-in">
               <HarmonyTimeline 
                 chords={analysisResults.harmony?.chords || []}
                 progressions={analysisResults.harmony?.progressions || []}
                 keyName={analysisResults.harmony?.key}
                 bpm={analysisResults.rhythm?.bpm || analysisResults.harmony?.bpm}
                 availableStems={analysisResults.stems || []}
                 selectedHarmonicStems={selectedHarmonicStems}
                 onHarmonicStemsChange={handleHarmonicStemsChange}
                 isReanalyzing={isReanalyzingHarmony}
                 onChordClick={handleChordClick}
                 activeChordIndex={activeChordIndex}
                 totalDuration={analyzedRange.end - analyzedRange.start}
               />
             </div>
           )}
           
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
                   <span>6パート解析中 (Demucs 6s + music21)...</span>
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
            {/* 6 Separated Stems with Sync Region Highlight, Manual Drag Selection & Clear Controls */}
            <StemMixer 
              stems={analysisResults.stems || []} 
              taskId={taskId} 
              activeSubRegion={activeSubRegion}
              onClearSubRegion={handleClearSubRegion}
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
