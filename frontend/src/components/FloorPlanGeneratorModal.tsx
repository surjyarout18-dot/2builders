import React, { useState } from 'react';
import {
  Sparkles,
  X,
  Compass,
  Home,
  Layers,
  Check,
  ArrowRight,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  Zap,
  Info
} from 'lucide-react';
import { useProjectStore } from '../store/useProjectStore';
import { toast } from './Toast';

interface FloorPlanGeneratorModalProps {
  onOpenEditor?: () => void;
}

export const FloorPlanGeneratorModal: React.FC<FloorPlanGeneratorModalProps> = ({ onOpenEditor }) => {
  const isGeneratorModalOpen = useProjectStore((s) => s.isGeneratorModalOpen);
  const setGeneratorModalOpen = useProjectStore((s) => s.setGeneratorModalOpen);
  const generateAILayout = useProjectStore((s) => s.generateAILayout);
  const setViewMode = useProjectStore((s) => s.setViewMode);

  const [mode, setMode] = useState<'house' | 'room' | 'custom'>('house');
  const [selectedPreset, setSelectedPreset] = useState<string>('3bhk');
  const [customPrompt, setCustomPrompt] = useState<string>('Modern 3BHK north-facing home with master bedroom in SW and open kitchen in SE');
  const [furnitureMode, setFurnitureMode] = useState<'auto' | 'furnished' | 'unfurnished'>('auto');
  const [unit, setUnit] = useState<'meters' | 'feet'>('meters');
  const [dimensionRatio, setDimensionRatio] = useState<'16:9' | '4:3' | '1:1'>('16:9');
  const [activeTab, setActiveTab] = useState<'preview' | 'examples' | 'history'>('preview');
  const [carouselIndex, setCarouselIndex] = useState<number>(0);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [mobileTab, setMobileTab] = useState<'config' | 'preview'>('config');

  if (!isGeneratorModalOpen) return null;

  const housePresets = [
    { id: '1bhk', name: '1 BHK Urban Suite', size: '58 m²', desc: 'Open living, master suite & modern bath' },
    { id: '2bhk', name: '2 BHK Modern Family', size: '85 m²', desc: 'Living, dining, 2 bedrooms & 2 baths' },
    { id: '3bhk', name: '3 BHK Luxury Residence', size: '135 m²', desc: 'Grand living, kitchen, master suite & balcony' },
    { id: 'villa', name: 'Duplex Villa with Garden', size: '210 m²', desc: 'Verandah, double-height living & 3 suites' }
  ];

  const roomPresets = [
    { id: 'master', name: 'Master Bedroom Suite', size: '30 m²', desc: 'Includes en-suite bath & walk-in closet' },
    { id: 'living', name: 'Great Room & Dining', size: '42 m²', desc: 'Expansive open plan with patio access' },
    { id: 'kitchen', name: 'Chef Kitchen & Pantry', size: '20 m²', desc: 'Island counter with utility area' },
    { id: 'office', name: 'Executive Home Office', size: '18 m²', desc: 'Quiet work sanctum with library nook' }
  ];

  const handleGenerate = () => {
    setIsGenerating(true);
    setTimeout(() => {
      generateAILayout({
        type: mode,
        preset: mode === 'custom' ? customPrompt : selectedPreset,
        prompt: customPrompt,
        furnished: furnitureMode !== 'unfurnished',
        unit,
        aspect: dimensionRatio
      });
      setIsGenerating(false);
      setGeneratorModalOpen(false);
      setViewMode('split');
      onOpenEditor?.();
      toast.success('Generated architectural plan & 3D dollhouse model!');
    }, 600);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-md animate-in fade-in duration-200"
      onClick={() => setGeneratorModalOpen(false)}
    >
      <div
        className="w-full max-w-5xl h-[88vh] bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-white shadow-md">
              <Sparkles size={18} />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white tracking-wide flex items-center gap-2">
                <span>Floor Plan Generator</span>
                <span className="text-[10px] font-mono uppercase bg-sky-500/20 text-sky-300 border border-sky-400/30 px-2 py-0.5 rounded-full font-semibold">
                  Sub-Millimeter AI Layouts
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">Generate architectural 2D CAD blueprints & 3D models from parameters or text</p>
            </div>
          </div>
          <button
            onClick={() => setGeneratorModalOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Mobile Tab Switcher */}
        <div className="flex md:hidden border-b border-slate-800 bg-slate-950/90 p-1.5 shrink-0 gap-1">
          <button
            onClick={() => setMobileTab('config')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
              mobileTab === 'config'
                ? 'bg-sky-500/20 text-sky-300 border border-sky-400/40 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            ⚙ Configuration
          </button>
          <button
            onClick={() => setMobileTab('preview')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
              mobileTab === 'preview'
                ? 'bg-sky-500/20 text-sky-300 border border-sky-400/40 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            👁 Live Preview
          </button>
        </div>

        {/* Body: Split Panel */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          
          {/* Left Configuration Sidebar */}
          <div className={`w-full md:w-96 border-b md:border-b-0 md:border-r border-slate-800 p-4 sm:p-5 space-y-4 sm:space-y-5 overflow-y-auto bg-slate-950/40 ${mobileTab === 'config' ? 'block' : 'hidden md:block'}`}>
            {/* Mode Switcher */}
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2">Generation Scope</label>
              <div className="grid grid-cols-3 gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800">
                {(['room', 'house', 'custom'] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    className={`py-1.5 text-xs font-bold capitalize rounded-lg transition-all ${
                      mode === m
                        ? 'bg-gradient-to-r from-sky-500 to-indigo-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            {/* Presets List */}
            {mode === 'house' && (
              <div className="space-y-2">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">Select Layout Template</label>
                <div className="space-y-2">
                  {housePresets.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setSelectedPreset(p.id)}
                      className={`w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between ${
                        selectedPreset === p.id
                          ? 'bg-sky-500/10 border-sky-500/60 ring-1 ring-sky-500/40 text-white'
                          : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <div>
                        <div className="text-xs font-bold">{p.name}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{p.desc}</div>
                      </div>
                      <span className="text-[10px] font-mono font-bold text-sky-400 bg-sky-950/80 px-2 py-0.5 rounded border border-sky-800/60">
                        {p.size}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {mode === 'room' && (
              <div className="space-y-2">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">Select Room Template</label>
                <div className="space-y-2">
                  {roomPresets.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setSelectedPreset(p.id)}
                      className={`w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between ${
                        selectedPreset === p.id
                          ? 'bg-sky-500/10 border-sky-500/60 ring-1 ring-sky-500/40 text-white'
                          : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <div>
                        <div className="text-xs font-bold">{p.name}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{p.desc}</div>
                      </div>
                      <span className="text-[10px] font-mono font-bold text-sky-400 bg-sky-950/80 px-2 py-0.5 rounded border border-sky-800/60">
                        {p.size}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {mode === 'custom' && (
              <div className="space-y-2">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">Architectural Prompt</label>
                <textarea
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  rows={4}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-sky-500 resize-none font-sans leading-relaxed"
                  placeholder="Describe your desired layout (e.g., 3-bedroom contemporary home with master bedroom in southwest, open kitchen with pantry in southeast, and a living room overlooking garden)..."
                />
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {[
                    'Vastu Compliant 3BHK',
                    'Open Concept Studio',
                    'Modern Villa with Deck'
                  ].map((chip) => (
                    <button
                      key={chip}
                      onClick={() => setCustomPrompt(chip)}
                      className="text-[10px] bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 rounded px-2 py-0.5 transition-colors"
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Furniture Staging */}
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">Furniture Staging</label>
              <div className="grid grid-cols-3 gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-[11px] font-semibold">
                {(['auto', 'furnished', 'unfurnished'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFurnitureMode(f)}
                    className={`py-1.5 capitalize rounded-lg transition-all ${
                      furnitureMode === f ? 'bg-slate-800 text-sky-400 font-bold border border-slate-700' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            {/* Units & Dimensions */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">Measurement Unit</label>
                <select
                  value={unit}
                  onChange={(e) => setUnit(e.target.value as any)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2 text-xs text-slate-200 outline-none focus:border-sky-500 font-semibold"
                >
                  <option value="meters">Meters (m)</option>
                  <option value="feet">Feet (ft)</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">Aspect Ratio</label>
                <select
                  value={dimensionRatio}
                  onChange={(e) => setDimensionRatio(e.target.value as any)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2 text-xs text-slate-200 outline-none focus:border-sky-500 font-semibold"
                >
                  <option value="16:9">16:9 Basic</option>
                  <option value="4:3">4:3 Compact</option>
                  <option value="1:1">1:1 Square</option>
                </select>
              </div>
            </div>

            {/* Generate Action Button */}
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="w-full py-3 bg-gradient-to-r from-sky-500 via-indigo-500 to-purple-600 hover:from-sky-400 hover:to-purple-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-sky-500/25 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Synthesizing Architecture...</span>
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  <span>Generate Floor Plan (1 Credit)</span>
                </>
              )}
            </button>
          </div>

          {/* Right Live Architectural Preview */}
          <div className={`flex-1 flex flex-col bg-slate-950 p-4 sm:p-6 overflow-hidden relative ${mobileTab === 'preview' ? 'flex' : 'hidden md:flex'}`}>
            {/* Sub-Navigation Tabs */}
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3 mb-4 shrink-0">
              <div className="flex items-center gap-2">
                {(['preview', 'examples', 'history'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all ${
                      activeTab === tab
                        ? 'bg-slate-800 text-sky-400 border border-slate-700'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
                <Compass size={14} className="text-amber-400" />
                <span>North Up (0°)</span>
              </div>
            </div>

            {/* Interactive Preview Canvas */}
            <div className="flex-1 rounded-2xl bg-slate-900/60 border border-slate-800 relative flex items-center justify-center overflow-hidden p-6">
              {/* Background architectural grid pattern */}
              <div
                className="absolute inset-0 opacity-20 pointer-events-none"
                style={{
                  backgroundImage: `
                    linear-gradient(to right, rgba(56, 189, 248, 0.2) 1px, transparent 1px),
                    linear-gradient(to bottom, rgba(56, 189, 248, 0.2) 1px, transparent 1px)
                  `,
                  backgroundSize: '32px 32px'
                }}
              />

              {/* Architectural Plan Rendering matching floor-plan.ai */}
              <div className="relative max-w-lg w-full aspect-[4/3] bg-white/[0.04] backdrop-blur-md rounded-xl border border-white/10 p-6 shadow-2xl flex flex-col justify-between">
                {/* Rooms Schematic */}
                <div className="grid grid-cols-3 grid-rows-2 gap-3 h-full">
                  <div className="col-span-2 row-span-1 bg-sky-500/15 border border-sky-400/40 rounded-lg p-3 flex flex-col justify-between relative">
                    <span className="text-[10px] font-bold text-sky-300 uppercase">Great Room / Living</span>
                    <div className="text-[9px] text-slate-400 font-mono">6.0m × 4.5m (27.0 m²)</div>
                    <span className="absolute bottom-2 right-2 text-[9px] bg-sky-500/20 text-sky-300 px-1.5 py-0.2 rounded font-mono">West</span>
                  </div>

                  <div className="col-span-1 row-span-1 bg-amber-500/15 border border-amber-400/40 rounded-lg p-3 flex flex-col justify-between relative">
                    <span className="text-[10px] font-bold text-amber-300 uppercase">Kitchen</span>
                    <div className="text-[9px] text-slate-400 font-mono">3.5m × 3.5m (12.2 m²)</div>
                    <span className="absolute bottom-2 right-2 text-[9px] bg-amber-500/20 text-amber-300 px-1.5 py-0.2 rounded font-mono">SE Vastu</span>
                  </div>

                  <div className="col-span-1 row-span-1 bg-purple-500/15 border border-purple-400/40 rounded-lg p-3 flex flex-col justify-between relative">
                    <span className="text-[10px] font-bold text-purple-300 uppercase">Master Suite</span>
                    <div className="text-[9px] text-slate-400 font-mono">5.0m × 4.0m (20.0 m²)</div>
                    <span className="absolute bottom-2 right-2 text-[9px] bg-purple-500/20 text-purple-300 px-1.5 py-0.2 rounded font-mono">SW Ideal</span>
                  </div>

                  <div className="col-span-1 row-span-1 bg-emerald-500/15 border border-emerald-400/40 rounded-lg p-3 flex flex-col justify-between relative">
                    <span className="text-[10px] font-bold text-emerald-300 uppercase">Bedroom 2</span>
                    <div className="text-[9px] text-slate-400 font-mono">4.0m × 3.5m (14.0 m²)</div>
                    <span className="absolute bottom-2 right-2 text-[9px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 rounded font-mono">NW</span>
                  </div>

                  <div className="col-span-1 row-span-1 bg-teal-500/15 border border-teal-400/40 rounded-lg p-3 flex flex-col justify-between relative">
                    <span className="text-[10px] font-bold text-teal-300 uppercase">Covered Porch</span>
                    <div className="text-[9px] text-slate-400 font-mono">4.0m × 2.0m (8.0 m²)</div>
                    <span className="absolute bottom-2 right-2 text-[9px] bg-teal-500/20 text-teal-300 px-1.5 py-0.2 rounded font-mono">Entry</span>
                  </div>
                </div>

                {/* Compass & Scale Bar in bottom bar */}
                <div className="flex items-center justify-between pt-4 border-t border-white/10 text-[10px] font-mono text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <div className="w-5 h-5 rounded-full border border-amber-400/60 flex items-center justify-center text-amber-300 text-[8px] font-bold">
                      N
                    </div>
                    <span>True North</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex items-center">
                      <div className="w-8 h-1 bg-white" />
                      <div className="w-8 h-1 bg-slate-600" />
                      <div className="w-8 h-1 bg-white" />
                    </div>
                    <span>0m — 2m — 5m</span>
                  </div>
                </div>
              </div>

              {/* Bottom Quick Carousel Navigation */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-slate-950/80 px-3 py-1.5 rounded-full border border-slate-800 text-xs">
                <button
                  onClick={() => setCarouselIndex((i) => Math.max(0, i - 1))}
                  className="p-1 hover:text-white text-slate-400"
                >
                  <ChevronLeft size={14} />
                </button>
                <span className="text-[10px] font-mono text-slate-300">Layout Option {carouselIndex + 1} of 3</span>
                <button
                  onClick={() => setCarouselIndex((i) => Math.min(2, i + 1))}
                  className="p-1 hover:text-white text-slate-400"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
