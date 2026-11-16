import React from 'react';
import {
  Download,
  Box,
  FileCode,
  FileText,
  FileSpreadsheet,
  Layers,
  X,
  Sparkles,
  ShieldCheck,
  Video,
  Cpu
} from 'lucide-react';
import { useFloorPlanStore } from '../../store/useFloorPlanStore';
import { downloadBlenderScriptApi, exportD5RenderApi } from '../../services/api';
import {
  exportGLB,
  exportOBJ,
  exportDXF,
  exportSVG,
  exportArchitecturalPDF,
  exportCSV,
  downloadFile
} from '../../utils/exporter';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose }) => {
  const { model } = useFloorPlanStore();

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleExportD5 = async () => {
    try {
      const bundle = await exportD5RenderApi(model.project_id);
      downloadFile(bundle.obj_content, `${model.name.replace(/\s+/g, '_')}_D5.obj`, 'text/plain');
      downloadFile(bundle.mtl_content, `${model.name.replace(/\s+/g, '_')}_D5.mtl`, 'text/plain');
    } catch (e) {
      exportOBJ(model);
    }
  };

  const handleExportBlender = async () => {
    try {
      const script = await downloadBlenderScriptApi(model.project_id);
      downloadFile(script, `${model.name.replace(/\s+/g, '_')}_blender.py`, 'text/x-python');
    } catch (e) {
      console.error(e);
    }
  };

  const exportFormats = [
    {
      id: 'd5',
      title: 'D5 Render & Unreal Engine (.obj + .mtl)',
      desc: 'Configured for real-time ray-tracing, DLSS 3.5 reconstruction and PBR materials',
      icon: <Cpu className="h-6 w-6 text-[#00F0FF]" />,
      action: handleExportD5,
      badge: 'D5 Ray-Tracing'
    },
    {
      id: 'blender',
      title: 'Blender 4.x Production Script (.py)',
      desc: 'Automated Python scene generator with Cycles path-tracer, PBR nodes & OIDN denoiser',
      icon: <Video className="h-6 w-6 text-[#F59E0B]" />,
      action: handleExportBlender,
      badge: 'Cycles Engine'
    },
    {
      id: 'glb',
      title: '3D Binary glTF (.glb)',
      desc: 'Industry-standard 3D asset for Blender, Unreal Engine, Unity & Web viewers',
      icon: <Box className="h-6 w-6 text-[#00F0FF]" />,
      action: () => exportGLB(model),
      badge: '3D Standard'
    },
    {
      id: 'csv',
      title: 'Quantity Takeoffs & Schedules (.csv)',
      desc: 'Room areas, finish takeoffs (+10% waste), linear wall meters, door/window schedules',
      icon: <FileSpreadsheet className="h-6 w-6 text-[#10B981]" />,
      action: () => exportCSV(model),
      badge: 'BIM / Estimates'
    },
    {
      id: 'dxf',
      title: 'AutoCAD Vector (.dxf)',
      desc: 'Precision 2D CAD drawing format for AutoCAD, Revit, ArchiCAD & CNC cutting',
      icon: <FileText className="h-6 w-6 text-[#F59E0B]" />,
      action: () => exportDXF(model),
      badge: 'CAD Vector'
    },
    {
      id: 'pdf',
      title: 'Architectural Spec Sheet (.pdf)',
      desc: 'Professional multi-page blueprint report with room schedules and dimensions',
      icon: <FileText className="h-6 w-6 text-[#0284C7]" />,
      action: () => exportArchitecturalPDF(model),
      badge: 'Print Blueprint'
    },
    {
      id: 'obj',
      title: 'Wavefront 3D (.obj)',
      desc: 'Universal 3D mesh format with material indices and normals',
      icon: <FileCode className="h-6 w-6 text-[#A855F7]" />,
      action: () => exportOBJ(model),
      badge: '3D Universal'
    },
    {
      id: 'svg',
      title: 'Scalable Vector Graphic (.svg)',
      desc: 'Crisp vector diagram for design documentation, web presentations and SVG plots',
      icon: <Layers className="h-6 w-6 text-[#EC4899]" />,
      action: () => exportSVG(model),
      badge: 'Vector Diagram'
    },
    {
      id: 'json',
      title: 'Canonical Geometry JSON',
      desc: 'Complete parametric architectural JSON schema for backup and API integration',
      icon: <FileCode className="h-6 w-6 text-[#94A3B8]" />,
      action: () => downloadFile(JSON.stringify(model, null, 2), `${model.name}.json`, 'application/json'),
      badge: 'Raw Schema'
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-2xl rounded-2xl border border-[#1F2942] bg-[#111726] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#1F2942] px-6 py-4 bg-[#0A0D14]/80">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#00F0FF]/15 text-[#00F0FF]">
              <Download className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-[#F1F5F9]">Export Architectural Model</h2>
                <span className="flex items-center gap-1 rounded-full bg-[#10B981]/15 px-2 py-0.5 text-[10px] font-semibold text-[#10B981]">
                  <ShieldCheck className="h-3 w-3" />
                  100% Free Forever
                </span>
              </div>
              <p className="text-xs text-[#94A3B8]">Download unwatermarked 3D meshes, CAD vectors, and estimation schedules</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[#94A3B8] hover:bg-[#1F2942] hover:text-[#F1F5F9] transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Export Formats Grid */}
        <div className="p-6 max-h-[75vh] overflow-y-auto space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {exportFormats.map((fmt) => (
              <button
                key={fmt.id}
                onClick={() => {
                  fmt.action();
                }}
                className="group flex flex-col justify-between rounded-xl border border-[#1F2942] bg-[#161F33]/60 p-4 text-left transition-all hover:border-[#00F0FF]/50 hover:bg-[#161F33] hover:shadow-lg hover:shadow-[#00F0FF]/5"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="p-2 rounded-lg bg-[#0A0D14] border border-[#1F2942] group-hover:border-[#00F0FF]/30 transition-colors">
                      {fmt.icon}
                    </div>
                    <span className="rounded-md bg-[#1F2942] px-2 py-0.5 text-[10px] font-mono font-medium text-[#94A3B8]">
                      {fmt.badge}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-[#F1F5F9] group-hover:text-[#00F0FF] transition-colors">
                    {fmt.title}
                  </h3>
                  <p className="mt-1 text-xs text-[#94A3B8] leading-relaxed">
                    {fmt.desc}
                  </p>
                </div>
                <div className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-[#00F0FF] opacity-80 group-hover:opacity-100">
                  <Download className="h-3.5 w-3.5" />
                  <span>Download file</span>
                </div>
              </button>
            ))}
          </div>

          <div className="rounded-xl border border-[#1F2942]/60 bg-[#0A0D14]/60 p-3.5 text-xs text-[#94A3B8] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[#00F0FF]" />
              <span>All exports retain exact metric coordinate fidelity and closed geometry.</span>
            </div>
            <span className="font-mono text-[11px] text-[#64748B]">2builders Engine</span>
          </div>
        </div>
      </div>
    </div>
  );
};
