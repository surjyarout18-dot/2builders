import React from 'react';
import {
  Download,
  Box,
  FileCode,
  FileText,
  FileSpreadsheet,
  CheckCircle2,
  X,
  Sparkles
} from 'lucide-react';
import { useFloorPlanStore } from '../../store/useFloorPlanStore';
import {
  exportGLB,
  exportOBJ,
  exportDXF,
  exportSVG,
  exportArchitecturalPDF,
  downloadFile
} from '../../utils/exporter';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose }) => {
  const { model } = useFloorPlanStore();

  if (!isOpen) return null;

  const exportFormats = [
    {
      id: 'glb',
      title: '3D Binary glTF (.glb)',
      desc: 'Industry-standard 3D format for Blender, Unity, Unreal Engine & Web viewers',
      icon: <Box className="h-6 w-6 text-[#00F0FF]" />,
      action: () => exportGLB(model),
      badge: '3D Standard'
    },
    {
      id: 'obj',
      title: 'Wavefront 3D (.obj)',
      desc: 'Universal 3D mesh format with material indices and normals',
      icon: <FileCode className="h-6 w-6 text-[#10B981]" />,
      action: () => exportOBJ(model),
      badge: '3D Universal'
    },
    {
      id: 'dxf',
      title: 'AutoCAD Vector (.dxf)',
      desc: '2D CAD drawing format for AutoCAD, Revit, ArchiCAD and CNC cutting',
      icon: <FileText className="h-6 w-6 text-[#F59E0B]" />,
      action: () => exportDXF(model),
      badge: 'CAD Vector'
    },
    {
      id: 'svg',
      title: 'Scalable Vector (.svg)',
      desc: 'Crisp vector blueprint diagram for documentation and presentations',
      icon: <FileSpreadsheet className="h-6 w-6 text-[#EC4899]" />,
      action: () => exportSVG(model),
      badge: 'Vector'
    },
    {
      id: 'pdf',
      title: 'Architectural Spec Sheet (.pdf)',
      desc: 'Professional project report with room schedules, dimensions and areas',
      icon: <FileText className="h-6 w-6 text-[#0284C7]" />,
      action: () => exportArchitecturalPDF(model),
      badge: 'Report'
    },
    {
      id: 'json',
      title: 'Canonical Geometry JSON',
      desc: 'Parametric architectural JSON schema for backup and API integration',
      icon: <FileCode className="h-6 w-6 text-[#94A3B8]" />,
      action: () => downloadFile(JSON.stringify(model, null, 2), `${model.name}.json`, 'application/json'),
      badge: 'Raw Schema'
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl rounded-2xl border border-[#1F2942] bg-[#111726] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#1F2942] px-6 py-4 bg-[#0A0D14]/70">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#00F0FF]/10 text-[#00F0FF]">
              <Download className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-[#F1F5F9]">Export Architectural Model</h2>
                <span className="flex items-center gap-1 rounded-full bg-[#10B981]/15 px-2 py-0.5 text-[10px] font-semibold text-[#10B981]">
                  <Sparkles className="h-3 w-3" />
                  100% Free Forever
                </span>
              </div>
              <p className="text-xs text-[#94A3B8]">Download unwatermarked 3D meshes, CAD vectors, and specification sheets</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-[#94A3B8] hover:bg-[#1F2942] hover:text-[#F1F5F9]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Export Formats Grid */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[65vh] overflow-y-auto">
          {exportFormats.map((fmt) => (
            <div
              key={fmt.id}
              className="flex flex-col justify-between rounded-xl border border-[#1F2942] bg-[#161F33]/70 p-4 transition-all hover:border-[#00F0FF]/50 hover:bg-[#161F33]"
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#0A0D14]">
                    {fmt.icon}
                  </div>
                  <span className="rounded bg-[#1F2942] px-2 py-0.5 font-mono text-[10px] text-[#94A3B8]">
                    {fmt.badge}
                  </span>
                </div>
                <h3 className="mt-3 text-sm font-semibold text-[#F1F5F9]">{fmt.title}</h3>
                <p className="mt-1 text-xs text-[#94A3B8] leading-relaxed">{fmt.desc}</p>
              </div>

              <button
                onClick={() => {
                  fmt.action();
                  onClose();
                }}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-[#00F0FF] py-2 text-xs font-bold text-[#0A0D14] hover:bg-[#00D1DF] transition-all shadow-md shadow-[#00F0FF]/10"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Download File</span>
              </button>
            </div>
          ))}
        </div>

        {/* Footer Guarantee */}
        <div className="border-t border-[#1F2942] bg-[#0A0D14]/90 px-6 py-3 flex items-center justify-between text-xs text-[#94A3B8]">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-[#10B981]" />
            <span>No paywalls • Commercial use permitted • All tools included</span>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg px-3 py-1 font-medium hover:text-[#F1F5F9]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
