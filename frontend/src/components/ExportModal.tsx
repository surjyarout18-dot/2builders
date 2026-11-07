import React, { useState } from 'react';
import { X, Download, Box, Layers, Code, CheckCircle2 } from 'lucide-react';
import { useProjectStore } from '../store/useProjectStore';
import { ModelExporter } from '../three/ModelExporter';

export const ExportModal: React.FC = () => {
  const isExportModalOpen = useProjectStore((s) => s.isExportModalOpen);
  const setExportModalOpen = useProjectStore((s) => s.setExportModalOpen);
  const project = useProjectStore((s) => s.project);
  const setStatusMessage = useProjectStore((s) => s.setStatusMessage);

  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);

  if (!isExportModalOpen || !project) return null;

  const handleExportGLB = async () => {
    setIsExporting(true);
    setStatusMessage('Generating GLB 3D model...');
    try {
      const blob = await ModelExporter.exportGLB(project);
      const filename = `${project.name.replace(/\s+/g, '_')}_model.glb`;
      ModelExporter.downloadBlob(blob, filename);

      // Also send a copy to server for history
      const formData = new FormData();
      formData.append('file', blob, filename);
      fetch(`/api/projects/${project.id}/upload-glb`, { method: 'POST', body: formData }).catch(() => {});

      setDownloadSuccess(`Downloaded ${filename} successfully!`);
      setStatusMessage(`Exported ${filename}`);
    } catch (err: any) {
      alert(`GLB Export Error: ${err.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  const handleServerExport = async (format: 'obj' | 'stl' | 'dxf' | 'json') => {
    setIsExporting(true);
    setStatusMessage(`Generating ${format.toUpperCase()} export...`);
    try {
      const res = await fetch(`/api/projects/${project.id}/export?format=${format}`, {
        method: 'POST'
      });
      if (!res.ok) throw new Error("Export failed on server");
      const data = await res.json();
      
      // Trigger download
      window.open(data.downloadUrl, '_blank');
      setDownloadSuccess(`Downloaded ${data.filename} (${format.toUpperCase()})`);
      setStatusMessage(`Exported ${data.filename}`);
    } catch (err: any) {
      alert(`Export error: ${err.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-cad-panel border border-cad-border w-full max-w-lg rounded-xl shadow-2xl flex flex-col overflow-hidden text-slate-100">
        {/* Header */}
        <div className="p-4 border-b border-cad-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Download size={18} className="text-emerald-400" />
            <span className="font-bold text-base">Export Architectural Models & Drawings</span>
          </div>
          <button
            onClick={() => setExportModalOpen(false)}
            className="text-slate-400 hover:text-slate-100 p-1 rounded"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 text-xs">
          <p className="text-slate-400">
            Export the generated structural building model into standard 3D CAD, BIM, and rendering formats:
          </p>

          <div className="grid grid-cols-1 gap-3">
            {/* GLB Card */}
            <div className="p-3 bg-cad-surface border border-cad-border hover:border-cad-accent rounded-lg flex items-center justify-between transition-colors">
              <div className="flex items-center gap-3">
                <Box size={24} className="text-cad-accent" />
                <div>
                  <div className="font-bold text-slate-100 text-sm">GLB (Binary glTF 2.0)</div>
                  <div className="text-[11px] text-slate-400">Recommended for web 3D, Blender, Three.js, AR/VR</div>
                </div>
              </div>
              <button
                onClick={handleExportGLB}
                disabled={isExporting}
                className="px-3 py-1.5 bg-cad-accent hover:bg-cad-accentHover text-slate-950 font-bold rounded shadow shrink-0"
              >
                Export GLB
              </button>
            </div>

            {/* OBJ Card */}
            <div className="p-3 bg-cad-surface border border-cad-border hover:border-cad-accent rounded-lg flex items-center justify-between transition-colors">
              <div className="flex items-center gap-3">
                <Box size={24} className="text-blue-400" />
                <div>
                  <div className="font-bold text-slate-100 text-sm">OBJ (Wavefront Mesh)</div>
                  <div className="text-[11px] text-slate-400">Universal 3D geometry compatible with all CAD tools</div>
                </div>
              </div>
              <button
                onClick={() => handleServerExport('obj')}
                disabled={isExporting}
                className="px-3 py-1.5 bg-cad-surface hover:bg-cad-border border border-cad-border text-slate-100 font-semibold rounded shrink-0"
              >
                Export OBJ
              </button>
            </div>

            {/* STL Card */}
            <div className="p-3 bg-cad-surface border border-cad-border hover:border-cad-accent rounded-lg flex items-center justify-between transition-colors">
              <div className="flex items-center gap-3">
                <Box size={24} className="text-purple-400" />
                <div>
                  <div className="font-bold text-slate-100 text-sm">STL (Stereolithography)</div>
                  <div className="text-[11px] text-slate-400">Triangulated solids optimized for 3D architectural printing</div>
                </div>
              </div>
              <button
                onClick={() => handleServerExport('stl')}
                disabled={isExporting}
                className="px-3 py-1.5 bg-cad-surface hover:bg-cad-border border border-cad-border text-slate-100 font-semibold rounded shrink-0"
              >
                Export STL
              </button>
            </div>

            {/* DXF Card */}
            <div className="p-3 bg-cad-surface border border-cad-border hover:border-cad-accent rounded-lg flex items-center justify-between transition-colors">
              <div className="flex items-center gap-3">
                <Layers size={24} className="text-amber-400" />
                <div>
                  <div className="font-bold text-slate-100 text-sm">DXF (AutoCAD Drawing)</div>
                  <div className="text-[11px] text-slate-400">Layered 2D vectors (WALLS, DOORS, WINDOWS, ROOMS)</div>
                </div>
              </div>
              <button
                onClick={() => handleServerExport('dxf')}
                disabled={isExporting}
                className="px-3 py-1.5 bg-cad-surface hover:bg-cad-border border border-cad-border text-slate-100 font-semibold rounded shrink-0"
              >
                Export DXF
              </button>
            </div>

            {/* JSON Card */}
            <div className="p-3 bg-cad-surface border border-cad-border hover:border-cad-accent rounded-lg flex items-center justify-between transition-colors">
              <div className="flex items-center gap-3">
                <Code size={24} className="text-emerald-400" />
                <div>
                  <div className="font-bold text-slate-100 text-sm">JSON (2builders Schema)</div>
                  <div className="text-[11px] text-slate-400">Full normalized geometric snapshot backup</div>
                </div>
              </div>
              <button
                onClick={() => handleServerExport('json')}
                disabled={isExporting}
                className="px-3 py-1.5 bg-cad-surface hover:bg-cad-border border border-cad-border text-slate-100 font-semibold rounded shrink-0"
              >
                Export JSON
              </button>
            </div>
          </div>

          {downloadSuccess && (
            <div className="p-3 bg-emerald-950/40 border border-emerald-800 rounded text-emerald-300 flex items-center gap-2">
              <CheckCircle2 size={16} />
              <span>{downloadSuccess}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-cad-border flex justify-end">
          <button
            onClick={() => setExportModalOpen(false)}
            className="px-4 py-1.5 bg-cad-surface hover:bg-cad-border border border-cad-border text-slate-300 font-medium rounded"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

