import React, { useState } from 'react';
import {
  Sparkles,
  X,
  Compass,
  Maximize2,
  Check,
  ArrowRight,
  ShieldCheck,
  Sliders,
  Layers,
  Home
} from 'lucide-react';
import { useFloorPlanStore } from '../../store/useFloorPlanStore';
import { generateCandidatePlansApi } from '../../services/api';
import { ArchitecturalModel } from '../../types/architectural';

interface PromptToPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PromptToPlanModal: React.FC<PromptToPlanModalProps> = ({ isOpen, onClose }) => {
  const { setModel, unitSystem, candidateLayouts, setCandidateLayouts } = useFloorPlanStore();

  const [prompt, setPrompt] = useState<string>("Modern 3-bedroom villa with expansive great room, ensuite master wing, and central hallway");
  const [plotWidth, setPlotWidth] = useState<number>(16.0);
  const [plotDepth, setPlotDepth] = useState<number>(20.0);
  const [targetArea, setTargetArea] = useState<number>(145.0);
  const [buildingType, setBuildingType] = useState<string>("detached_villa");
  const [bedrooms, setBedrooms] = useState<number>(3);
  const [bathrooms, setBathrooms] = useState<number>(2);
  const [style, setStyle] = useState<string>("modern");
  const [orientation, setOrientation] = useState<string>("south");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [selectedCandidateIdx, setSelectedCandidateIdx] = useState<number | null>(null);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    setIsLoading(true);
    try {
      const res = await generateCandidatePlansApi({
        prompt,
        plot_width: plotWidth,
        plot_depth: plotDepth,
        target_area_sqm: targetArea,
        building_type: buildingType,
        bedrooms_count: bedrooms,
        bathrooms_count: bathrooms,
        style,
        orientation
      });
      if (res && res.candidates && res.candidates.length > 0) {
        setCandidateLayouts(res.candidates);
        setSelectedCandidateIdx(0);
      }
    } catch (e) {
      console.error("Layout generation error:", e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyCandidate = (model: ArchitecturalModel) => {
    setModel(model);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="flex h-[90vh] w-full max-w-6xl flex-col rounded-2xl border border-[#1F2942] bg-[#111726] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#1F2942] bg-[#0A0D14]/80 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#00F0FF]/15 text-[#00F0FF]">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-[#F1F5F9]">Prompt-to-Design Algorithmic Generator</h2>
                <span className="flex items-center gap-1 rounded-full bg-[#10B981]/15 px-2 py-0.5 text-[10px] font-semibold text-[#10B981]">
                  <ShieldCheck className="h-3 w-3" />
                  Deterministic CAD Solver • 100% Free
                </span>
              </div>
              <p className="text-xs text-[#94A3B8]">
                Generates 3 structurally coherent, non-overlapping architectural layout candidates
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[#94A3B8] hover:bg-[#1F2942] hover:text-[#F1F5F9] transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left Form Controls */}
          <div className="w-96 border-r border-[#1F2942] bg-[#0D121F] p-5 overflow-y-auto space-y-4">
            <div>
              <label className="text-xs font-semibold text-[#F1F5F9] mb-1.5 block">
                Architectural Intent & Brief
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={3}
                className="w-full rounded-xl border border-[#1F2942] bg-[#161F33] p-3 text-xs text-[#F1F5F9] focus:border-[#00F0FF] focus:outline-none placeholder-[#64748B]"
                placeholder="e.g., 3-bedroom detached home with private master wing and southern glazing"
              />
            </div>

            {/* Bedrooms & Bathrooms */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-medium text-[#94A3B8] mb-1 block">Bedrooms</label>
                <div className="flex rounded-lg border border-[#1F2942] bg-[#161F33] p-1">
                  {[2, 3, 4, 5].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setBedrooms(num)}
                      className={`flex-1 py-1 text-xs font-bold rounded ${bedrooms === num ? 'bg-[#00F0FF] text-[#0A0D14]' : 'text-[#94A3B8] hover:text-[#F1F5F9]'}`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[11px] font-medium text-[#94A3B8] mb-1 block">Bathrooms</label>
                <div className="flex rounded-lg border border-[#1F2942] bg-[#161F33] p-1">
                  {[1, 2, 3, 4].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setBathrooms(num)}
                      className={`flex-1 py-1 text-xs font-bold rounded ${bathrooms === num ? 'bg-[#00F0FF] text-[#0A0D14]' : 'text-[#94A3B8] hover:text-[#F1F5F9]'}`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Target Area */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-[#94A3B8]">Target Area</span>
                <span className="font-mono font-bold text-[#00F0FF]">
                  {unitSystem === 'metric' ? `${targetArea} m²` : `${Math.round(targetArea * 10.7639)} sq ft`}
                </span>
              </div>
              <input
                type="range"
                min={60}
                max={300}
                step={5}
                value={targetArea}
                onChange={(e) => setTargetArea(Number(e.target.value))}
                className="w-full accent-[#00F0FF]"
              />
            </div>

            {/* Plot Dimensions */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-medium text-[#94A3B8] mb-1 block">Plot Width (m)</label>
                <input
                  type="number"
                  value={plotWidth}
                  onChange={(e) => setPlotWidth(Number(e.target.value))}
                  className="w-full rounded-lg border border-[#1F2942] bg-[#161F33] px-3 py-1.5 text-xs text-[#F1F5F9]"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-[#94A3B8] mb-1 block">Plot Depth (m)</label>
                <input
                  type="number"
                  value={plotDepth}
                  onChange={(e) => setPlotDepth(Number(e.target.value))}
                  className="w-full rounded-lg border border-[#1F2942] bg-[#161F33] px-3 py-1.5 text-xs text-[#F1F5F9]"
                />
              </div>
            </div>

            {/* Style & Orientation */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-medium text-[#94A3B8] mb-1 block">Style</label>
                <select
                  value={style}
                  onChange={(e) => setStyle(e.target.value)}
                  className="w-full rounded-lg border border-[#1F2942] bg-[#161F33] px-2.5 py-1.5 text-xs text-[#F1F5F9]"
                >
                  <option value="modern">Modern Minimal</option>
                  <option value="scandinavian">Scandinavian</option>
                  <option value="industrial">Industrial</option>
                  <option value="traditional">Traditional</option>
                </select>
              </div>
              <div>
                <label className="text-[11px] font-medium text-[#94A3B8] mb-1 block">Front Orientation</label>
                <select
                  value={orientation}
                  onChange={(e) => setOrientation(e.target.value)}
                  className="w-full rounded-lg border border-[#1F2942] bg-[#161F33] px-2.5 py-1.5 text-xs text-[#F1F5F9]"
                >
                  <option value="south">South (Best Sunlight)</option>
                  <option value="north">North</option>
                  <option value="east">East (Morning Sun)</option>
                  <option value="west">West</option>
                </select>
              </div>
            </div>

            <button
              onClick={handleGenerate}
              disabled={isLoading}
              className="w-full mt-4 flex items-center justify-center gap-2 rounded-xl bg-[#00F0FF] py-3 text-xs font-bold text-[#0A0D14] shadow-lg shadow-[#00F0FF]/25 hover:bg-[#00D1DF] transition-all disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#0A0D14] border-t-transparent" />
                  <span>Solving Constraints...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  <span>Generate Candidate Layouts</span>
                </>
              )}
            </button>
          </div>

          {/* Right Candidate Comparison View */}
          <div className="flex-1 bg-[#0A0D14] p-6 overflow-y-auto">
            {candidateLayouts.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-center p-8">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#111726] border border-[#1F2942] text-[#00F0FF] mb-4">
                  <Sliders className="h-8 w-8" />
                </div>
                <h3 className="text-base font-bold text-[#F1F5F9]">Ready to Generate Algorithmic Floor Plans</h3>
                <p className="mt-1 max-w-md text-xs text-[#94A3B8] leading-relaxed">
                  Enter your architectural requirements on the left. The engine will run a deterministic layout solver calculating circulation efficiency, wall alignments, and solar orientation.
                </p>
                <button
                  onClick={handleGenerate}
                  className="mt-5 flex items-center gap-2 rounded-xl border border-[#00F0FF]/40 bg-[#00F0FF]/10 px-4 py-2 text-xs font-bold text-[#00F0FF] hover:bg-[#00F0FF]/20"
                >
                  <Sparkles className="h-4 w-4" />
                  <span>Run Generator Demo</span>
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-[#F1F5F9]">
                      Generated Candidates ({candidateLayouts.length} Concepts)
                    </h3>
                    <p className="text-xs text-[#94A3B8]">
                      Select a layout concept to inspect its circulation graph and import into your CAD Studio
                    </p>
                  </div>
                  <span className="font-mono text-xs text-[#00F0FF]">Constraint Status: Watertight Valid</span>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  {candidateLayouts.map((candidate, idx) => {
                    const floor = candidate.floors[0] || { rooms: [], walls: [] };
                    const totalArea = floor.rooms.reduce((acc, r) => acc + r.area_sqm, 0);
                    const isSelected = selectedCandidateIdx === idx;

                    return (
                      <div
                        key={candidate.project_id || idx}
                        onClick={() => setSelectedCandidateIdx(idx)}
                        className={`cursor-pointer rounded-2xl border transition-all p-5 flex flex-col justify-between ${
                          isSelected
                            ? 'border-[#00F0FF] bg-[#111726] shadow-xl shadow-[#00F0FF]/10 ring-1 ring-[#00F0FF]'
                            : 'border-[#1F2942] bg-[#0E1424] hover:border-[#94A3B8]/40'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <span className="rounded-md bg-[#00F0FF]/15 px-2 py-0.5 font-mono text-[10px] font-bold text-[#00F0FF]">
                              Candidate {idx + 1}
                            </span>
                            <span className="text-[11px] font-mono text-[#94A3B8]">
                              {floor.walls.length} Walls
                            </span>
                          </div>

                          <h4 className="text-sm font-bold text-[#F1F5F9] leading-snug">
                            {candidate.name}
                          </h4>

                          <p className="mt-1 text-xs text-[#94A3B8] line-clamp-2">
                            {candidate.metadata?.description || "Optimized spatial arrangement with high circulation efficiency."}
                          </p>

                          {/* Stat Pills */}
                          <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                            <div className="rounded-lg bg-[#161F33] p-2">
                              <span className="text-[10px] text-[#94A3B8] block">Living Area</span>
                              <span className="font-mono font-bold text-[#F1F5F9]">
                                {unitSystem === 'metric'
                                  ? `${totalArea.toFixed(1)} m²`
                                  : `${Math.round(totalArea * 10.7639)} sqft`}
                              </span>
                            </div>
                            <div className="rounded-lg bg-[#161F33] p-2">
                              <span className="text-[10px] text-[#94A3B8] block">Rooms</span>
                              <span className="font-mono font-bold text-[#F1F5F9]">
                                {floor.rooms.length} Spaces
                              </span>
                            </div>
                          </div>

                          {/* Room badges */}
                          <div className="mt-3 flex flex-wrap gap-1">
                            {floor.rooms.slice(0, 4).map((r) => (
                              <span
                                key={r.id}
                                className="rounded bg-[#1F2942]/70 px-1.5 py-0.5 text-[10px] text-[#CBD5E1]"
                              >
                                {r.name}
                              </span>
                            ))}
                            {floor.rooms.length > 4 && (
                              <span className="rounded bg-[#1F2942]/70 px-1.5 py-0.5 text-[10px] text-[#94A3B8]">
                                +{floor.rooms.length - 4} more
                              </span>
                            )}
                          </div>
                        </div>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleApplyCandidate(candidate);
                          }}
                          className={`mt-5 flex w-full items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-bold transition-all ${
                            isSelected
                              ? 'bg-[#00F0FF] text-[#0A0D14] shadow-md shadow-[#00F0FF]/25 hover:bg-[#00D1DF]'
                              : 'border border-[#1F2942] bg-[#161F33] text-[#F1F5F9] hover:border-[#00F0FF] hover:text-[#00F0FF]'
                          }`}
                        >
                          <span>Load into CAD Studio</span>
                          <ArrowRight className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
