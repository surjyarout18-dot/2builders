import React, { useState } from 'react';
import { X, Ruler, CheckCircle2, Calculator } from 'lucide-react';
import { useProjectStore } from '../store/useProjectStore';
import { UnitType } from '../types';
import { toast } from './Toast';

export const CalibrationModal: React.FC = () => {
  const isCalibrateModalOpen = useProjectStore((s) => s.isCalibrateModalOpen);
  const setCalibrateModalOpen = useProjectStore((s) => s.setCalibrateModalOpen);
  const project = useProjectStore((s) => s.project);
  const loadProject = useProjectStore((s) => s.loadProject);
  const setStatusMessage = useProjectStore((s) => s.setStatusMessage);

  const [p1X, setP1X] = useState<number>(0);
  const [p1Y, setP1Y] = useState<number>(0);
  const [p2X, setP2X] = useState<number>(500);
  const [p2Y, setP2Y] = useState<number>(0);
  const [realDistance, setRealDistance] = useState<number>(5.0);
  const [unit, setUnit] = useState<UnitType>(project?.unit || 'meters');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [resultMessage, setResultMessage] = useState<string | null>(null);

  if (!isCalibrateModalOpen || !project) return null;

  const pixelDistance = Math.hypot(p2X - p1X, p2Y - p1Y);
  const calculatedScale = pixelDistance > 0 ? (realDistance / pixelDistance) : 0;

  const handleSave = async () => {
    if (pixelDistance <= 0 || realDistance <= 0) {
      toast.error("Please enter a valid real-world distance greater than 0");
      return;
    }
    setIsSaving(true);
    try {
      const res = await fetch(`/api/projects/${project.id}/calibrate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          point1: [p1X, p1Y],
          point2: [p2X, p2Y],
          realDistance,
          unit
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Calibration failed');
      }

      const data = await res.json();
      setResultMessage(data.message);
      setStatusMessage(data.message);
      toast.success(data.message || 'Calibration saved!');
      await loadProject(project.id);
    } catch (err: any) {
      toast.error(`Error saving calibration: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-cad-panel border border-cad-border w-full max-w-md rounded-xl shadow-2xl flex flex-col overflow-hidden text-slate-100">
        {/* Header */}
        <div className="p-4 border-b border-cad-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Ruler size={18} className="text-yellow-400" />
            <span className="font-bold text-base">Scale Calibration Wizard</span>
          </div>
          <button
            onClick={() => setCalibrateModalOpen(false)}
            className="text-slate-400 hover:text-slate-100 p-1 rounded"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 text-xs">
          <p className="text-slate-400 leading-relaxed">
            Calibrate the exact ratio between drawing pixels and real-world architectural distance:
          </p>

          <div className="bg-cad-surface p-3 rounded border border-cad-border space-y-3">
            <span className="font-semibold text-slate-300">Point 1 (Pixels)</span>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-slate-500">X1</label>
                <input
                  type="number"
                  value={p1X}
                  onChange={(e) => setP1X(parseFloat(e.target.value) || 0)}
                  className="w-full bg-cad-panel border border-cad-border rounded p-1.5 font-mono"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-500">Y1</label>
                <input
                  type="number"
                  value={p1Y}
                  onChange={(e) => setP1Y(parseFloat(e.target.value) || 0)}
                  className="w-full bg-cad-panel border border-cad-border rounded p-1.5 font-mono"
                />
              </div>
            </div>
          </div>

          <div className="bg-cad-surface p-3 rounded border border-cad-border space-y-3">
            <span className="font-semibold text-slate-300">Point 2 (Pixels)</span>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-slate-500">X2</label>
                <input
                  type="number"
                  value={p2X}
                  onChange={(e) => setP2X(parseFloat(e.target.value) || 0)}
                  className="w-full bg-cad-panel border border-cad-border rounded p-1.5 font-mono"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-500">Y2</label>
                <input
                  type="number"
                  value={p2Y}
                  onChange={(e) => setP2Y(parseFloat(e.target.value) || 0)}
                  className="w-full bg-cad-panel border border-cad-border rounded p-1.5 font-mono"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 mb-1">Real Distance</label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                value={realDistance}
                onChange={(e) => setRealDistance(parseFloat(e.target.value) || 1)}
                className="w-full bg-cad-surface border border-cad-border rounded p-2 text-slate-100 font-mono font-bold"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">Unit</label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value as UnitType)}
                className="w-full bg-cad-surface border border-cad-border rounded p-2 text-slate-100 font-bold"
              >
                <option value="meters">Meters (m)</option>
                <option value="millimeters">Millimeters (mm)</option>
                <option value="centimeters">Centimeters (cm)</option>
                <option value="feet">Feet (ft)</option>
                <option value="inches">Inches (in)</option>
              </select>
            </div>
          </div>

          <div className="p-3 bg-cad-dark border border-cad-border rounded font-mono text-center space-y-1">
            <div className="text-slate-400">
              Pixel Distance: <span className="text-slate-200">{pixelDistance.toFixed(1)} px</span>
            </div>
            <div className="text-cad-accent font-bold">
              Scale = {calculatedScale.toFixed(6)} {unit}/px
            </div>
          </div>

          {resultMessage && (
            <div className="p-2.5 bg-emerald-950/50 border border-emerald-800 rounded text-emerald-300 flex items-center gap-2">
              <CheckCircle2 size={16} />
              <span>{resultMessage}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-cad-border flex justify-end gap-2">
          <button
            onClick={() => setCalibrateModalOpen(false)}
            className="px-3 py-1.5 bg-cad-surface hover:bg-cad-border rounded text-slate-300"
          >
            Close
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-1.5 bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-bold rounded shadow"
          >
            {isSaving ? 'Calibrating...' : 'Apply Scale'}
          </button>
        </div>
      </div>
    </div>
  );
};

