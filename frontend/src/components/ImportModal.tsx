import React, { useState } from 'react';
import { X, Upload, FileText, CheckCircle2, AlertTriangle, Layers, ArrowRight } from 'lucide-react';
import { useProjectStore } from '../store/useProjectStore';
import { toast } from './Toast';

export const ImportModal: React.FC = () => {
  const isImportModalOpen = useProjectStore((s) => s.isImportModalOpen);
  const setImportModalOpen = useProjectStore((s) => s.setImportModalOpen);
  const project = useProjectStore((s) => s.project);
  const activeFloorId = useProjectStore((s) => s.activeFloorId);
  const loadProject = useProjectStore((s) => s.loadProject);
  const setStatusMessage = useProjectStore((s) => s.setStatusMessage);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadedSource, setUploadedSource] = useState<any | null>(null);
  const [isExtracting, setIsExtracting] = useState<boolean>(false);
  const [extractionResult, setExtractionResult] = useState<any | null>(null);

  // Extraction options
  const [minLineLength, setMinLineLength] = useState<number>(25);
  const [maxLineGap, setMaxLineGap] = useState<number>(10);
  const [canny1, setCanny1] = useState<number>(50);
  const [canny2, setCanny2] = useState<number>(150);

  if (!isImportModalOpen || !project) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setUploadedSource(null);
      setExtractionResult(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setIsUploading(true);
    setStatusMessage('Uploading floor plan file...');

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const res = await fetch(`/api/projects/${project.id}/upload`, {
        method: 'POST',
        body: formData
      });

      if (!res.ok) {
        let errorMsg = `Upload failed (${res.status})`;
        try {
          const raw = await res.text();
          try {
            const err = JSON.parse(raw);
            errorMsg = err.detail || errorMsg;
          } catch {
            if (raw) errorMsg = raw.slice(0, 200);
          }
        } catch {}
        throw new Error(errorMsg);
      }

      const resText = await res.text();
      let data: any;
      try {
        data = JSON.parse(resText);
      } catch {
        throw new Error(resText.slice(0, 200) || 'Invalid response from server');
      }
      setUploadedSource(data);
      setStatusMessage(`File uploaded: ${data.filename} (${data.format.toUpperCase()})`);
      toast.success(`File uploaded: ${data.filename}`);
    } catch (err: any) {
      toast.error(`Upload error: ${err.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleExtract = async (applyToFloor: boolean) => {
    if (!uploadedSource) return;
    setIsExtracting(true);
    setStatusMessage('Running deterministic geometry extraction...');

    try {
      const payload: any = {
        fileId: uploadedSource.id,
        options: {
          minLineLength,
          maxLineGap,
          cannyThreshold1: canny1,
          cannyThreshold2: canny2
        }
      };

      if (applyToFloor) {
        payload.applyToFloorId = activeFloorId || project.floors[0].id;
      }

      const res = await fetch(`/api/projects/${project.id}/extract`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        let errorMsg = `Extraction failed (${res.status})`;
        try {
          const raw = await res.text();
          try {
            const err = JSON.parse(raw);
            errorMsg = err.detail || errorMsg;
          } catch {
            if (raw) errorMsg = raw.slice(0, 200);
          }
        } catch {}
        throw new Error(errorMsg);
      }

      const resText = await res.text();
      let data: any;
      try {
        data = JSON.parse(resText);
      } catch {
        throw new Error(resText.slice(0, 200) || 'Invalid response from extraction server');
      }
      setExtractionResult(data);

      if (applyToFloor) {
        await loadProject(project.id);
        setStatusMessage(`Successfully extracted ${data.wallsExtracted} walls and added to floor!`);
        toast.success(`Extracted ${data.wallsExtracted} walls and added to floor!`);
        setImportModalOpen(false);
      } else {
        setStatusMessage(`Extracted ${data.wallsExtracted} candidate walls.`);
        toast.info(`Extracted ${data.wallsExtracted} candidate walls.`);
      }
    } catch (err: any) {
      toast.error(`Extraction error: ${err.message}`);
    } finally {
      setIsExtracting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-cad-panel border border-cad-border w-full max-w-xl rounded-xl shadow-2xl flex flex-col overflow-hidden text-slate-100">
        {/* Header */}
        <div className="p-4 border-b border-cad-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Upload size={18} className="text-cad-accent" />
            <span className="font-bold text-base">Import Architectural Drawing</span>
          </div>
          <button
            onClick={() => setImportModalOpen(false)}
            className="text-slate-400 hover:text-slate-100 p-1 rounded"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-5 text-xs">
          {/* File Picker */}
          <div>
            <label className="block text-slate-300 font-semibold mb-2">
              Select 2D Floor Plan (DXF, SVG, PNG, JPG, PDF)
            </label>
            <div className="border-2 border-dashed border-cad-border hover:border-cad-accent rounded-lg p-6 text-center cursor-pointer transition-colors bg-cad-surface/50">
              <input
                type="file"
                accept=".dxf,.svg,.png,.jpg,.jpeg,.pdf"
                onChange={handleFileChange}
                className="hidden"
                id="floor-plan-file-input"
              />
              <label htmlFor="floor-plan-file-input" className="cursor-pointer flex flex-col items-center">
                <FileText size={32} className="text-slate-400 mb-2" />
                <span className="font-semibold text-slate-200">
                  {selectedFile ? selectedFile.name : 'Click to select or drop architectural drawing'}
                </span>
                <span className="text-[11px] text-slate-500 mt-1">
                  Supported: DXF (AutoCAD), SVG (Vector), JPG/PNG (Raster), PDF
                </span>
              </label>
            </div>
          </div>

          {/* Upload Button */}
          {selectedFile && !uploadedSource && (
            <div className="flex justify-end">
              <button
                onClick={handleUpload}
                disabled={isUploading}
                className="px-4 py-2 bg-cad-accent text-slate-950 font-bold rounded hover:bg-cad-accentHover disabled:opacity-50"
              >
                {isUploading ? 'Uploading...' : 'Process File'}
              </button>
            </div>
          )}

          {/* Uploaded Metadata */}
          {uploadedSource && (
            <div className="bg-cad-surface p-3 rounded-lg border border-cad-border space-y-2">
              <div className="flex items-center gap-2 text-emerald-400 font-bold">
                <CheckCircle2 size={16} /> File Ingested: {uploadedSource.filename}
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-300 font-mono">
                <div>Format: {uploadedSource.format.toUpperCase()}</div>
                <div>Size: {(uploadedSource.fileSize / 1024).toFixed(1)} KB</div>
                {uploadedSource.metadata?.width && (
                  <div>Dimensions: {uploadedSource.metadata.width} × {uploadedSource.metadata.height} px</div>
                )}
                {uploadedSource.metadata?.layers && (
                  <div>CAD Layers: {uploadedSource.metadata.layers.join(', ') || '0'}</div>
                )}
              </div>
            </div>
          )}

          {/* Extraction parameters for raster images */}
          {uploadedSource && ['png', 'jpg', 'jpeg'].includes(uploadedSource.format.toLowerCase()) && (
            <div className="p-3 bg-cad-surface/70 rounded border border-cad-border space-y-3">
              <span className="font-semibold text-slate-300">Deterministic Raster Filter Parameters</span>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 text-[10px] block">Min Line Length: {minLineLength}px</label>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    value={minLineLength}
                    onChange={(e) => setMinLineLength(parseInt(e.target.value))}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="text-slate-400 text-[10px] block">Max Line Gap: {maxLineGap}px</label>
                  <input
                    type="range"
                    min="2"
                    max="40"
                    value={maxLineGap}
                    onChange={(e) => setMaxLineGap(parseInt(e.target.value))}
                    className="w-full"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Extracted preview stats */}
          {extractionResult && (
            <div className="p-3 bg-emerald-950/40 border border-emerald-800 rounded text-emerald-300">
              <div className="font-bold mb-1">Extraction Complete:</div>
              <div>Walls Detected: {extractionResult.wallsExtracted}</div>
              <div>Rooms Detected: {extractionResult.roomsExtracted}</div>
            </div>
          )}
        </div>

        {/* Footer */}
        {uploadedSource && (
          <div className="p-4 border-t border-cad-border bg-cad-panel flex justify-between items-center">
            <button
              onClick={() => handleExtract(false)}
              disabled={isExtracting}
              className="px-3 py-2 bg-cad-surface border border-cad-border text-slate-200 rounded hover:bg-cad-border font-medium"
            >
              {isExtracting ? 'Analyzing...' : 'Preview Extraction'}
            </button>

            <button
              onClick={() => handleExtract(true)}
              disabled={isExtracting}
              className="px-4 py-2 bg-cad-accent hover:bg-cad-accentHover text-slate-950 font-bold rounded shadow flex items-center gap-2"
            >
              <span>Apply Walls to Active Floor</span>
              <ArrowRight size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

