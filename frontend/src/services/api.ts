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

export interface GeneratePlanOptions {
  prompt?: string;
  plot_width?: number;
  plot_depth?: number;
  target_area_sqm?: number;
  building_type?: string;
  bedrooms_count?: number;
  bathrooms_count?: number;
  style?: string;
  orientation?: string;
}

export async function generateCandidatePlansApi(options: GeneratePlanOptions): Promise<{ count: number; candidates: ArchitecturalModel[] }> {
  const res = await fetch(`${API_BASE}/generate-plan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(options)
  });
  if (!res.ok) throw new Error('Failed to generate algorithmic floor plans');
  return res.json();
}

export async function getCheckpointsApi(projectId: string) {
  const res = await fetch(`${API_BASE}/projects/${projectId}/checkpoints`);
  if (!res.ok) throw new Error('Failed to fetch checkpoints');
  return res.json();
}

export async function createCheckpointApi(projectId: string, name: string, changeSummary?: string) {
  const res = await fetch(`${API_BASE}/projects/${projectId}/checkpoints`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, change_summary: changeSummary })
  });
  if (!res.ok) throw new Error('Failed to save checkpoint');
  return res.json();
}

export async function restoreCheckpointApi(projectId: string, checkpointId: string) {
  const res = await fetch(`${API_BASE}/projects/${projectId}/restore-checkpoint/${checkpointId}`, {
    method: 'POST'
  });
  if (!res.ok) throw new Error('Failed to restore checkpoint');
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

export async function enhanceRealismApi(
  model: ArchitecturalModel,
  style: string = "contemporary_warm",
  orientation: string = "south",
  day_night: string = "day"
): Promise<ArchitecturalModel> {
  const res = await fetch(`${API_BASE}/agents/enhance-realism`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      project_id: model.project_id,
      model,
      style,
      orientation,
      day_night
    })
  });
  if (!res.ok) throw new Error('Failed to execute Realism Agent enhancement');
  return res.json();
}

export async function downloadBlenderScriptApi(projectId: string): Promise<string> {
  const res = await fetch(`${API_BASE}/projects/${projectId}/export/blender-script`, {
    method: 'POST'
  });
  if (!res.ok) throw new Error('Failed to export Blender Python scene script');
  return res.text();
}
