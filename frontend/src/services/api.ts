import { ArchitecturalModel } from '../types/architectural';

const API_BASE = '/api/v1';

export async function createProjectApi(name: string = "Modern Architectural Plan") {
  const res = await fetch(`${API_BASE}/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name })
  });
  if (!res.ok) throw new Error('Failed to create project');
  return res.json();
}

export async function uploadFloorPlanApi(projectId: string, file: File) {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${API_BASE}/projects/${projectId}/upload`, {
    method: 'POST',
    body: formData
  });
  if (!res.ok) throw new Error('Failed to upload floor plan image');
  return res.json();
}

export async function analyzeFloorPlanApi(projectId: string, scaleMetersPerPixel: number = 0.02): Promise<ArchitecturalModel> {
  const res = await fetch(`${API_BASE}/projects/${projectId}/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scale_meters_per_pixel: scaleMetersPerPixel })
  });
  if (!res.ok) throw new Error('Failed to run AI floor plan analysis');
  return res.json();
}

export async function calibrateScaleApi(projectId: string, pixelDist: number, realMeters: number) {
  const res = await fetch(`${API_BASE}/projects/${projectId}/calibrate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pixel_distance: pixelDist, real_meters: realMeters })
  });
  if (!res.ok) throw new Error('Failed to calibrate scale');
  return res.json();
}

export async function getModelApi(projectId: string): Promise<ArchitecturalModel> {
  const res = await fetch(`${API_BASE}/projects/${projectId}/model`);
  if (!res.ok) throw new Error('Failed to fetch architectural model');
  return res.json();
}

export async function updateModelApi(projectId: string, model: ArchitecturalModel): Promise<ArchitecturalModel> {
  const res = await fetch(`${API_BASE}/projects/${projectId}/model`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(model)
  });
  if (!res.ok) throw new Error('Failed to update model');
  return res.json();
}

export async function chatAssistantApi(projectId: string, prompt: string) {
  const res = await fetch(`${API_BASE}/assistant/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ project_id: projectId, prompt })
  });
  if (!res.ok) throw new Error('Failed to query assistant');
  return res.json();
}
