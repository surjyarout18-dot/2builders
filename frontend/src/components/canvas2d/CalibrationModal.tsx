import React, { useState } from 'react';
import { Ruler, Check, X } from 'lucide-react';
import { useFloorPlanStore } from '../../store/useFloorPlanStore';

interface CalibrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  pixelDistance?: number;
}

export const CalibrationModal: React.FC<CalibrationModalProps> = ({
  isOpen,
  onClose,
  pixelDistance = 200
}) => {
  const { setCalibration, model } = useFloorPlanStore();
  const [pixels, setPixels] = useState<number>(pixelDistance);
  const [realMeters, setRealMeters] = useState<number>(5.0);
  const [unit, setUnit] = useState<'meters' | 'feet'>('meters');

  if (!isOpen) return null;

  const currentScale = model.calibration.meters_per_pixel;
  const calculatedScale = realMeters > 0 && pixels > 0 ? (unit === 'feet' ? realMeters * 0.3048 : realMeters) / pixels : currentScale;

  const handleApply = () => {
    const meters = unit === 'feet' ? realMeters * 0.3048 : realMeters;
    setCalibration(pixels, meters);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-xl border border-[#1F2942] bg-[#111726] p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#1F2942] pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#00F0FF]/10 text-[#00F0FF]">
              <Ruler className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-[#F1F5F9]">Scale Calibration</h3>
              <p className="text-xs text-[#94A3B8]">Convert drawing pixels to real architectural dimensions</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-[#94A3B8] hover:bg-[#1F2942] hover:text-[#F1F5F9]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-5 space-y-4">
          <div>
            <label className="block text-xs font-medium uppercase tracking-wider text-[#94A3B8]">
              Reference Pixel Distance
            </label>
            <input
              type="number"
              value={pixels}
              onChange={(e) => setPixels(parseFloat(e.target.value) || 0)}
              className="mt-1.5 w-full rounded-lg border border-[#1F2942] bg-[#0A0D14] px-3 py-2 text-sm text-[#F1F5F9] focus:border-[#00F0FF] focus:outline-none"
              placeholder="e.g. 250"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-[#94A3B8]">
                Real Dimension
              </label>
              <input
                type="number"
                step="0.1"
                value={realMeters}
                onChange={(e) => setRealMeters(parseFloat(e.target.value) || 0)}
                className="mt-1.5 w-full rounded-lg border border-[#1F2942] bg-[#0A0D14] px-3 py-2 text-sm text-[#F1F5F9] focus:border-[#00F0FF] focus:outline-none"
                placeholder="e.g. 5.0"
              />
            </div>
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-[#94A3B8]">
                Unit
              </label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value as 'meters' | 'feet')}
                className="mt-1.5 w-full rounded-lg border border-[#1F2942] bg-[#0A0D14] px-3 py-2 text-sm text-[#F1F5F9] focus:border-[#00F0FF] focus:outline-none"
              >
                <option value="meters">Meters (m)</option>
                <option value="feet">Feet (ft)</option>
              </select>
            </div>
          </div>

          <div className="rounded-lg border border-[#1F2942]/60 bg-[#0A0D14]/80 p-3">
            <div className="flex justify-between text-xs text-[#94A3B8]">
              <span>Calculated Scale:</span>
              <span className="font-mono text-[#00F0FF]">{calculatedScale.toFixed(5)} m/px</span>
            </div>
            <div className="mt-1 flex justify-between text-xs text-[#94A3B8]">
              <span>100px equals:</span>
              <span className="font-mono text-[#F1F5F9]">{(calculatedScale * 100).toFixed(2)} meters</span>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-lg border border-[#1F2942] px-4 py-2 text-sm font-medium text-[#94A3B8] hover:bg-[#1F2942] hover:text-[#F1F5F9]"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            className="flex items-center gap-2 rounded-lg bg-[#00F0FF] px-4 py-2 text-sm font-semibold text-[#0A0D14] hover:bg-[#00D1DF]"
          >
            <Check className="h-4 w-4" />
            Apply Calibration
          </button>
        </div>
      </div>
    </div>
  );
};
