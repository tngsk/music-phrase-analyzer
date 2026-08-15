interface Props {
  markdown: string;
  taskId: string | null;
}

export default function ReportViewer({ markdown, taskId }: Props) {
  
  const handleDownload = () => {
    if (!taskId) return;
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `report_${taskId}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-gray-800 p-4 rounded-lg">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Analysis Report (Markdown)</h2>
        <button 
          onClick={handleDownload} 
          className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-1 rounded text-sm transition"
        >
          Download .md
        </button>
      </div>
      <div className="bg-gray-900 p-4 rounded font-mono text-sm text-gray-300 h-64 overflow-y-auto whitespace-pre-wrap">
        {markdown || 'No report generated yet.'}
      </div>
    </div>
  )
}
