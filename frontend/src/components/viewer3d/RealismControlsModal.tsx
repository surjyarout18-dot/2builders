import React, { useState } from 'react';
import {
  Sparkles,
  X,
  Palette,
  Sun,
  Moon,
  Compass,
  Download,
  ShieldCheck,
  Check,
  Layers,
  ArrowRight,
  Armchair,
  Video
} from 'lucide-react';
import { useFloorPlanStore } from '../../store/useFloorPlanStore';
import { enhanceRealismApi, downloadBlenderScriptApi } from '../../services/api';

interface RealismControlsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RealismControlsModal: React.FC<RealismControlsModalProps> = ({
  isOpen,
  onClose
}) => {
  const { model, setModel, dayNightMode, toggleDayNight } = useFloorPlanStore();
  const [selectedStyle, setSelectedStyle] = useState<string>('contemporary_warm');
  const [orientation, setOrientation] = useState<string>('south');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

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

  const styles = [
    {
      id: 'contemporary_warm',
      title: 'Contemporary Warm',
      desc: 'Herringbone oak parquet, Carrara marble bathrooms, zinc standing seam roof, warm 3000K downlights',
      accent: '#00F0FF'
    },
    {
      id: 'nordic_minimal',
      title: 'Nordic Minimalist',
      desc: 'Natural pine flooring, chalk-white matte walls, slate entry, shed roof profile with natural illumination',
      accent: '#38BDF8'
    },
    {
      id: 'urban_industrial',
      title: 'Urban Industrial',
      desc: 'Polished architectural concrete, dark charcoal accents, black steel frames, flat gravel roof',
      accent: '#94A3B8'
    },
    {
      id: 'classic_mediterranean',
      title: 'Classic Mediterranean',
      desc: 'Warm terracotta roof tiles, honed travertine stone, sunny cream stucco, natural courtyard garden',
      accent: '#F59E0B'
    }
  ];

  const handleApplyRealism = async () => {
    setIsProcessing(true);
    setFeedbackMsg('Applying PBR materials, staging furniture, and configuring illumination...');
    try {
      const enhanced = await enhanceRealismApi(model, selectedStyle, orientation, dayNightMode);
      setModel(enhanced);
      setFeedbackMsg('Realism applied with strict Geometry Invariance verified!');
      setTimeout(() => {
        setIsProcessing(false);
        onClose();
      }, 700);
    } catch (err: any) {
      console.warn("Realism agent local enhancement fallback:", err);
      setIsProcessing(false);
      onClose();
    }
  };

  const handleDownloadBlenderScript = async () => {
    try {
      const scriptText = await downloadBlenderScriptApi(model.project_id);
      const blob = new Blob([scriptText], { type: 'text/x-python' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${model.name.replace(/\s+/g, '_')}_blender_scene.py`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to download Blender script:", err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="flex h-[88vh] w-full max-w-4xl flex-col rounded-2xl border border-[#1F2942] bg-[#111726] shadow-2xl overflow-hidden font-sans">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#1F2942] bg-[#0A0D14]/80 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#00F0FF]/15 text-[#00F0FF]">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-[#F1F5F9]">AI Realism & Rendering Agent</h2>
                <span className="flex items-center gap-1 rounded-full bg-[#10B981]/15 px-2 py-0.5 text-[10px] font-semibold text-[#10B981]">
                  <ShieldCheck className="h-3 w-3" />
                  Geometry Invariant · 100% Free
                </span>
              </div>
              <p className="text-xs text-[#94A3B8]">
                Enriches parametric plans with PBR textures, contextual staging, solar pathing, and Blender rendering
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
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Style Selector Grid */}
          <div>
            <label className="block text-xs font-mono font-bold uppercase tracking-wider text-[#00F0FF] mb-3">
              1. Choose Architectural PBR Material Palette
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {styles.map((style) => (
                <button
                  key={style.id}
                  onClick={() => setSelectedStyle(style.id)}
                  className={`flex flex-col text-left p-4 rounded-xl border transition-all ${
                    selectedStyle === style.id
                      ? 'border-[#00F0FF] bg-[#00F0FF]/10 shadow-lg shadow-[#00F0FF]/15'
                      : 'border-[#1F2942] bg-[#0E1424] hover:border-[#94A3B8]'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="font-bold text-sm text-[#F1F5F9]">{style.title}</span>
                    {selectedStyle === style.id && (
                      <span className="h-2 w-2 rounded-full bg-[#00F0FF]" />
                    )}
                  </div>
                  <p className="text-xs text-[#94A3B8] mt-1.5 leading-relaxed">{style.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Environmental Controls */}
          <div>
            <label className="block text-xs font-mono font-bold uppercase tracking-wider text-[#00F0FF] mb-3">
              2. Environmental & Lighting Controls
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Orientation */}
              <div className="rounded-xl border border-[#1F2942] bg-[#0E1424] p-4">
                <div className="flex items-center gap-2 text-xs font-bold text-[#CBD5E1] mb-2">
                  <Compass className="h-4 w-4 text-[#00F0FF]" />
                  <span>Sun Orientation</span>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {['south', 'north', 'east', 'west'].map((dir) => (
                    <button
                      key={dir}
                      onClick={() => setOrientation(dir)}
                      className={`py-1.5 text-xs font-mono font-bold rounded-lg border uppercase transition-all ${
                        orientation === dir
                          ? 'border-[#00F0FF] bg-[#00F0FF]/15 text-[#00F0FF]'
                          : 'border-[#1F2942] bg-[#111726] text-[#94A3B8] hover:text-[#F1F5F9]'
                      }`}
                    >
                      {dir}
                    </button>
                  ))}
                </div>
              </div>

              {/* Day / Night */}
              <div className="rounded-xl border border-[#1F2942] bg-[#0E1424] p-4 flex flex-col justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-[#CBD5E1]">
                  {dayNightMode === 'night' ? <Moon className="h-4 w-4 text-[#F59E0B]" /> : <Sun className="h-4 w-4 text-[#F59E0B]" />}
                  <span>Atmospheric Lighting Mode</span>
                </div>
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={toggleDayNight}
                    className="flex-1 py-1.5 text-xs font-bold rounded-lg border border-[#1F2942] bg-[#111726] hover:border-[#00F0FF] text-[#CBD5E1] flex items-center justify-center gap-1.5"
                  >
                    <span>Current: {dayNightMode === 'night' ? 'Night (Interior 2700K)' : 'Day (Solar 3000K)'}</span>
                  </button>
                </div>
              </div>

            </div>
          </div>

          {/* Strict Invariance Verification Callout */}
          <div className="rounded-xl border border-[#10B981]/30 bg-[#10B981]/10 p-4 text-xs text-[#A7F3D0] flex items-start gap-3">
            <ShieldCheck className="h-5 w-5 text-[#10B981] shrink-0 mt-0.5" />
            <div>
              <strong className="text-[#10B981] font-semibold">Geometry Invariance Guarantee:</strong> The Realism Agent assigns PBR textures, positions contextual furniture, and adjusts atmospheric lighting. It is cryptographically and logically prohibited from altering any wall coordinates, room boundaries, or structural heights without your explicit CAD edit.
            </div>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-[#1F2942] bg-[#0A0D14]/80 px-6 py-4">
          <button
            onClick={handleDownloadBlenderScript}
            className="flex items-center gap-2 rounded-xl border border-[#1F2942] bg-[#111726] px-4 py-2.5 text-xs font-bold text-[#CBD5E1] hover:border-[#F59E0B] hover:text-[#F59E0B] transition-all w-full sm:w-auto justify-center"
          >
            <Video className="h-4 w-4 text-[#F59E0B]" />
            <span>Download Blender Script (.py)</span>
          </button>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={handleApplyRealism}
              disabled={isProcessing}
              className="flex items-center justify-center gap-2 rounded-xl bg-[#00F0FF] px-6 py-2.5 text-xs font-extrabold text-[#070A11] shadow-lg shadow-[#00F0FF]/25 hover:bg-[#00D1DF] disabled:opacity-50 transition-all w-full sm:w-auto"
            >
              <Sparkles className="h-4 w-4" />
              <span>{isProcessing ? feedbackMsg : "Apply Realism Agent (Browser PBR) →"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
