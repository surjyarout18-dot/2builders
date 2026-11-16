import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Download,
  FileText,
  X,
  Layers,
  Sparkles,
  ShieldCheck,
  TrendingUp,
  Percent
} from 'lucide-react';
import { useFloorPlanStore } from '../../store/useFloorPlanStore';
import { exportCSV, exportArchitecturalPDF } from '../../utils/exporter';

interface ScheduleTakeoffsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ScheduleTakeoffsModal: React.FC<ScheduleTakeoffsModalProps> = ({
  isOpen,
  onClose
}) => {
  const { model, unitSystem, toggleUnitSystem } = useFloorPlanStore();
  const [activeTab, setActiveTab] = useState<'rooms' | 'finishes' | 'components'>('rooms');

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

  const floor = model.floors[0] || { rooms: [], walls: [], doors: [], windows: [] };

  // Calculate totals
  let totalAreaM2 = 0;
  let totalAreaSqft = 0;
  floor.rooms.forEach((r) => {
    totalAreaM2 += r.area_sqm;
    totalAreaSqft += r.area_sqft;
  });

  let totalWallLength = 0;
  let totalWallFaceM2 = 0;
  floor.walls.forEach((w) => {
    const dx = w.end.x - w.start.x;
    const dz = w.end.z - w.start.z;
    const len = Math.sqrt(dx * dx + dz * dz);
    totalWallLength += len;
    totalWallFaceM2 += len * w.height;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="flex h-[88vh] w-full max-w-5xl flex-col rounded-2xl border border-[#1F2942] bg-[#111726] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#1F2942] bg-[#0A0D14]/80 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#00F0FF]/15 text-[#00F0FF]">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-[#F1F5F9]">Architectural Schedules & Quantity Takeoffs</h2>
                <span className="flex items-center gap-1 rounded-full bg-[#10B981]/15 px-2 py-0.5 text-[10px] font-semibold text-[#10B981]">
                  <ShieldCheck className="h-3 w-3" />
                  BIM Takeoffs • 100% Free
                </span>
              </div>
              <p className="text-xs text-[#94A3B8]">
                Real-time room calculations, wall footprints, finish areas with +10% waste estimation
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Unit Switcher */}
            <button
              onClick={toggleUnitSystem}
              className="flex items-center gap-1.5 rounded-lg border border-[#1F2942] bg-[#161F33] px-3 py-1.5 text-xs font-mono font-bold text-[#00F0FF] hover:border-[#00F0FF]"
            >
              <span>{unitSystem === 'metric' ? 'Metric (m, m²)' : 'Imperial (ft, sqft)'}</span>
            </button>

            {/* Export Actions */}
            <button
              onClick={() => exportCSV(model)}
              className="flex items-center gap-1.5 rounded-lg bg-[#10B981] px-3 py-1.5 text-xs font-bold text-[#0A0D14] shadow-md shadow-[#10B981]/20 hover:bg-[#0EA271] transition-all"
            >
              <Download className="h-4 w-4" />
              <span>Export CSV</span>
            </button>

            <button
              onClick={() => exportArchitecturalPDF(model)}
              className="flex items-center gap-1.5 rounded-lg border border-[#00F0FF]/40 bg-[#00F0FF]/10 px-3 py-1.5 text-xs font-bold text-[#00F0FF] hover:bg-[#00F0FF]/20 transition-all"
            >
              <FileText className="h-4 w-4" />
              <span>Print PDF</span>
            </button>

            <button
              onClick={onClose}
              className="ml-2 flex h-8 w-8 items-center justify-center rounded-lg text-[#94A3B8] hover:bg-[#1F2942] hover:text-[#F1F5F9] transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Top Summary Cards */}
        <div className="grid grid-cols-4 gap-4 border-b border-[#1F2942] bg-[#0D121F] p-4 text-xs">
          <div className="rounded-xl border border-[#1F2942] bg-[#161F33] p-3">
            <span className="text-[10px] text-[#94A3B8] uppercase tracking-wider font-mono">Net Floor Area</span>
            <div className="mt-1 text-base font-mono font-bold text-[#00F0FF]">
              {unitSystem === 'metric' ? `${totalAreaM2.toFixed(1)} m²` : `${totalAreaSqft.toFixed(0)} sqft`}
            </div>
            <span className="text-[10px] text-[#64748B]">{floor.rooms.length} enclosed spaces</span>
          </div>

          <div className="rounded-xl border border-[#1F2942] bg-[#161F33] p-3">
            <span className="text-[10px] text-[#94A3B8] uppercase tracking-wider font-mono">Total Wall Perimeter</span>
            <div className="mt-1 text-base font-mono font-bold text-[#F1F5F9]">
              {unitSystem === 'metric' ? `${totalWallLength.toFixed(1)} m` : `${(totalWallLength * 3.28084).toFixed(1)} ft`}
            </div>
            <span className="text-[10px] text-[#64748B]">{floor.walls.length} wall segments</span>
          </div>

          <div className="rounded-xl border border-[#1F2942] bg-[#161F33] p-3">
            <span className="text-[10px] text-[#94A3B8] uppercase tracking-wider font-mono">Wall Surface (Paint/Plaster)</span>
            <div className="mt-1 text-base font-mono font-bold text-[#F59E0B]">
              {unitSystem === 'metric' ? `${totalWallFaceM2.toFixed(1)} m²` : `${(totalWallFaceM2 * 10.7639).toFixed(0)} sqft`}
            </div>
            <span className="text-[10px] text-[#64748B]">Both face calculations</span>
          </div>

          <div className="rounded-xl border border-[#1F2942] bg-[#161F33] p-3">
            <span className="text-[10px] text-[#94A3B8] uppercase tracking-wider font-mono">Finishes (+10% Waste)</span>
            <div className="mt-1 text-base font-mono font-bold text-[#10B981]">
              {unitSystem === 'metric' ? `${(totalAreaM2 * 1.10).toFixed(1)} m²` : `${(totalAreaSqft * 1.10).toFixed(0)} sqft`}
            </div>
            <span className="text-[10px] text-[#64748B]">Procurement quantity</span>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b border-[#1F2942] bg-[#0A0D14] px-6">
          <button
            onClick={() => setActiveTab('rooms')}
            className={`border-b-2 px-4 py-3 text-xs font-bold transition-all ${
              activeTab === 'rooms'
                ? 'border-[#00F0FF] text-[#00F0FF]'
                : 'border-transparent text-[#94A3B8] hover:text-[#F1F5F9]'
            }`}
          >
            Room Area Schedule
          </button>
          <button
            onClick={() => setActiveTab('finishes')}
            className={`border-b-2 px-4 py-3 text-xs font-bold transition-all ${
              activeTab === 'finishes'
                ? 'border-[#00F0FF] text-[#00F0FF]'
                : 'border-transparent text-[#94A3B8] hover:text-[#F1F5F9]'
            }`}
          >
            Finish Takeoffs (+10% Waste)
          </button>
          <button
            onClick={() => setActiveTab('components')}
            className={`border-b-2 px-4 py-3 text-xs font-bold transition-all ${
              activeTab === 'components'
                ? 'border-[#00F0FF] text-[#00F0FF]'
                : 'border-transparent text-[#94A3B8] hover:text-[#F1F5F9]'
            }`}
          >
            Components & Fenestration
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-[#0A0D14]">
          {activeTab === 'rooms' && (
            <div className="rounded-xl border border-[#1F2942] bg-[#111726] overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#161F33] text-[11px] font-mono uppercase text-[#94A3B8]">
                  <tr>
                    <th className="px-4 py-3">Room Name</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Area (m²)</th>
                    <th className="px-4 py-3">Area (sq ft)</th>
                    <th className="px-4 py-3">Floor Finish</th>
                    <th className="px-4 py-3">Wall Color</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1F2942]">
                  {floor.rooms.map((rm) => (
                    <tr key={rm.id} className="hover:bg-[#161F33]/50">
                      <td className="px-4 py-3 font-semibold text-[#F1F5F9]">{rm.name}</td>
                      <td className="px-4 py-3 text-[#94A3B8]">{rm.room_type}</td>
                      <td className="px-4 py-3 font-mono text-[#00F0FF]">{rm.area_sqm.toFixed(1)} m²</td>
                      <td className="px-4 py-3 font-mono text-[#CBD5E1]">{rm.area_sqft.toFixed(1)} sqft</td>
                      <td className="px-4 py-3 text-[#CBD5E1]">{rm.floor_material.replace(/_/g, ' ')}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5">
                          <span
                            className="h-3 w-3 rounded-full border border-white/20"
                            style={{ backgroundColor: rm.wall_color }}
                          />
                          <span className="font-mono text-[11px] text-[#94A3B8]">{rm.wall_color}</span>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'finishes' && (
            <div className="rounded-xl border border-[#1F2942] bg-[#111726] overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#161F33] text-[11px] font-mono uppercase text-[#94A3B8]">
                  <tr>
                    <th className="px-4 py-3">Material Category</th>
                    <th className="px-4 py-3">Material Type</th>
                    <th className="px-4 py-3">Net Area</th>
                    <th className="px-4 py-3">Allowance Factor</th>
                    <th className="px-4 py-3 text-[#10B981]">Total Takeoff (+10% Waste)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1F2942]">
                  {floor.rooms.map((rm) => (
                    <tr key={rm.id} className="hover:bg-[#161F33]/50">
                      <td className="px-4 py-3 font-semibold text-[#F1F5F9]">{rm.name} Flooring</td>
                      <td className="px-4 py-3 text-[#94A3B8]">{rm.floor_material.replace(/_/g, ' ')}</td>
                      <td className="px-4 py-3 font-mono text-[#CBD5E1]">
                        {unitSystem === 'metric' ? `${rm.area_sqm.toFixed(1)} m²` : `${rm.area_sqft.toFixed(1)} sqft`}
                      </td>
                      <td className="px-4 py-3 text-[#94A3B8]">+10% Cut Waste</td>
                      <td className="px-4 py-3 font-mono font-bold text-[#10B981]">
                        {unitSystem === 'metric'
                          ? `${(rm.area_sqm * 1.10).toFixed(1)} m²`
                          : `${(rm.area_sqft * 1.10).toFixed(1)} sqft`}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-[#161F33]/70 font-semibold">
                    <td className="px-4 py-3 text-[#F1F5F9]">Vertical Wall Drywall / Paint</td>
                    <td className="px-4 py-3 text-[#94A3B8]">Architectural Interior Paint</td>
                    <td className="px-4 py-3 font-mono text-[#CBD5E1]">
                      {unitSystem === 'metric' ? `${totalWallFaceM2.toFixed(1)} m²` : `${(totalWallFaceM2 * 10.7639).toFixed(0)} sqft`}
                    </td>
                    <td className="px-4 py-3 text-[#94A3B8]">+10% Surface Factor</td>
                    <td className="px-4 py-3 font-mono font-bold text-[#10B981]">
                      {unitSystem === 'metric'
                        ? `${(totalWallFaceM2 * 1.10).toFixed(1)} m²`
                        : `${(totalWallFaceM2 * 10.7639 * 1.10).toFixed(0)} sqft`}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'components' && (
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-xl border border-[#1F2942] bg-[#111726] p-4">
                <h4 className="text-xs font-bold text-[#F1F5F9] mb-3">Doors & Openings ({floor.doors.length})</h4>
                <div className="space-y-2">
                  {floor.doors.map((d) => (
                    <div key={d.id} className="flex items-center justify-between rounded-lg bg-[#161F33] p-2 text-xs">
                      <span className="font-semibold text-[#F1F5F9]">{d.id}</span>
                      <span className="font-mono text-[#00F0FF]">{d.width}m × {d.height}m</span>
                      <span className="text-[#94A3B8]">{d.door_type} ({d.swing_direction})</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-[#1F2942] bg-[#111726] p-4">
                <h4 className="text-xs font-bold text-[#F1F5F9]">Windows ({floor.windows.length})</h4>
                <div className="space-y-2">
                  {floor.windows.map((w) => (
                    <div key={w.id} className="flex items-center justify-between rounded-lg bg-[#161F33] p-2 text-xs">
                      <span className="font-semibold text-[#F1F5F9]">{w.id}</span>
                      <span className="font-mono text-[#00F0FF]">{w.width}m × {w.height}m</span>
                      <span className="text-[#94A3B8]">Sill: {w.sill_height}m ({w.window_type})</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
