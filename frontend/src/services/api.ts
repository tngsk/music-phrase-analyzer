import { AnalysisRequest } from '../types/analysis';

const API_BASE_URL = 'http://localhost:8000';

export async function uploadAudio(file: File): Promise<{ file_id: string; filename: string }> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE_URL}/upload/`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error('Upload failed');
  }

  return response.json();
}

export async function analyzeAudio(request: AnalysisRequest): Promise<{ status: string; task_id: string; results: any; notes: any[]; stems: any[]; all_midi_url: string }> {
  const response = await fetch(`${API_BASE_URL}/analyze/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error('Analysis failed');
  }

  return response.json();
}

export async function reanalyzeHarmony(taskId: string, stems: string[]): Promise<{ status: string; harmony: any; selected_stems: string[] }> {
  const response = await fetch(`${API_BASE_URL}/analyze/harmony`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      task_id: taskId,
      stems: stems,
    }),
  });

  if (!response.ok) {
    throw new Error('Harmony re-analysis failed');
  }

  return response.json();
}

export async function getReport(taskId: string): Promise<{ status: string; report: string }> {
  const response = await fetch(`${API_BASE_URL}/export/report/${taskId}`);
  
  if (!response.ok) {
    throw new Error('Failed to get report');
  }

  return response.json();
}
