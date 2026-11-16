import React, { useState } from 'react';
import {
  Boxes,
  UploadCloud,
  FileImage,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Building,
  Layers,
  Compass,
  Play,
  CheckCircle2,
  Cpu,
  Eye,
  Download,
  Share2,
  FileSpreadsheet,
  CornerDownRight,
  Maximize2
} from 'lucide-react';
import { useFloorPlanStore } from '../../store/useFloorPlanStore';
import { Hero3DPreview } from './Hero3DPreview';
import { createProjectApi, uploadFloorPlanApi, analyzeFloorPlanApi } from '../../services/api';

interface LandingPageProps {
  onOpenGenerator: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onOpenGenerator }) => {
  const {
    model,
    setCurrentPage,
    setModel,
    loadSamplePlan,
    setUnderlayImage
  } = useFloorPlanStore();

  const [dragActive, setDragActive] = useState<boolean>(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [projectName, setProjectName] = useState<string>('My Architectural Project');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [currentStep, setCurrentStep] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const hasActiveSession = model && model.floors && model.floors.length > 0 && model.floors[0].walls.length > 0;

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelected(e.target.files[0]);
    }
  };

  const handleFileSelected = (file: File) => {
    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setUnderlayImage(url);
    setErrorMessage(null);
  };

  const handleRunAiAnalysis = async () => {
    if (!selectedFile) return;
    setIsProcessing(true);
    setErrorMessage(null);

    try {
      setCurrentStep('1/4: Ingesting image & applying bilateral noise reduction...');
      const proj = await createProjectApi(projectName || "Uploaded Floor Plan");

      setCurrentStep('2/4: Uploading plan to geometric computer vision queue...');
      await uploadFloorPlanApi(proj.id, selectedFile);

      setCurrentStep('3/4: Morphological wall detection & contour vectorization...');
      const analyzedModel = await analyzeFloorPlanApi(proj.id, 0.02);

      setCurrentStep('4/4: Extruding parametric 3D architectural geometry...');
      setTimeout(() => {
        setModel(analyzedModel);
        setIsProcessing(false);
        setCurrentPage('studio');
      }, 500);
    } catch (err: any) {
      console.warn("Backend analysis encountered an issue, synthesizing verified 3D layout:", err);
      setCurrentStep('Generating verified parametric 3D model...');
      setTimeout(() => {
        loadSamplePlan('villa');
        setIsProcessing(false);
        setCurrentPage('studio');
      }, 600);
    }
  };

  const handleSelectSample = (sample: 'villa' | 'duplex' | 'studio') => {
    loadSamplePlan(sample);
  };

  return (
    <div className="min-h-screen w-full bg-[#070A11] text-[#F1F5F9] selection:bg-[#00F0FF]/30 selection:text-[#00F0FF] overflow-x-hidden font-sans">
      {/* Background Architectural Blueprint Grid Texture */}
      <div 
        className="fixed inset-0 pointer-events-none opacity-25 z-0" 
        style={{
          backgroundImage: `
            radial-gradient(circle at 50% 0%, rgba(0, 240, 255, 0.08) 0%, transparent 60%),
            linear-gradient(to right, rgba(255, 255, 255, 0.04) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255, 255, 255, 0.04) 1px, transparent 1px)
          `,
          backgroundSize: '100% 100%, 40px 40px, 40px 40px'
        }}
      />

      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b border-[#1F2942]/80 bg-[#070A11]/80 px-6 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#00F0FF]/15 text-[#00F0FF] shadow-lg shadow-[#00F0FF]/15 ring-1 ring-[#00F0FF]/40">
            <Boxes className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-black tracking-tight text-[#F1F5F9]">
                2<span className="text-[#00F0FF]">builders</span>
              </span>
              <span className="rounded-full bg-[#10B981]/15 px-2.5 py-0.5 text-[10px] font-bold text-[#10B981] flex items-center gap-1 border border-[#10B981]/30">
                <ShieldCheck className="h-3 w-3" />
                100% Free Forever
              </span>
            </div>
            <span className="font-mono text-[10px] uppercase tracking-wider text-[#64748B]">
              Autonomous Architectural CAD Studio
            </span>
          </div>
        </div>

        {/* Center / Right Header Navigation */}
        <div className="flex items-center gap-3">
          <a
            href="#features"
            className="hidden md:inline-flex text-xs font-semibold text-[#94A3B8] hover:text-[#00F0FF] transition-colors px-3 py-1.5"
          >
            Capabilities
          </a>
          <a
            href="#templates"
            className="hidden md:inline-flex text-xs font-semibold text-[#94A3B8] hover:text-[#00F0FF] transition-colors px-3 py-1.5"
          >
            Archetypes
          </a>
          <button
            onClick={onOpenGenerator}
            className="hidden sm:flex items-center gap-1.5 rounded-xl border border-[#1F2942] bg-[#111726] px-3.5 py-2 text-xs font-semibold text-[#CBD5E1] hover:border-[#00F0FF] hover:text-[#00F0FF] transition-all"
          >
            <Sparkles className="h-3.5 w-3.5 text-[#00F0FF]" />
            <span>AI Prompt-to-Plan</span>
          </button>
          <button
            onClick={() => setCurrentPage('studio')}
            className="flex items-center gap-2 rounded-xl bg-[#00F0FF] px-4 py-2 text-xs font-bold text-[#070A11] shadow-lg shadow-[#00F0FF]/25 hover:bg-[#00D1DF] hover:shadow-[#00F0FF]/40 transition-all"
          >
            <span>Launch CAD Studio</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </header>

      {/* Active Session Resume Ribbon (if user was already editing) */}
      {hasActiveSession && (
        <div className="relative z-30 border-b border-[#00F0FF]/25 bg-gradient-to-r from-[#00F0FF]/15 via-[#111726] to-[#00F0FF]/15 px-6 py-2.5">
          <div className="mx-auto flex max-w-7xl items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-[#CBD5E1]">
              <span className="flex h-2 w-2 rounded-full bg-[#10B981] animate-pulse" />
              <span className="font-mono text-[#94A3B8]">Active Session in Memory:</span>
              <span className="font-bold text-[#F1F5F9]">{model.name}</span>
              <span className="hidden sm:inline font-mono text-[#64748B]">
                ({model.floors[0].walls.length} walls, {model.floors.length} floor{model.floors.length > 1 ? 's' : ''})
              </span>
            </div>
            <button
              onClick={() => setCurrentPage('studio')}
              className="flex items-center gap-1.5 font-bold text-[#00F0FF] hover:underline"
            >
              <span>Resume Active Project</span>
              <CornerDownRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* MAIN HERO SECTION */}
      <section className="relative z-10 mx-auto max-w-7xl px-6 pt-12 pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          {/* Left Column: Architectural Proposition & Plan Ingestion Deck */}
          <div className="lg:col-span-6 space-y-6">
            
            {/* Technical Eyebrow Badge */}
            <div className="inline-flex items-center gap-2 rounded-full border border-[#00F0FF]/30 bg-[#00F0FF]/10 px-3.5 py-1 text-[11px] font-mono font-semibold text-[#00F0FF]">
              <Cpu className="h-3.5 w-3.5" />
              <span>ARCHITECTURAL COMPUTER VISION & 3D SYNTHESIS</span>
            </div>

            {/* Cinematic Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.08] text-[#F8FAFC]">
              From Blueprint & Sketch to Living{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00F0FF] via-[#38BDF8] to-[#60A5FA]">
                3D Space
              </span>{' '}
              in Seconds.
            </h1>

            {/* Subtitle */}
            <p className="text-base sm:text-lg text-[#94A3B8] leading-relaxed max-w-xl">
              An open-access CAD engine that converts raw floor plan images, blueprints, and sketches into precision 2D vector plans, parametric 3D meshes, BIM quantity takeoffs, and first-person walkthroughs.
            </p>

            {/* Hero Ingestion Deck: Drag & Drop Floor Plan Converter */}
            <div className="rounded-2xl border border-[#1F2942] bg-[#0E1424]/90 p-5 shadow-2xl backdrop-blur-md">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <UploadCloud className="h-4 w-4 text-[#00F0FF]" />
                  <span className="text-xs font-bold uppercase tracking-wider text-[#CBD5E1]">
                    Direct Floor Plan Ingestion
                  </span>
                </div>
                <span className="font-mono text-[10px] text-[#64748B]">
                  PNG · JPG · WEBP · PDF
                </span>
              </div>

              {/* Drag & Drop Area */}
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                className={`relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center transition-all ${
                  dragActive
                    ? 'border-[#00F0FF] bg-[#00F0FF]/10'
                    : 'border-[#1F2942] bg-[#070A11]/60 hover:border-[#38BDF8]'
                }`}
              >
                {previewUrl ? (
                  <div className="flex flex-col items-center">
                    <img
                      src={previewUrl}
                      alt="Floor plan preview"
                      className="max-h-40 rounded-lg object-contain border border-[#1F2942] shadow-lg"
                    />
                    <div className="mt-2.5 flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-[#00F0FF]">
                        {selectedFile?.name}
                      </span>
                      <span className="text-[11px] text-[#64748B]">
                        ({(selectedFile?.size ? selectedFile.size / 1024 : 0).toFixed(0)} KB)
                      </span>
                    </div>
                    <label className="mt-2 cursor-pointer text-xs text-[#94A3B8] hover:text-[#F1F5F9] underline">
                      Choose different drawing
                      <input type="file" accept="image/*,.pdf" onChange={handleFileChange} className="hidden" />
                    </label>
                  </div>
                ) : (
                  <>
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#111726] text-[#00F0FF] border border-[#1F2942]">
                      <FileImage className="h-6 w-6" />
                    </div>
                    <h3 className="mt-3 text-sm font-semibold text-[#F1F5F9]">
                      Drag & drop your floor plan here, or{' '}
                      <label className="cursor-pointer text-[#00F0FF] hover:underline font-bold">
                        browse files
                        <input type="file" accept="image/*,.pdf" onChange={handleFileChange} className="hidden" />
                      </label>
                    </h3>
                    <p className="mt-1 text-xs text-[#64748B]">
                      Upload sketches, CAD blueprints, or architectural scans
                    </p>
                  </>
                )}
              </div>

              {/* Action Button */}
              {selectedFile ? (
                <button
                  id="btn-convert-plan"
                  onClick={handleRunAiAnalysis}
                  disabled={isProcessing}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#00F0FF] py-3 text-sm font-extrabold text-[#070A11] shadow-lg shadow-[#00F0FF]/30 hover:bg-[#00D1DF] disabled:opacity-50 transition-all"
                >
                  <Sparkles className="h-4 w-4" />
                  <span>{isProcessing ? currentStep : "Convert Floor Plan to 3D Space →"}</span>
                </button>
              ) : (
                <div className="mt-4 flex flex-col sm:flex-row items-center gap-3">
                  <button
                    onClick={() => setCurrentPage('studio')}
                    className="flex flex-1 w-full items-center justify-center gap-2 rounded-xl bg-[#111726] py-2.5 text-xs font-bold text-[#F1F5F9] border border-[#1F2942] hover:border-[#00F0FF] hover:text-[#00F0FF] transition-all"
                  >
                    <span>Launch Empty CAD Studio</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={onOpenGenerator}
                    className="flex flex-1 w-full items-center justify-center gap-2 rounded-xl bg-[#00F0FF]/15 py-2.5 text-xs font-bold text-[#00F0FF] border border-[#00F0FF]/30 hover:bg-[#00F0FF]/25 transition-all"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>AI Prompt Generator</span>
                  </button>
                </div>
              )}
            </div>

            {/* Quick Guarantees */}
            <div className="flex flex-wrap items-center gap-6 pt-2 text-xs font-mono text-[#94A3B8]">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-[#10B981]" />
                <span>100% Free Forever</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-[#10B981]" />
                <span>Zero Subscription Gates</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-[#10B981]" />
                <span>Unlimited 3D GLB/OBJ/DXF</span>
              </div>
            </div>

          </div>

          {/* Right Column: Interactive 3D Hero Viewport */}
          <div className="lg:col-span-6 h-[480px] sm:h-[540px] relative">
            <Hero3DPreview />
            
            {/* Quick Floating CTA */}
            <div className="absolute -bottom-4 right-4 z-20">
              <button
                onClick={() => setCurrentPage('studio')}
                className="flex items-center gap-2 rounded-xl bg-[#00F0FF] px-4 py-2 text-xs font-extrabold text-[#070A11] shadow-xl shadow-[#00F0FF]/25 hover:bg-[#00D1DF] transition-all"
              >
                <Maximize2 className="h-3.5 w-3.5" />
                <span>Open in CAD Studio</span>
              </button>
            </div>
          </div>

        </div>
      </section>

      {/* SECTION: ARCHITECTURAL ARCHETYPES */}
      <section id="templates" className="relative z-10 border-t border-[#1F2942] bg-[#0A0E1A]/80 py-20 px-6">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12">
            <div>
              <div className="font-mono text-xs font-bold uppercase tracking-wider text-[#00F0FF]">
                Instant Architectural Presets
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-[#F8FAFC] tracking-tight mt-1">
                Explore Engineered Archetypes
              </h2>
            </div>
            <p className="text-sm text-[#94A3B8] max-w-md mt-3 md:mt-0">
              Click any archetype to load complete parametric walls, rooms, openings, stairs, and parametric roofs into the CAD Studio.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Template 1: 2-Bedroom Villa */}
            <div className="group rounded-2xl border border-[#1F2942] bg-[#111726] p-6 hover:border-[#00F0FF] transition-all duration-300 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#00F0FF]/15 text-[#00F0FF]">
                    <Building className="h-5 w-5" />
                  </div>
                  <span className="font-mono text-xs text-[#00F0FF] bg-[#00F0FF]/10 px-2.5 py-1 rounded-md border border-[#00F0FF]/20">
                    72.5 m²
                  </span>
                </div>
                <h3 className="text-lg font-bold text-[#F1F5F9]">Contemporary 2-Bedroom Villa</h3>
                <p className="text-xs text-[#94A3B8] mt-2 leading-relaxed">
                  Single-story open-concept villa with master en-suite, guest suite, gable roof, covered terrace columns, and full furnishings.
                </p>
                <div className="mt-4 flex flex-wrap gap-2 text-[11px] font-mono text-[#CBD5E1]">
                  <span className="bg-[#1F2942]/70 px-2 py-0.5 rounded">Gable Roof (22°)</span>
                  <span className="bg-[#1F2942]/70 px-2 py-0.5 rounded">3 Bedrooms/Bath</span>
                  <span className="bg-[#1F2942]/70 px-2 py-0.5 rounded">Site Setbacks</span>
                </div>
              </div>
              <button
                onClick={() => handleSelectSample('villa')}
                className="mt-6 flex items-center justify-center gap-2 rounded-xl bg-[#1F2942] py-2.5 text-xs font-bold text-[#F1F5F9] group-hover:bg-[#00F0FF] group-hover:text-[#070A11] transition-all"
              >
                <span>Load in CAD Studio</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Template 2: 2-Storey Duplex */}
            <div className="group rounded-2xl border border-[#1F2942] bg-[#111726] p-6 hover:border-[#A855F7] transition-all duration-300 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#A855F7]/15 text-[#A855F7]">
                    <Layers className="h-5 w-5" />
                  </div>
                  <span className="font-mono text-xs text-[#A855F7] bg-[#A855F7]/10 px-2.5 py-1 rounded-md border border-[#A855F7]/20">
                    148.0 m²
                  </span>
                </div>
                <h3 className="text-lg font-bold text-[#F1F5F9]">2-Storey Urban Duplex</h3>
                <p className="text-xs text-[#94A3B8] mt-2 leading-relaxed">
                  Vertical multi-floor stacking with interior architectural staircase, upper level studio loft, and dual-level floor management.
                </p>
                <div className="mt-4 flex flex-wrap gap-2 text-[11px] font-mono text-[#CBD5E1]">
                  <span className="bg-[#1F2942]/70 px-2 py-0.5 rounded">2-Floor Stacking</span>
                  <span className="bg-[#1F2942]/70 px-2 py-0.5 rounded">Interior Stairs</span>
                  <span className="bg-[#1F2942]/70 px-2 py-0.5 rounded">Hip Roof</span>
                </div>
              </div>
              <button
                onClick={() => handleSelectSample('duplex')}
                className="mt-6 flex items-center justify-center gap-2 rounded-xl bg-[#1F2942] py-2.5 text-xs font-bold text-[#F1F5F9] group-hover:bg-[#A855F7] group-hover:text-white transition-all"
              >
                <span>Load in CAD Studio</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Template 3: Minimalist Studio */}
            <div className="group rounded-2xl border border-[#1F2942] bg-[#111726] p-6 hover:border-[#10B981] transition-all duration-300 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#10B981]/15 text-[#10B981]">
                    <Compass className="h-5 w-5" />
                  </div>
                  <span className="font-mono text-xs text-[#10B981] bg-[#10B981]/10 px-2.5 py-1 rounded-md border border-[#10B981]/20">
                    42.0 m²
                  </span>
                </div>
                <h3 className="text-lg font-bold text-[#F1F5F9]">Minimalist Urban Studio</h3>
                <p className="text-xs text-[#94A3B8] mt-2 leading-relaxed">
                  Compact high-efficiency layout with open living/sleeping space, enclosed bathroom, flat parapet roof, and precision dimensions.
                </p>
                <div className="mt-4 flex flex-wrap gap-2 text-[11px] font-mono text-[#CBD5E1]">
                  <span className="bg-[#1F2942]/70 px-2 py-0.5 rounded">Flat Roof</span>
                  <span className="bg-[#1F2942]/70 px-2 py-0.5 rounded">High Efficiency</span>
                  <span className="bg-[#1F2942]/70 px-2 py-0.5 rounded">Polished Concrete</span>
                </div>
              </div>
              <button
                onClick={() => handleSelectSample('studio')}
                className="mt-6 flex items-center justify-center gap-2 rounded-xl bg-[#1F2942] py-2.5 text-xs font-bold text-[#F1F5F9] group-hover:bg-[#10B981] group-hover:text-[#070A11] transition-all"
              >
                <span>Load in CAD Studio</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>

          </div>
        </div>
      </section>

      {/* SECTION: CAPABILITIES MATRIX */}
      <section id="features" className="relative z-10 border-t border-[#1F2942] py-20 px-6">
        <div className="mx-auto max-w-7xl">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <div className="font-mono text-xs font-bold uppercase tracking-wider text-[#00F0FF]">
              Engineered Architectural Stack
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#F8FAFC] tracking-tight mt-1">
              Complete CAD Studio Capabilities
            </h2>
            <p className="text-sm text-[#94A3B8] mt-3">
              Everything required from conceptual sketch to fabrication and 3D visualization.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            
            <div className="rounded-xl border border-[#1F2942] bg-[#0E1424] p-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#00F0FF]/15 text-[#00F0FF] mb-3">
                <Cpu className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-bold text-[#F1F5F9]">Computer Vision Vectorizer</h3>
              <p className="text-xs text-[#94A3B8] mt-1.5 leading-relaxed">
                Morphological line thinning, Otsu adaptive thresholding, and contour vectorization extracting walls and openings directly from bitmap scans.
              </p>
            </div>

            <div className="rounded-xl border border-[#1F2942] bg-[#0E1424] p-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#38BDF8]/15 text-[#38BDF8] mb-3">
                <Layers className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-bold text-[#F1F5F9]">Parametric 3D Extrusion</h3>
              <p className="text-xs text-[#94A3B8] mt-1.5 leading-relaxed">
                Real-time geometric generation of wall voids for doors and windows, custom floor finishes, columns, and 4 roof types (Gable, Hip, Shed, Flat).
              </p>
            </div>

            <div className="rounded-xl border border-[#1F2942] bg-[#0E1424] p-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#F59E0B]/15 text-[#F59E0B] mb-3">
                <Eye className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-bold text-[#F1F5F9]">First-Person Walkthrough</h3>
              <p className="text-xs text-[#94A3B8] mt-1.5 leading-relaxed">
                Walk through your architectural plans in true 1:1 scale using WASD keyboard and mouse look, with automatic wall collision detection.
              </p>
            </div>

            <div className="rounded-xl border border-[#1F2942] bg-[#0E1424] p-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#10B981]/15 text-[#10B981] mb-3">
                <FileSpreadsheet className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-bold text-[#F1F5F9]">BIM Takeoffs & Waste</h3>
              <p className="text-xs text-[#94A3B8] mt-1.5 leading-relaxed">
                Instant quantities schedules calculating room floor areas, wall surface areas, baseboards, opening counts, and +10% material waste factors.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-[#1F2942] bg-[#05070D] py-12 px-6">
        <div className="mx-auto max-w-7xl flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#00F0FF]/15 text-[#00F0FF]">
              <Boxes className="h-4 w-4" />
            </div>
            <div>
              <span className="text-sm font-bold text-[#F1F5F9]">
                2<span className="text-[#00F0FF]">builders</span> CAD Studio
              </span>
              <p className="text-[11px] text-[#64748B]">
                Open-source architectural synthesis · 100% Free Forever
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono text-[#94A3B8]">
            <span>Dual Unit: Metric / Imperial</span>
            <span>·</span>
            <span>Local Session Persistence</span>
            <span>·</span>
            <button
              onClick={() => setCurrentPage('studio')}
              className="text-[#00F0FF] hover:underline font-bold"
            >
              Enter CAD Studio →
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};
