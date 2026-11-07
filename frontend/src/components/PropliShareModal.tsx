import React, { useState } from 'react';
import { useProjectStore } from '../store/useProjectStore';
import { Share2, Copy, Check, Download, ExternalLink, X, Image as ImageIcon, FileText, Box } from 'lucide-react';
import { ModelExporter } from '../three/ModelExporter';

export const PropliShareModal: React.FC = () => {
  const isShareModalOpen = useProjectStore((s) => s.isShareModalOpen);
  const setShareModalOpen = useProjectStore((s) => s.setShareModalOpen);
  const project = useProjectStore((s) => s.project);
  const propliPlan = useProjectStore((s) => s.propliPlan);

  const [copied, setCopied] = useState(false);
  const [shareUrl, setShareUrl] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExporting, setIsExporting] = useState<string | null>(null);

  if (!isShareModalOpen || !project) return null;

  const handleGenerateShare = async () => {
    setIsGenerating(true);
    try {
      const res = await fetch(`/api/v1/plans/${project.id}/share`, {
        method: 'POST'
      });
      if (res.ok) {
        const data = await res.json();
        setShareUrl(data.fullUrl || `${window.location.origin}${data.shareUrl}`);
      }
    } catch (err) {
      setShareUrl(`${window.location.origin}/share/${project.id}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    const url = shareUrl || `${window.location.origin}/share/${project.id}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportGLB = async () => {
    setIsExporting('glb');
    try {
      const blob = await ModelExporter.exportGLB(project);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${project.name.replace(/\s+/g, '_')}_3D.glb`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
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
          window.open(data.downloadUrl, '_blank');
        } else if (data.renders) {
          alert("4 High-Resolution PNG Renders generated! Check Downloads.");
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsExporting(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-xl rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-600/30 border border-indigo-500/50 flex items-center justify-center text-indigo-400">
              <Share2 size={18} />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-100">Share & Export 3D Model</h3>
              <p className="text-xs text-slate-400">Send an interactive 3D link or download standard 3D/CAD files</p>
            </div>
          </div>

          <button
            onClick={() => setShareModalOpen(false)}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Share Link Generator */}
        <div className="p-5 flex flex-col gap-4 border-b border-slate-800 bg-slate-950/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Public 3D Web Link</span>
            <span className="text-[10px] text-emerald-400 font-semibold bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full">
              Interactive 3D Viewer
            </span>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={shareUrl || `${window.location.origin}/share/${project.id}`}
              className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-300 font-mono select-all focus:outline-none focus:border-sky-500"
            />
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95"
            >
              {copied ? <Check size={14} className="text-emerald-300" /> : <Copy size={14} />}
              <span>{copied ? 'Copied!' : 'Copy Link'}</span>
            </button>
          </div>
        </div>

        {/* Export Options Grid */}
        <div className="p-5 flex flex-col gap-3">
          <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Download Formats</span>

          <div className="grid grid-cols-2 gap-3">
            {/* GLB 3D */}
            <button
              onClick={handleExportGLB}
              disabled={isExporting !== null}
              className="p-3 rounded-xl border border-slate-700/80 bg-slate-800/40 hover:bg-slate-800 hover:border-sky-500/60 transition-all flex items-center justify-between text-left group"
            >
              <div className="flex items-center gap-2.5">
                <Box size={20} className="text-sky-400 group-hover:scale-110 transition-transform" />
                <div>
                  <div className="text-xs font-bold text-slate-100">GLB 3D Model</div>
                  <div className="text-[10px] text-slate-400">Web, Android AR, Blender</div>
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
                  <div className="text-[10px] text-slate-400">SketchUp, 3ds Max, CAD</div>
                </div>
              </div>
              <Download size={14} className="text-slate-400 group-hover:text-amber-400" />
            </button>

            {/* 4 PNG Renders */}
            <button
              onClick={() => handleExportDirect('renders')}
              disabled={isExporting !== null}
              className="p-3 rounded-xl border border-slate-700/80 bg-slate-800/40 hover:bg-slate-800 hover:border-emerald-500/60 transition-all flex items-center justify-between text-left group"
            >
              <div className="flex items-center gap-2.5">
                <ImageIcon size={20} className="text-emerald-400 group-hover:scale-110 transition-transform" />
                <div>
                  <div className="text-xs font-bold text-slate-100">4 PNG Renders</div>
                  <div className="text-[10px] text-slate-400">Brochures, WhatsApp</div>
                </div>
              </div>
              <Download size={14} className="text-slate-400 group-hover:text-emerald-400" />
            </button>

            {/* 2D Plan PDF */}
            <button
              onClick={() => handleExportDirect('svg')}
              disabled={isExporting !== null}
              className="p-3 rounded-xl border border-slate-700/80 bg-slate-800/40 hover:bg-slate-800 hover:border-purple-500/60 transition-all flex items-center justify-between text-left group"
            >
              <div className="flex items-center gap-2.5">
                <FileText size={20} className="text-purple-400 group-hover:scale-110 transition-transform" />
                <div>
                  <div className="text-xs font-bold text-slate-100">Clean 2D Plan PDF</div>
                  <div className="text-[10px] text-slate-400">Architectural Vector Blueprint</div>
                </div>
              </div>
              <Download size={14} className="text-slate-400 group-hover:text-purple-400" />
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3.5 bg-slate-950/80 border-t border-slate-800 text-right">
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

