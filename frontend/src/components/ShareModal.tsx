import React, { useState } from 'react';
import { X, Share2, Copy, Check, Download, Box, FileText, Image as ImageIcon, HelpCircle, CheckCircle2 } from 'lucide-react';
import { useProjectStore } from '../store/useProjectStore';
import { ModelExporter } from '../three/ModelExporter';
import { triggerFileDownload, triggerBlobDownload } from '../utils/downloadHelper';

export const ShareModal: React.FC = () => {
  const isShareModalOpen = useProjectStore((s) => s.isShareModalOpen);
  const setShareModalOpen = useProjectStore((s) => s.setShareModalOpen);
  const project = useProjectStore((s) => s.project);
  const setViewerGuideOpen = useProjectStore((s) => s.setViewerGuideOpen);
  const setViewerGuideFormat = useProjectStore((s) => s.setViewerGuideFormat);

  const [copied, setCopied] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<string | null>(null);
  const [downloadSuccess, setDownloadSuccess] = useState<{ filename: string; format: string } | null>(null);

  if (!isShareModalOpen || !project) return null;

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const shareUrl = `${origin}/#project=${project.id}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportGLB = async () => {
    setIsExporting('glb');
    try {
      const blob = await ModelExporter.exportGLB(project);
      const filename = `${project.name.replace(/\s+/g, '_')}_3D.glb`;
      triggerBlobDownload(blob, filename);
      setDownloadSuccess({ filename, format: 'glb' });
    } catch (err: any) {
      alert(`GLB Export Error: ${err.message}`);
    } finally {
      setIsExporting(null);
    }
  };

  const handleExportDirect = async (format: string) => {
    setIsExporting(format);
    try {
      const res = await fetch(`/api/v1/plans/${project.id}/exports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.downloadUrl) {
          triggerFileDownload(data.downloadUrl, data.filename);
          setDownloadSuccess({ filename: data.filename, format });
        } else if (data.renders) {
          alert("4 High-Resolution PNG Renders generated! Check Downloads.");
        }
      } else {
        throw new Error(`Export failed (${res.status})`);
      }
    } catch (err: any) {
      alert(`Export error: ${err.message}`);
    } finally {
      setIsExporting(null);
    }
  };

  const openGuideFor = (fmt: string) => {
    setViewerGuideFormat(fmt);
    setViewerGuideOpen(true);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-xl max-h-[92vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-600/30 border border-indigo-500/50 flex items-center justify-center text-indigo-400 shrink-0">
              <Share2 size={18} />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-slate-100">Share & Export 3D Model</h3>
              <p className="text-[11px] sm:text-xs text-slate-400">Download blueprints, 3D files, or share interactive links</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => openGuideFor('glb')}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-400/40 text-sky-300 rounded text-xs transition-colors font-medium"
              title="How to view downloaded files locally"
            >
              <HelpCircle size={14} />
              <span className="hidden sm:inline">Viewer Guide</span>
            </button>
            <button
              onClick={() => setShareModalOpen(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-5 space-y-4 text-xs overflow-y-auto">
          {/* Share Link Box */}
          <div className="space-y-1.5">
            <label className="text-slate-300 font-semibold block text-[11px] uppercase tracking-wider">Interactive 3D Viewer Link</label>
            <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl p-1.5 pl-3">
              <span className="font-mono text-slate-400 truncate text-[11px] flex-1">
                {shareUrl}
              </span>
              <button
                onClick={handleCopyLink}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg flex items-center gap-1.5 text-xs transition-colors shrink-0"
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                <span>{copied ? 'Copied!' : 'Copy'}</span>
              </button>
            </div>
          </div>

          {/* Direct File Download Grid */}
          <div className="space-y-1.5 pt-2">
            <label className="text-slate-300 font-semibold block text-[11px] uppercase tracking-wider">Instant File Downloads</label>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* PDF Blueprint */}
              <button
                onClick={() => handleExportDirect('pdf')}
                disabled={isExporting !== null}
                className="p-3 rounded-xl border border-emerald-500/40 bg-emerald-950/20 hover:bg-emerald-950/40 hover:border-emerald-400 transition-all flex items-center justify-between text-left group"
              >
                <div className="flex items-center gap-2.5">
                  <FileText size={20} className="text-emerald-400 group-hover:scale-110 transition-transform" />
                  <div>
                    <div className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                      <span>Vector PDF</span>
                      <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1 py-0.2 rounded font-bold">A4 Plan</span>
                    </div>
                    <div className="text-[10px] text-slate-400">Blueprint with Title Block</div>
                  </div>
                </div>
                <Download size={14} className="text-slate-400 group-hover:text-emerald-400" />
              </button>

              {/* GLB 3D */}
              <button
                onClick={handleExportGLB}
                disabled={isExporting !== null}
                className="p-3 rounded-xl border border-slate-700/80 bg-slate-800/40 hover:bg-slate-800 hover:border-sky-500/60 transition-all flex items-center justify-between text-left group"
              >
                <div className="flex items-center gap-2.5">
                  <Box size={20} className="text-sky-400 group-hover:scale-110 transition-transform" />
                  <div>
                    <div className="text-xs font-bold text-slate-100">Standard GLB 3D</div>
                    <div className="text-[10px] text-slate-400">Web 3D, Blender, AR</div>
                  </div>
                </div>
                <Download size={14} className="text-slate-400 group-hover:text-sky-400" />
              </button>

              {/* OBJ 3D */}
              <button
                onClick={() => handleExportDirect('obj')}
                disabled={isExporting !== null}
                className="p-3 rounded-xl border border-slate-700/80 bg-slate-800/40 hover:bg-slate-800 hover:border-amber-500/60 transition-all flex items-center justify-between text-left group"
              >
                <div className="flex items-center gap-2.5">
                  <Box size={20} className="text-amber-400 group-hover:scale-110 transition-transform" />
                  <div>
                    <div className="text-xs font-bold text-slate-100">Wavefront OBJ</div>
                    <div className="text-[10px] text-slate-400">AutoCAD, SketchUp, 3ds Max</div>
                  </div>
                </div>
                <Download size={14} className="text-slate-400 group-hover:text-amber-400" />
              </button>

              {/* 4 PNG Renders */}
              <button
                onClick={() => handleExportDirect('renders')}
                disabled={isExporting !== null}
                className="p-3 rounded-xl border border-slate-700/80 bg-slate-800/40 hover:bg-slate-800 hover:border-cyan-500/60 transition-all flex items-center justify-between text-left group"
              >
                <div className="flex items-center gap-2.5">
                  <ImageIcon size={20} className="text-cyan-400 group-hover:scale-110 transition-transform" />
                  <div>
                    <div className="text-xs font-bold text-slate-100">4 PNG Renders</div>
                    <div className="text-[10px] text-slate-400">Brochures, WhatsApp</div>
                  </div>
                </div>
                <Download size={14} className="text-slate-400 group-hover:text-cyan-400" />
              </button>
            </div>
          </div>

          {/* Success Download Guide */}
          {downloadSuccess && (
            <div className="p-3 bg-emerald-950/60 border border-emerald-700/80 rounded-xl text-emerald-200 flex items-center justify-between gap-2 animate-in fade-in">
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
        <div className="p-3.5 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between">
          <button
            onClick={() => openGuideFor('glb')}
            className="text-xs text-sky-400 hover:text-sky-300 flex items-center gap-1"
          >
            <HelpCircle size={13} />
            <span>Need help opening 3D/CAD files locally?</span>
          </button>
          <button
            onClick={() => setShareModalOpen(false)}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};


