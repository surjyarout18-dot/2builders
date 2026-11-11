import React, { useState } from 'react';
import { X, Download, Box, Layers, Code, CheckCircle2, FileText, Printer, HelpCircle, Crown, Sparkles } from 'lucide-react';
import { useProjectStore } from '../store/useProjectStore';
import { ModelExporter } from '../three/ModelExporter';
import { triggerFileDownload } from '../utils/downloadHelper';
import { toast } from './Toast';

export const ExportModal: React.FC = () => {
  const isExportModalOpen = useProjectStore((s) => s.isExportModalOpen);
  const setExportModalOpen = useProjectStore((s) => s.setExportModalOpen);
  const project = useProjectStore((s) => s.project);
  const setStatusMessage = useProjectStore((s) => s.setStatusMessage);
  const setViewerGuideOpen = useProjectStore((s) => s.setViewerGuideOpen);
  const setViewerGuideFormat = useProjectStore((s) => s.setViewerGuideFormat);
  const setPremiumModalOpen = useProjectStore((s) => s.setPremiumModalOpen);

  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [downloadSuccess, setDownloadSuccess] = useState<{ filename: string; format: string } | null>(null);

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

      setDownloadSuccess({ filename, format: 'glb' });
      setStatusMessage(`Exported ${filename}`);
      toast.success(`Exported ${filename}`);
    } catch (err: any) {
      toast.error(`GLB Export Error: ${err.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  const handleServerExport = async (format: 'pdf' | 'obj' | 'stl' | 'dxf' | 'svg' | 'json') => {
    setIsExporting(true);
    setStatusMessage(`Generating ${format.toUpperCase()} export...`);
    try {
      const res = await fetch(`/api/projects/${project.id}/export?format=${format}`, {
        method: 'POST'
      });
      if (!res.ok) throw new Error("Export generation failed on server");
      const data = await res.json();
      
      // Trigger instant clean download
      triggerFileDownload(data.downloadUrl, data.filename);
      setDownloadSuccess({ filename: data.filename, format });
      setStatusMessage(`Exported ${data.filename}`);
      toast.success(`Exported ${data.filename}`);
    } catch (err: any) {
      toast.error(`Export error: ${err.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  const openGuideFor = (fmt: string) => {
    setViewerGuideFormat(fmt);
    setViewerGuideOpen(true);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-cad-panel border border-cad-border w-full max-w-xl rounded-xl shadow-2xl flex flex-col overflow-hidden text-slate-100 max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-cad-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Download size={18} className="text-emerald-400" />
            <span className="font-bold text-base">Export Architectural Models & Blueprints</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => openGuideFor('glb')}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-400/40 text-sky-300 rounded text-xs transition-colors font-medium"
              title="How to view downloaded files locally"
            >
              <HelpCircle size={14} />
              <span>Viewer Guide</span>
            </button>
            <button
              onClick={() => setExportModalOpen(false)}
              className="text-slate-400 hover:text-slate-100 p-1 rounded"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 space-y-3.5 text-xs overflow-y-auto">
          <p className="text-slate-400">
            Export the generated structural building model into standard 3D CAD, BIM, 3D printing, and architectural vector formats:
          </p>

          <div className="grid grid-cols-1 gap-2.5">
            {/* PDF Blueprint Card */}
            <div className="p-3 bg-cad-surface border border-emerald-500/30 hover:border-emerald-400 rounded-lg flex items-center justify-between transition-colors">
              <div className="flex items-center gap-3">
                <FileText size={24} className="text-emerald-400 shrink-0" />
                <div>
                  <div className="font-bold text-slate-100 text-sm flex items-center gap-2">
                    <span>PDF (2D Architectural Blueprint)</span>
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded font-bold border border-emerald-500/40">
                      Standard Vector
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400">ISO A4 Landscape with title block, dimensions & room schedule</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => openGuideFor('pdf')}
                  className="p-1.5 text-slate-400 hover:text-sky-300"
                  title="How to view PDF"
                >
                  <HelpCircle size={15} />
                </button>
                <button
                  onClick={() => handleServerExport('pdf')}
                  disabled={isExporting}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded shadow shrink-0 transition-colors"
                >
                  Export PDF
                </button>
              </div>
            </div>

            {/* GLB Card */}
            <div className="p-3 bg-cad-surface border border-cad-border hover:border-cad-accent rounded-lg flex items-center justify-between transition-colors">
              <div className="flex items-center gap-3">
                <Box size={24} className="text-cad-accent shrink-0" />
                <div>
                  <div className="font-bold text-slate-100 text-sm">GLB (Binary glTF 2.0)</div>
                  <div className="text-[11px] text-slate-400">Recommended for web 3D, Blender, Three.js, Windows 3D Viewer</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => openGuideFor('glb')}
                  className="p-1.5 text-slate-400 hover:text-sky-300"
                  title="How to view GLB"
                >
                  <HelpCircle size={15} />
                </button>
                <button
                  onClick={handleExportGLB}
                  disabled={isExporting}
                  className="px-3.5 py-1.5 bg-cad-accent hover:bg-cad-accentHover text-slate-950 font-bold rounded shadow shrink-0"
                >
                  Export GLB
                </button>
              </div>
            </div>

            {/* OBJ Card */}
            <div className="p-3 bg-cad-surface border border-cad-border hover:border-cad-accent rounded-lg flex items-center justify-between transition-colors">
              <div className="flex items-center gap-3">
                <Box size={24} className="text-blue-400 shrink-0" />
                <div>
                  <div className="font-bold text-slate-100 text-sm">OBJ (Wavefront Mesh)</div>
                  <div className="text-[11px] text-slate-400">Universal 3D geometry compatible with AutoCAD, SketchUp, 3ds Max</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => openGuideFor('obj')}
                  className="p-1.5 text-slate-400 hover:text-sky-300"
                  title="How to view OBJ"
                >
                  <HelpCircle size={15} />
                </button>
                <button
                  onClick={() => handleServerExport('obj')}
                  disabled={isExporting}
                  className="px-3.5 py-1.5 bg-cad-surface hover:bg-cad-border border border-cad-border text-slate-100 font-semibold rounded shrink-0"
                >
                  Export OBJ
                </button>
              </div>
            </div>

            {/* STL Card */}
            <div className="p-3 bg-cad-surface border border-cad-border hover:border-cad-accent rounded-lg flex items-center justify-between transition-colors">
              <div className="flex items-center gap-3">
                <Printer size={24} className="text-purple-400 shrink-0" />
                <div>
                  <div className="font-bold text-slate-100 text-sm">STL (Stereolithography)</div>
                  <div className="text-[11px] text-slate-400">Triangulated solids optimized for 3D architectural scale printing</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => openGuideFor('stl')}
                  className="p-1.5 text-slate-400 hover:text-sky-300"
                  title="How to view STL"
                >
                  <HelpCircle size={15} />
                </button>
                <button
                  onClick={() => handleServerExport('stl')}
                  disabled={isExporting}
                  className="px-3.5 py-1.5 bg-cad-surface hover:bg-cad-border border border-cad-border text-slate-100 font-semibold rounded shrink-0"
                >
                  Export STL
                </button>
              </div>
            </div>

            {/* DXF Card */}
            <div className="p-3 bg-cad-surface border border-cad-border hover:border-cad-accent rounded-lg flex items-center justify-between transition-colors">
              <div className="flex items-center gap-3">
                <Layers size={24} className="text-amber-400 shrink-0" />
                <div>
                  <div className="font-bold text-slate-100 text-sm">DXF (AutoCAD Drawing)</div>
                  <div className="text-[11px] text-slate-400">Layered 2D CAD vectors (WALLS, DOORS, WINDOWS, ROOMS)</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => openGuideFor('dxf')}
                  className="p-1.5 text-slate-400 hover:text-sky-300"
                  title="How to view DXF"
                >
                  <HelpCircle size={15} />
                </button>
                <button
                  onClick={() => handleServerExport('dxf')}
                  disabled={isExporting}
                  className="px-3.5 py-1.5 bg-cad-surface hover:bg-cad-border border border-cad-border text-slate-100 font-semibold rounded shrink-0"
                >
                  Export DXF
                </button>
              </div>
            </div>

            {/* SVG Card */}
            <div className="p-3 bg-cad-surface border border-cad-border hover:border-cad-accent rounded-lg flex items-center justify-between transition-colors">
              <div className="flex items-center gap-3">
                <FileText size={24} className="text-cyan-400 shrink-0" />
                <div>
                  <div className="font-bold text-slate-100 text-sm">SVG (Vector Blueprint)</div>
                  <div className="text-[11px] text-slate-400">Scalable vector graphics with architectural grid underlay</div>
                </div>
              </div>
              <button
                onClick={() => handleServerExport('svg')}
                disabled={isExporting}
                className="px-3.5 py-1.5 bg-cad-surface hover:bg-cad-border border border-cad-border text-slate-100 font-semibold rounded shrink-0"
              >
                Export SVG
              </button>
            </div>

            {/* JSON Card */}
            <div className="p-3 bg-cad-surface border border-cad-border hover:border-cad-accent rounded-lg flex items-center justify-between transition-colors">
              <div className="flex items-center gap-3">
                <Code size={24} className="text-emerald-400 shrink-0" />
                <div>
                  <div className="font-bold text-slate-100 text-sm">JSON (2builders Schema)</div>
                  <div className="text-[11px] text-slate-400">Full normalized geometric snapshot backup</div>
                </div>
              </div>
              <button
                onClick={() => handleServerExport('json')}
                disabled={isExporting}
                className="px-3.5 py-1.5 bg-cad-surface hover:bg-cad-border border border-cad-border text-slate-100 font-semibold rounded shrink-0"
              >
                Export JSON
              </button>
            </div>
          </div>

          {/* 100% Free Commercial Export Banner */}
          <div className="p-3 bg-gradient-to-r from-emerald-950/40 via-slate-900 to-emerald-950/40 border border-emerald-500/40 rounded-xl flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <Sparkles size={18} className="text-emerald-400 shrink-0" />
              <div>
                <span className="font-bold text-white">All Exports Are 100% Free & Unwatermarked</span>
                <p className="text-[11px] text-slate-400">AutoCAD DXF, ISO A4 vector PDF blueprints, GLB, and OBJ with full commercial rights</p>
              </div>
            </div>
            <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold rounded text-[11px]">
              FREE FOREVER
            </span>
          </div>

          {downloadSuccess && (
            <div className="p-3 bg-emerald-950/60 border border-emerald-700/80 rounded-lg text-emerald-200 flex items-center justify-between gap-2 animate-in fade-in">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                <span>Downloaded <strong>{downloadSuccess.filename}</strong>!</span>
              </div>
              <button
                onClick={() => openGuideFor(downloadSuccess.format)}
                className="px-2.5 py-1 bg-emerald-600/40 hover:bg-emerald-600/60 border border-emerald-500/60 text-emerald-100 rounded text-[11px] font-bold flex items-center gap-1 transition-colors"
              >
                <HelpCircle size={13} />
                <span>How to open?</span>
              </button>
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
