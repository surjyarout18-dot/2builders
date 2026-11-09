import React from 'react';
import { X, ExternalLink, HelpCircle, Box, FileText, Layers, Printer, Monitor, CheckCircle2, FolderDown } from 'lucide-react';
import { useProjectStore } from '../store/useProjectStore';

export const FileViewerGuideModal: React.FC = () => {
  const isOpen = useProjectStore((s) => s.isViewerGuideOpen);
  const setOpen = useProjectStore((s) => s.setViewerGuideOpen);
  const activeFormat = useProjectStore((s) => s.viewerGuideFormat) || 'glb';
  const setFormat = useProjectStore((s) => s.setViewerGuideFormat);

  if (!isOpen) return null;

  const formats = [
    { id: 'glb', label: 'GLB 3D', icon: Box, color: 'text-sky-400', badge: 'Recommended 3D' },
    { id: 'pdf', label: 'PDF Blueprint', icon: FileText, color: 'text-emerald-400', badge: 'Architectural Plan' },
    { id: 'obj', label: 'OBJ Mesh', icon: Box, color: 'text-amber-400', badge: 'CAD / Renderers' },
    { id: 'stl', label: 'STL Solid', icon: Printer, color: 'text-purple-400', badge: '3D Printing' },
    { id: 'dxf', label: 'DXF Vector', icon: Layers, color: 'text-blue-400', badge: 'AutoCAD / CNC' },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 bg-slate-950/70 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-sky-500/20 border border-sky-400/30 flex items-center justify-center text-sky-400">
              <HelpCircle size={20} />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-100 flex items-center gap-2">
                <span>How to View Your Downloaded Files Locally</span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full font-bold">
                  Free Viewers
                </span>
              </h3>
              <p className="text-xs text-slate-400">Open 3D models, CAD drawings, and blueprints on Windows, Mac, or online</p>
            </div>
          </div>

          <button
            onClick={() => setOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Quick Location Tip */}
        <div className="px-5 py-2.5 bg-sky-950/40 border-b border-sky-800/40 flex items-center justify-between text-xs text-sky-200">
          <div className="flex items-center gap-2">
            <FolderDown size={16} className="text-sky-400 shrink-0" />
            <span>Downloaded files are saved in your default <strong>Downloads</strong> folder.</span>
          </div>
          <span className="text-[11px] font-mono bg-sky-900/60 px-2 py-0.5 rounded border border-sky-700/60 text-sky-300">
            Windows: Ctrl + J | Mac: Cmd + Option + L
          </span>
        </div>

        {/* Format Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 px-3 pt-2 gap-1 overflow-x-auto">
          {formats.map((fmt) => {
            const Icon = fmt.icon;
            const isSelected = activeFormat.toLowerCase() === fmt.id.toLowerCase();
            return (
              <button
                key={fmt.id}
                onClick={() => setFormat(fmt.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-t-lg text-xs font-semibold transition-all border-b-2 whitespace-nowrap ${
                  isSelected
                    ? 'border-sky-400 bg-slate-800 text-slate-100 shadow'
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                <Icon size={14} className={fmt.color} />
                <span>{fmt.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="p-5 overflow-y-auto max-h-[60vh] space-y-4 text-xs">
          {/* GLB TAB */}
          {activeFormat.toLowerCase() === 'glb' && (
            <div className="space-y-4">
              <div className="p-3.5 bg-sky-950/30 border border-sky-800/50 rounded-xl">
                <h4 className="font-bold text-sky-300 text-sm mb-1 flex items-center gap-1.5">
                  <Box size={16} />
                  <span>GLB (.glb) — Binary glTF 2.0 (Standard 3D Format)</span>
                </h4>
                <p className="text-slate-300 text-xs leading-relaxed">
                  GLB is the universal 3D standard for web, AR, gaming, and architectural visualization. Contains meshes, materials, and lighting.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3 bg-slate-800/60 border border-slate-700/80 rounded-xl space-y-1.5">
                  <div className="font-bold text-slate-200 flex items-center gap-1.5">
                    <Monitor size={14} className="text-blue-400" />
                    <span>Windows 10 & 11 (Built-in)</span>
                  </div>
                  <p className="text-slate-400 text-[11px] leading-relaxed">
                    Double-click the downloaded <strong className="text-slate-200">.glb</strong> file. Windows includes the free <strong>3D Viewer</strong> app pre-installed. It opens instantly with interactive orbit, zoom, and lighting controls!
                  </p>
                </div>

                <div className="p-3 bg-slate-800/60 border border-slate-700/80 rounded-xl space-y-1.5">
                  <div className="font-bold text-slate-200 flex items-center gap-1.5">
                    <Monitor size={14} className="text-slate-300" />
                    <span>macOS (Built-in Quick Look)</span>
                  </div>
                  <p className="text-slate-400 text-[11px] leading-relaxed">
                    Select the file in Finder and press the <kbd className="bg-slate-700 px-1.5 py-0.5 rounded text-[10px] text-slate-200">Spacebar</kbd>. macOS displays the 3D model natively with full rotation!
                  </p>
                </div>
              </div>

              {/* Free Online Web Viewer Links */}
              <div className="p-3.5 bg-slate-800/40 border border-slate-700/60 rounded-xl space-y-2">
                <div className="font-bold text-slate-200 flex items-center gap-1.5">
                  <ExternalLink size={14} className="text-emerald-400" />
                  <span>Free Instant Browser Viewers (No install needed)</span>
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  <a
                    href="https://gltf-viewer.donmccurdy.com/"
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-600/30 hover:bg-sky-600/50 border border-sky-500/50 text-sky-200 font-semibold rounded-lg transition-colors text-xs"
                  >
                    <span>glTF Viewer (Don McCurdy)</span>
                    <ExternalLink size={12} />
                  </a>
                  <a
                    href="https://3dviewer.net/"
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 border border-slate-600 text-slate-200 font-semibold rounded-lg transition-colors text-xs"
                  >
                    <span>3DViewer.net</span>
                    <ExternalLink size={12} />
                  </a>
                </div>
                <p className="text-slate-400 text-[11px]">
                  💡 Simply drag & drop your downloaded <strong>.glb</strong> file directly into either viewer to inspect in full 3D!
                </p>
              </div>
            </div>
          )}

          {/* PDF TAB */}
          {activeFormat.toLowerCase() === 'pdf' && (
            <div className="space-y-4">
              <div className="p-3.5 bg-emerald-950/30 border border-emerald-800/50 rounded-xl">
                <h4 className="font-bold text-emerald-300 text-sm mb-1 flex items-center gap-1.5">
                  <FileText size={16} />
                  <span>PDF (.pdf) — 2D Architectural Vector Blueprint</span>
                </h4>
                <p className="text-slate-300 text-xs leading-relaxed">
                  Generated in standard ISO A4 Landscape vector format. Includes precision title block, room schedule table, wall thickness, door/window cutouts, and technical scale bar.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3 bg-slate-800/60 border border-slate-700/80 rounded-xl space-y-1.5">
                  <div className="font-bold text-slate-200 flex items-center gap-1.5">
                    <CheckCircle2 size={14} className="text-emerald-400" />
                    <span>Any Web Browser</span>
                  </div>
                  <p className="text-slate-400 text-[11px] leading-relaxed">
                    Double-click the downloaded <strong className="text-slate-200">.pdf</strong> file. Google Chrome, Microsoft Edge, and Safari will render the vector blueprint immediately with crisp infinite zoom.
                  </p>
                </div>

                <div className="p-3 bg-slate-800/60 border border-slate-700/80 rounded-xl space-y-1.5">
                  <div className="font-bold text-slate-200 flex items-center gap-1.5">
                    <Printer size={14} className="text-purple-400" />
                    <span>Print to Scale (A4)</span>
                  </div>
                  <p className="text-slate-400 text-[11px] leading-relaxed">
                    Open in Adobe Acrobat or browser, press <kbd className="bg-slate-700 px-1 rounded text-[10px] text-slate-200">Ctrl + P</kbd>, select <strong>Actual Size (100%)</strong> or "Fit to Page" for standard blueprints.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* OBJ TAB */}
          {activeFormat.toLowerCase() === 'obj' && (
            <div className="space-y-4">
              <div className="p-3.5 bg-amber-950/30 border border-amber-800/50 rounded-xl">
                <h4 className="font-bold text-amber-300 text-sm mb-1 flex items-center gap-1.5">
                  <Box size={16} />
                  <span>OBJ (.obj) — Wavefront 3D Solid Polygon Mesh</span>
                </h4>
                <p className="text-slate-300 text-xs leading-relaxed">
                  Universal 3D geometry format supported by every CAD, BIM, and 3D modeling application in the world.
                </p>
              </div>

              <div className="space-y-2 text-slate-300">
                <div className="p-3 bg-slate-800/60 border border-slate-700/80 rounded-xl">
                  <div className="font-bold text-slate-200 mb-1">Recommended Free Software:</div>
                  <ul className="list-disc list-inside space-y-1 text-slate-400 text-[11px]">
                    <li><strong>Windows 10/11:</strong> Open with <strong>Paint 3D</strong> or <strong>3D Builder</strong>.</li>
                    <li><strong>Blender (Free & Open Source):</strong> File &gt; Import &gt; Wavefront (.obj) for advanced rendering.</li>
                    <li><strong>SketchUp & 3ds Max:</strong> Compatible via standard OBJ import.</li>
                    <li><strong>Free Online Viewer:</strong> Drag and drop into <a href="https://3dviewer.net/" target="_blank" rel="noreferrer" className="text-sky-400 underline font-semibold">3dviewer.net</a>.</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* STL TAB */}
          {activeFormat.toLowerCase() === 'stl' && (
            <div className="space-y-4">
              <div className="p-3.5 bg-purple-950/30 border border-purple-800/50 rounded-xl">
                <h4 className="font-bold text-purple-300 text-sm mb-1 flex items-center gap-1.5">
                  <Printer size={16} />
                  <span>STL (.stl) — Stereolithography (3D Printing Ready)</span>
                </h4>
                <p className="text-slate-300 text-xs leading-relaxed">
                  Triangulated mesh solid designed for 3D slicers and physical architectural scale model fabrication.
                </p>
              </div>

              <div className="p-3 bg-slate-800/60 border border-slate-700/80 rounded-xl space-y-1.5">
                <div className="font-bold text-slate-200">How to Open & Slice:</div>
                <ul className="list-disc list-inside space-y-1 text-slate-400 text-[11px]">
                  <li><strong>Windows 3D Builder:</strong> Double-click the file to inspect and check for watertight solids.</li>
                  <li><strong>Ultimaker Cura / PrusaSlicer / Bambu Studio:</strong> Import directly to set scale (e.g. 1:100 or 1:50) and print.</li>
                </ul>
              </div>
            </div>
          )}

          {/* DXF TAB */}
          {activeFormat.toLowerCase() === 'dxf' && (
            <div className="space-y-4">
              <div className="p-3.5 bg-blue-950/30 border border-blue-800/50 rounded-xl">
                <h4 className="font-bold text-blue-300 text-sm mb-1 flex items-center gap-1.5">
                  <Layers size={16} />
                  <span>DXF (.dxf) — Drawing Exchange Format (AutoCAD & CAD)</span>
                </h4>
                <p className="text-slate-300 text-xs leading-relaxed">
                  Precision 2D CAD vectors organized into dedicated layers: <code className="bg-slate-800 px-1 text-sky-300 font-mono">WALLS</code>, <code className="bg-slate-800 px-1 text-amber-300 font-mono">DOORS</code>, <code className="bg-slate-800 px-1 text-sky-300 font-mono">WINDOWS</code>, and <code className="bg-slate-800 px-1 text-emerald-300 font-mono">ROOMS</code>.
                </p>
              </div>

              <div className="p-3 bg-slate-800/60 border border-slate-700/80 rounded-xl space-y-1.5">
                <div className="font-bold text-slate-200">Recommended Free CAD Viewers:</div>
                <ul className="list-disc list-inside space-y-1 text-slate-400 text-[11px]">
                  <li><strong>Autodesk DWG TrueView:</strong> Free official Autodesk viewer.</li>
                  <li><strong>LibreCAD / QCAD / FreeCAD:</strong> 100% free open-source CAD software.</li>
                  <li><strong>Autodesk Online Viewer:</strong> Upload free at <a href="https://viewer.autodesk.com/" target="_blank" rel="noreferrer" className="text-sky-400 underline font-semibold">viewer.autodesk.com</a>.</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between">
          <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
            <CheckCircle2 size={14} className="text-emerald-400" />
            <span>All exported files are DRM-free and ready for production use.</span>
          </div>

          <button
            onClick={() => setOpen(false)}
            className="px-4 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-slate-950 font-bold text-xs transition-colors"
          >
            Got it, thanks!
          </button>
        </div>
      </div>
    </div>
  );
};

