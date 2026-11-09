import React, { useState, useEffect } from 'react';
import {
  Folder,
  Clock,
  Trash2,
  Box,
  ArrowRight,
  Building2,
  Check,
  Sparkles,
  Upload,
  FileText,
  Compass,
  Footprints,
  Layers,
  ShieldCheck,
  HelpCircle,
  Play,
  Zap,
  Sliders,
  CheckCircle2,
  Flame,
  Download,
  ChevronDown,
  Eye,
  Maximize2,
  Lock,
  Cpu,
  Palette,
  Sun,
  Camera
} from 'lucide-react';
import { Project } from '../types';
import { useProjectStore } from '../store/useProjectStore';
import { FileViewerGuideModal } from './FileViewerGuideModal';
import { BeforeAfterSlider } from './BeforeAfterSlider';
import { toast, ToastContainer } from './Toast';

interface DashboardProps {
  onSelectProject: (projectId: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onSelectProject }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [analysisStep, setAnalysisStep] = useState<string>('queued');
  const [analysisPercent, setAnalysisPercent] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isWindowDragging, setIsWindowDragging] = useState<boolean>(false);

  // 2builders Futuristic Options
  const [interiorStyle, setInteriorStyle] = useState<string>('Modern');
  const [ceilingHeightMm, setCeilingHeightMm] = useState<number>(3050); // 10'
  const [isFurnished, setIsFurnished] = useState<boolean>(true);
  const [northDeg, setNorthDeg] = useState<number>(0);
  const [activeFeatureTab, setActiveFeatureTab] = useState<string>('centerlines');
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const setProject = useProjectStore((s) => s.setProject);
  const setStatusMessage = useProjectStore((s) => s.setStatusMessage);
  const setReviewModalOpen = useProjectStore((s) => s.setReviewModalOpen);
  const setTwoBuildersPlan = useProjectStore((s) => s.setTwoBuildersPlan);

  const fetchProjects = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/projects');
      if (res.ok) {
        const data = await res.json();
        setProjects(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  // Global window drag & drop handler
  useEffect(() => {
    let dragCounter = 0;

    const handleWindowDragEnter = (e: DragEvent) => {
      e.preventDefault();
      dragCounter++;
      if (e.dataTransfer && e.dataTransfer.types.includes('Files')) {
        setIsWindowDragging(true);
      }
    };

    const handleWindowDragLeave = (e: DragEvent) => {
      e.preventDefault();
      dragCounter--;
      if (dragCounter <= 0) {
        setIsWindowDragging(false);
        dragCounter = 0;
      }
    };

    const handleWindowDragOver = (e: DragEvent) => {
      e.preventDefault();
    };

    const handleWindowDrop = (e: DragEvent) => {
      e.preventDefault();
      dragCounter = 0;
      setIsWindowDragging(false);
      setIsDragging(false);
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        const file = e.dataTransfer.files[0];
        handleUploadAndAnalyse(file);
      }
    };

    window.addEventListener('dragenter', handleWindowDragEnter);
    window.addEventListener('dragleave', handleWindowDragLeave);
    window.addEventListener('dragover', handleWindowDragOver);
    window.addEventListener('drop', handleWindowDrop);

    return () => {
      window.removeEventListener('dragenter', handleWindowDragEnter);
      window.removeEventListener('dragleave', handleWindowDragLeave);
      window.removeEventListener('dragover', handleWindowDragOver);
      window.removeEventListener('drop', handleWindowDrop);
    };
  }, []);

  // Helper to downscale large camera / phone images client-side before uploading
  const compressImageIfNeeded = async (file: File): Promise<File> => {
    if (!file.type.startsWith('image/')) return file;
    if (file.size <= 3 * 1024 * 1024) return file;
    return new Promise((resolve) => {
      const img = new Image();
      const reader = new FileReader();
      reader.onload = (e) => {
        img.onload = () => {
          const maxDim = 2048;
          let { width, height } = img;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) return resolve(file);
          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob(
            (blob) => {
              if (blob && blob.size < file.size) {
                resolve(new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' }));
              } else {
                resolve(file);
              }
            },
            'image/jpeg',
            0.88
          );
        };
        img.src = e.target?.result as string;
      };
      reader.onerror = () => resolve(file);
      reader.readAsDataURL(file);
    });
  };

  // 2builders 6-Step Pipeline Execution
  const handleUploadAndAnalyse = async (inputFile: File) => {
    // Validate file type
    const validExts = ['.jpg', '.jpeg', '.png', '.webp', '.pdf', '.dxf'];
    const isImage = inputFile.type.startsWith('image/');
    const isPdf = inputFile.type === 'application/pdf' || inputFile.name.toLowerCase().endsWith('.pdf');
    const hasValidExt = validExts.some(ext => inputFile.name.toLowerCase().endsWith(ext));

    if (!isImage && !isPdf && !hasValidExt) {
      toast.error('Please upload an architectural floor plan image (JPG, PNG, WebP) or PDF file.');
      return;
    }

    setIsUploading(true);
    setAnalysisStep('preprocessing');
    setAnalysisPercent(15);
    setStatusMessage(`Preparing "${inputFile.name}" for upload...`);

    try {
      const file = await compressImageIfNeeded(inputFile);

      if (file.size > 4.5 * 1024 * 1024) {
        throw new Error(`File size (${(file.size / (1024 * 1024)).toFixed(1)}MB) exceeds the 4.5MB limit. Please upload a compressed JPG/PNG or PDF.`);
      }

      setStatusMessage(`Analyzing "${file.name}" with 2builders geometry engine...`);
      setAnalysisStep('segmenting');
      setAnalysisPercent(30);

      // 1. Try high-performance 1-step direct conversion (eliminates serverless multi-container desync)
      const formData = new FormData();
      formData.append('file', file);
      formData.append('interiorStyle', interiorStyle);
      formData.append('ceilingHeightMm', String(ceilingHeightMm));
      formData.append('furnished', String(isFurnished));
      formData.append('northDeg', String(northDeg));
      formData.append('realWidthM', '9.0');

      let convRes: Response | null = null;
      try {
        convRes = await fetch('/api/v1/plans/convert', {
          method: 'POST',
          body: formData
        });
      } catch {
        convRes = null;
      }

      if (convRes && convRes.ok) {
        setAnalysisStep('vectorising');
        setAnalysisPercent(90);
        setStatusMessage('Synthesizing 3D dollhouse geometry & Vastu zones...');

        const convText = await convRes.text();
        let convData: any;
        try {
          convData = JSON.parse(convText);
        } catch {
          throw new Error(convText.slice(0, 200) || 'Invalid response from 2builders server');
        }

        const planDoc = convData.plan;
        const projData = convData.project;
        const planId = convData.planId;

        setProject(projData);
        setTwoBuildersPlan(planDoc);
        setAnalysisPercent(100);
        setAnalysisStep('needs_review');

        toast.success(`Generated 3D Model: ${planDoc?.walls?.length || 0} walls & ${planDoc?.rooms?.length || 0} rooms!`);
        useProjectStore.getState().setViewMode('3d');
        setReviewModalOpen(true);
        setStatusMessage(`Generated 3D Model from ${file.name}`);
        onSelectProject(planId);
        return;
      }

      // Fallback: Two-step upload & analyse
      setStatusMessage(`Uploading "${file.name}" to 2builders...`);
      setAnalysisStep('uploading');
      setAnalysisPercent(20);

      const upFormData = new FormData();
      upFormData.append('file', file);

      const upRes = await fetch('/api/v1/plans/upload', {
        method: 'POST',
        body: upFormData
      });

      if (!upRes.ok) {
        let errorMsg = `Upload failed (${upRes.status})`;
        try {
          const rawText = await upRes.text();
          try {
            const err = JSON.parse(rawText);
            errorMsg = err.detail || err.message || errorMsg;
          } catch {
            if (upRes.status === 413 || rawText.includes('413') || rawText.toLowerCase().includes('too large')) {
              errorMsg = 'File is too large for serverless processing (max 4.5MB). Please upload a smaller image or compressed PDF.';
            } else if (rawText) {
              errorMsg = rawText.slice(0, 200);
            }
          }
        } catch (e: any) {
          errorMsg = e.message || errorMsg;
        }
        throw new Error(errorMsg);
      }

      const upText = await upRes.text();
      let upData: any;
      try {
        upData = JSON.parse(upText);
      } catch {
        throw new Error(upText.slice(0, 200) || 'Invalid response from upload server');
      }
      const planId = upData.planId;

      setAnalysisStep('segmenting');
      setAnalysisPercent(50);
      setStatusMessage('Extracting structural walls & double-line cavities...');

      // 2. Start Analysis with Options
      const anaRes = await fetch(`/api/v1/plans/${planId}/analyse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          interiorStyle,
          ceilingHeightMm,
          furnished: isFurnished,
          northDeg,
          realWidthM: 9.0
        })
      });

      setAnalysisStep('reading_text');
      setAnalysisPercent(75);
      setStatusMessage('Reading dimension annotations and classifying rooms...');

      if (!anaRes.ok) {
        let errorMsg = `Analysis failed (${anaRes.status})`;
        try {
          const rawText = await anaRes.text();
          try {
            const err = JSON.parse(rawText);
            errorMsg = err.detail || err.message || errorMsg;
          } catch {
            if (rawText) errorMsg = rawText.slice(0, 200);
          }
        } catch (e: any) {
          errorMsg = e.message || errorMsg;
        }
        throw new Error(errorMsg);
      }

      setAnalysisStep('vectorising');
      setAnalysisPercent(95);
      setStatusMessage('Computing Vastu zones & building 3D geometry...');

      const anaText = await anaRes.text();
      let anaData: any;
      try {
        anaData = JSON.parse(anaText);
      } catch {
        throw new Error(anaText.slice(0, 200) || 'Invalid response from analysis server');
      }
      const planDoc = anaData.plan;

      // Load into project store
      const projRes = await fetch(`/api/projects/${planId}`);
      if (projRes.ok) {
        const projData = await projRes.json();
        setProject(projData);
        setTwoBuildersPlan(planDoc);
        setAnalysisPercent(100);
        setAnalysisStep('needs_review');

        toast.success(`Generated 3D Model: ${planDoc?.walls?.length || 0} walls & ${planDoc?.rooms?.length || 0} rooms!`);

        // Open 3D View and trigger Review Modal
        useProjectStore.getState().setViewMode('3d');
        setReviewModalOpen(true);
        setStatusMessage(`Generated 3D Model from ${file.name}`);
        onSelectProject(planId);
      }
    } catch (err: any) {
      toast.error(`Error converting plan: ${err.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleUploadAndAnalyse(e.target.files[0]);
    }
  };

  const handleLoadSample = async (samplePath: string, sampleName: string) => {
    setIsUploading(true);
    setStatusMessage(`Loading demo "${sampleName}"...`);
    try {
      const res = await fetch(samplePath);
      if (!res.ok) throw new Error('Failed to load sample floor plan');
      const blob = await res.blob();
      const ext = samplePath.endsWith('.webp') ? '.webp' : '.jpg';
      const file = new File([blob], `${sampleName.toLowerCase().replace(/[\s-]+/g, '_')}${ext}`, {
        type: blob.type || 'image/jpeg'
      });
      await handleUploadAndAnalyse(file);
    } catch (err: any) {
      toast.error(`Error loading sample: ${err.message}`);
      setIsUploading(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this project?')) return;
    try {
      await fetch(`/api/projects/${id}`, { method: 'DELETE' });
      toast.info('Project deleted');
      fetchProjects();
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete project');
    }
  };

  const stylePresets = [
    {
      id: 'Modern',
      name: 'Modern Minimalist',
      tagline: 'Carrara Marble • Matte Black • Gallery White',
      gradient: 'from-sky-500/20 to-indigo-500/20',
      border: 'border-sky-500/40'
    },
    {
      id: 'Warm Minimalist',
      name: 'Japandi Warm Wood',
      tagline: 'White Oak Parquet • Linen • Soft Daylight',
      gradient: 'from-amber-500/20 to-orange-500/20',
      border: 'border-amber-500/40'
    },
    {
      id: 'Contemporary Indian',
      name: 'Contemporary Vastu Prime',
      tagline: 'Teak Accents • Harmonized Energy Zones',
      gradient: 'from-emerald-500/20 to-teal-500/20',
      border: 'border-emerald-500/40'
    },
    {
      id: 'Industrial',
      name: 'Urban Industrial Loft',
      tagline: 'Polished Concrete • Steel Beams • Panorama Glass',
      gradient: 'from-purple-500/20 to-pink-500/20',
      border: 'border-purple-500/40'
    }
  ];

  const samplePlans = [
    {
      id: 'sample_1',
      title: 'Modern 3BHK Residence',
      subtitle: '9 Enclosed Rooms • 142 sqm',
      vastu: 'A (85/100)',
      image: '/samples/modern_3bhk.jpg',
      badge: 'Popular Choice'
    },
    {
      id: 'sample_2',
      title: 'Luxury 2-Story Villa',
      subtitle: '10 Enclosed Rooms • 260 sqm',
      vastu: 'A+ (92/100)',
      image: '/samples/luxury_villa.jpg',
      badge: 'Vastu Prime'
    },
    {
      id: 'sample_3',
      title: 'Furnished Studio Apartment',
      subtitle: '9 Partitions • 68 sqm',
      vastu: 'A (80/100)',
      image: '/samples/studio_apartment.webp',
      badge: 'Compact ADU'
    }
  ];

  const faqs = [
    {
      q: 'How does 2builders detect walls with zero overlaps?',
      a: 'Unlike generative AI models that hallucinate fake geometry, 2builders uses deterministic computer vision: medial axis skeletonization and iterative parallel cavity consolidation. Any parallel strokes within wall thickness are unified into a single structural centerline.'
    },
    {
      q: 'Can I export the 3D model into AutoCAD, Blender, or 3D printers?',
      a: 'Yes. 2builders offers 1-click exports to standard glTF 2.0 Binary (GLB), Wavefront OBJ, 3D printing STL, vector SVG blueprints, and publication-ready ISO A4 vector PDF documents with professional title blocks.'
    },
    {
      q: 'How does the automated Vastu Shastra 8-Zone analysis work?',
      a: 'The engine calculates the geometric energy center (Brahmasthan) of your building envelope and projects 8 directional zones (N, NE, E, SE, S, SW, W, NW) aligned to magnetic North, scoring Kitchen (Agni), Master Bedroom (Prithvi), Bathrooms, and Entryways.'
    },
    {
      q: 'Is my uploaded floor plan private and secure?',
      a: 'Absolutely. 2builders does not train public AI models on your drawings. All geometric analysis is run in isolated memory and stored only for your project sessions.'
    }
  ];

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col font-sans selection:bg-sky-500 selection:text-slate-950 relative overflow-y-auto">
      {/* Background Architectural Grid Effect */}
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#1e293b12_1px,transparent_1px),linear-gradient(to_bottom,#1e293b12_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[1100px] h-[450px] bg-gradient-to-b from-sky-500/15 via-indigo-600/10 to-transparent blur-3xl pointer-events-none" />

      {/* Global Full-Window Drag Drop Overlay */}
      {isWindowDragging && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-xl border-4 border-dashed border-sky-400 flex flex-col items-center justify-center animate-in fade-in duration-150 pointer-events-none">
          <div className="w-24 h-24 rounded-3xl bg-sky-500/20 border-2 border-sky-400 flex items-center justify-center text-sky-400 shadow-2xl shadow-sky-500/40 animate-bounce mb-6">
            <Upload size={48} />
          </div>
          <h2 className="text-3xl font-black text-white tracking-tight mb-2">Release to Build 3D Model</h2>
          <p className="text-sm font-medium text-sky-300">Drop your floor plan image or PDF anywhere to start instant reconstruction</p>
        </div>
      )}

      {/* Top 2builders Navigation Bar */}
      <header className="h-16 border-b border-white/[0.08] px-4 sm:px-8 flex items-center justify-between bg-slate-950/80 backdrop-blur-xl sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 via-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-sky-500/25 shrink-0 ring-1 ring-white/20">
            <Building2 size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-black tracking-wider text-white">2BUILDERS</h1>
              <span className="text-[9px] bg-gradient-to-r from-sky-500/20 to-indigo-500/20 text-sky-300 border border-sky-400/40 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                Plan to 3D v2.0
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">Deterministic Architectural 3D Reconstruction & Vastu Engine</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 sm:gap-3 text-xs">
          <button
            onClick={() => {
              useProjectStore.getState().setViewerGuideFormat('glb');
              useProjectStore.getState().setViewerGuideOpen(true);
            }}
            className="flex items-center gap-1.5 text-sky-300 hover:text-sky-200 bg-sky-950/60 hover:bg-sky-900/60 border border-sky-500/40 px-3 py-1.5 rounded-full font-semibold transition-all shadow-sm"
            title="Learn how to view downloaded 3D models and blueprints locally"
          >
            <HelpCircle size={14} className="text-sky-400" />
            <span>Viewer Guide</span>
          </button>
          <span className="hidden md:flex items-center gap-2 text-emerald-400 font-mono bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 rounded-full text-[11px] font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Non-AI Geometry Engine</span>
          </span>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-8 py-8 sm:py-12 space-y-12 sm:space-y-16 relative z-10">
        
        {/* HERO TITLE & STATS PILLS */}
        <div className="text-center space-y-4 max-w-3xl mx-auto pt-2">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-sky-500/10 via-indigo-500/10 to-purple-500/10 border border-sky-500/30 text-sky-300 text-xs font-semibold shadow-inner">
            <Sparkles size={14} className="text-sky-400 animate-pulse" />
            <span>Next-Gen Architectural AI & Deterministic 3D Engine</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-[1.15]">
            Transform Any 2D Floor Plan Into a <span className="bg-gradient-to-r from-sky-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent">Living 3D World</span>
          </h2>
          
          <p className="text-xs sm:text-base text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Upload any brochure drawing, sketch, or PDF. 2builders vectorizes non-overlapping structural walls, computes 8-zone Vastu Shastra energy grids, and builds interactive 3D dollhouses in under 5 seconds.
          </p>

          {/* Quick Stats Ticker */}
          <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2 text-[11px] font-mono text-slate-400">
            <span className="flex items-center gap-1.5 bg-slate-900/80 border border-slate-800 px-3 py-1 rounded-full">
              <CheckCircle2 size={13} className="text-emerald-400" />
              <span>Zero Overlapping Walls</span>
            </span>
            <span className="flex items-center gap-1.5 bg-slate-900/80 border border-slate-800 px-3 py-1 rounded-full">
              <Compass size={13} className="text-amber-400" />
              <span>8-Zone Vastu Shastra</span>
            </span>
            <span className="flex items-center gap-1.5 bg-slate-900/80 border border-slate-800 px-3 py-1 rounded-full">
              <Zap size={13} className="text-sky-400" />
              <span>Sub-5s Synthesis</span>
            </span>
            <span className="flex items-center gap-1.5 bg-slate-900/80 border border-slate-800 px-3 py-1 rounded-full">
              <Download size={13} className="text-purple-400" />
              <span>GLB • OBJ • STL • PDF</span>
            </span>
          </div>
        </div>

        {/* INTERACTIVE 2D ↔ 3D BEFORE/AFTER COMPARISON SLIDER */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-sky-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Interactive Transformation Preview (Drag to Compare)
              </h3>
            </div>
            <span className="text-[11px] text-slate-500 hidden sm:inline">Real-time vectorization & PBR 3D synthesis</span>
          </div>

          <BeforeAfterSlider
            beforeImage="/samples/modern_3bhk.jpg"
            afterImage="/samples/live_3d_render.jpg"
            beforeLabel="2D Blueprint Input"
            afterLabel="Living 3D Model Output"
            onExploreDemo={() => handleLoadSample('/samples/modern_3bhk.jpg', 'Modern 3BHK Residence')}
          />
        </div>

        {/* HERO DROPZONE & OPTIONS */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsDragging(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsDragging(false);
          }}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsDragging(false);
            if (e.dataTransfer.files && e.dataTransfer.files[0]) {
              handleUploadAndAnalyse(e.dataTransfer.files[0]);
            }
          }}
          className={`relative overflow-hidden rounded-3xl p-[1px] transition-all duration-300 shadow-2xl ${
            isDragging
              ? 'bg-gradient-to-r from-sky-400 via-indigo-500 to-purple-500 scale-[1.01] shadow-sky-500/30'
              : 'bg-gradient-to-r from-sky-500/20 via-indigo-500/20 to-purple-500/20 hover:from-sky-500/40 hover:to-indigo-500/40'
          }`}
        >
          <div className="bg-[#0b1220]/95 backdrop-blur-xl rounded-[23px] p-5 sm:p-8 space-y-6">
            
            {/* Visual Interior Style Cards */}
            <div className="space-y-2 text-left">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Select Architectural & Interior Style
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
                {stylePresets.map((sp) => {
                  const isSelected = interiorStyle === sp.id;
                  return (
                    <button
                      key={sp.id}
                      type="button"
                      onClick={() => setInteriorStyle(sp.id)}
                      className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                        isSelected
                          ? 'bg-sky-950/40 border-sky-400 shadow-lg shadow-sky-500/15'
                          : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-xs text-slate-100">{sp.name}</span>
                          {isSelected && <CheckCircle2 size={13} className="text-sky-400" />}
                        </div>
                        <p className="text-[10px] text-slate-400 leading-tight">{sp.tagline}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Ceiling Height & Furnishing Mode Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3.5 sm:p-4 rounded-xl bg-slate-950/70 border border-slate-800/80 text-left">
              {/* Ceiling Height */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                  Ceiling Height
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { label: "9' (2.7m)", val: 2743 },
                    { label: "10' (3.0m)", val: 3050 },
                    { label: "11' (3.3m)", val: 3353 }
                  ].map((c) => (
                    <button
                      key={c.val}
                      type="button"
                      onClick={() => setCeilingHeightMm(c.val)}
                      className={`py-2 rounded-xl text-[11px] font-bold transition-all border ${
                        ceilingHeightMm === c.val
                          ? 'bg-sky-500 border-sky-400 text-slate-950 shadow-md shadow-sky-500/25'
                          : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Furnishing Mode */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                  Furnishing Mode
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setIsFurnished(true)}
                    className={`py-2 rounded-xl text-[11px] font-bold transition-all border ${
                      isFurnished
                        ? 'bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-600/30'
                        : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    🛋️ Furnished
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsFurnished(false)}
                    className={`py-2 rounded-xl text-[11px] font-bold transition-all border ${
                      !isFurnished
                        ? 'bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-600/30'
                        : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    🏢 Empty Shell
                  </button>
                </div>
              </div>
            </div>

            {/* Upload Drop Target Card */}
            <input
              type="file"
              id="hero-file-upload"
              accept=".jpg,.jpeg,.png,.webp,.pdf,.dxf"
              onChange={handleFileInput}
              className="hidden"
              disabled={isUploading}
            />
            <label
              htmlFor="hero-file-upload"
              className={`cursor-pointer flex flex-col items-center justify-center p-8 sm:p-10 rounded-2xl border-2 border-dashed transition-all duration-200 text-center ${
                isDragging
                  ? 'border-sky-400 bg-sky-500/10'
                  : 'border-slate-700/80 hover:border-sky-500/60 bg-slate-950/40 hover:bg-slate-900/50'
              }`}
            >
              <div className="p-4 rounded-2xl bg-gradient-to-tr from-sky-500/20 to-indigo-600/20 border border-sky-500/30 text-sky-400 shadow-inner group-hover:scale-110 transition-transform mb-3">
                <Upload size={40} className={isUploading ? 'animate-bounce' : isDragging ? 'scale-125 transition-transform' : 'animate-pulse'} />
              </div>
              
              <div className="space-y-1.5">
                <h3 className="text-lg sm:text-2xl font-black text-slate-100 flex items-center justify-center gap-2">
                  <span>{isDragging ? 'Drop Your Floor Plan File Here' : 'Drag & Drop Floor Plan Here or Browse'}</span>
                  <Sparkles size={20} className="text-sky-400" />
                </h3>
                <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
                  Brochure scans, hand drawings, photos, JPG, PNG, WebP, or vector PDF (up to 10MB).
                </p>
              </div>

              {/* Analysis Progress Bar */}
              {isUploading ? (
                <div className="w-full max-w-md mt-6 space-y-2.5">
                  <div className="flex justify-between text-xs font-mono text-slate-300">
                    <span className="capitalize">{analysisStep.replace('_', ' ')}...</span>
                    <span className="text-sky-400 font-bold">{analysisPercent}%</span>
                  </div>
                  <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden border border-slate-700 p-0.5">
                    <div
                      className="h-full bg-gradient-to-r from-sky-400 via-indigo-500 to-purple-500 transition-all duration-300 rounded-full shadow-lg shadow-sky-500/50"
                      style={{ width: `${analysisPercent}%` }}
                    />
                  </div>
                </div>
              ) : (
                <div className="pt-4">
                  <span className="inline-flex items-center gap-2 px-7 py-3.5 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-black text-xs sm:text-sm rounded-xl shadow-xl shadow-sky-500/25 transition-all transform active:scale-95">
                    <Upload size={16} />
                    <span>Upload & Generate 3D Model</span>
                  </span>
                </div>
              )}

              <div className="text-[11px] text-slate-500 font-mono pt-3">
                Deterministic Geometry Engine • Exact Sub-Millimeter Scale • 100% Client-Safe
              </div>
            </label>
          </div>
        </div>

        {/* 1-CLICK DEMO SAMPLES SHOWCASE */}
        <div className="space-y-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-amber-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Or Try With Instant 1-Click Demos
              </h3>
            </div>
            <span className="text-[11px] text-slate-500 hidden sm:inline">No file on hand? Click any sample below to build 3D instantly</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            {samplePlans.map((s) => (
              <div
                key={s.id}
                onClick={() => !isUploading && handleLoadSample(s.image, s.title)}
                className="group relative bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-sky-500/60 rounded-2xl p-3.5 cursor-pointer transition-all shadow-md hover:shadow-xl hover:shadow-sky-500/10 flex flex-col justify-between"
              >
                <div className="space-y-2.5">
                  <div className="relative h-32 rounded-xl overflow-hidden bg-slate-950 border border-slate-800/80">
                    <img
                      src={s.image}
                      alt={s.title}
                      className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300 opacity-80 group-hover:opacity-100"
                    />
                    <div className="absolute top-2 right-2 bg-slate-950/80 backdrop-blur px-2 py-0.5 rounded-full border border-slate-700/80 text-[10px] font-bold text-amber-300">
                      Vastu {s.vastu}
                    </div>
                    <div className="absolute top-2 left-2 bg-sky-500/20 backdrop-blur border border-sky-400/40 text-sky-300 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase">
                      {s.badge}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-bold text-xs sm:text-sm text-slate-100 group-hover:text-sky-300 transition-colors">
                      {s.title}
                    </h4>
                    <p className="text-[11px] text-slate-400 font-mono">{s.subtitle}</p>
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-sky-400 font-semibold">
                  <span className="flex items-center gap-1 group-hover:text-sky-300">
                    <Play size={12} className="fill-sky-400" />
                    <span>Launch 1-Click 3D</span>
                  </span>
                  <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* RECENT PROJECTS SECTION */}
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Folder size={15} className="text-sky-400" />
              <span>Your Saved 3D Homes ({projects.length})</span>
            </h3>
          </div>

          {isLoading ? (
            <div className="text-center py-16 text-slate-500 text-xs font-mono">Loading projects...</div>
          ) : projects.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-slate-800 rounded-2xl bg-slate-900/40 space-y-2">
              <p className="text-xs text-slate-400">No projects yet. Upload a plan or click a sample demo above to see your furnished 3D home!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {projects.map((p) => {
                const wallCount = p.floors.reduce((acc, f) => acc + f.walls.length, 0);
                const roomCount = p.floors.reduce((acc, f) => acc + f.rooms.length, 0);

                return (
                  <div
                    key={p.id}
                    onClick={() => {
                      useProjectStore.getState().setViewMode('3d');
                      onSelectProject(p.id);
                    }}
                    className="group bg-slate-900/90 border border-slate-800 hover:border-sky-500/60 p-4 rounded-2xl cursor-pointer transition-all shadow-md flex flex-col justify-between hover:scale-[1.01]"
                  >
                    <div className="space-y-2.5">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2">
                          <Folder size={16} className="text-sky-400 shrink-0" />
                          <span className="font-bold text-slate-100 text-xs group-hover:text-sky-300 transition-colors truncate max-w-[180px]">
                            {p.name}
                          </span>
                        </div>
                        <button
                          onClick={(e) => handleDelete(e, p.id)}
                          className="text-slate-500 hover:text-red-400 p-1 rounded transition-colors"
                          title="Delete plan"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-[10px] bg-slate-950/60 p-2.5 rounded-xl border border-slate-800 text-slate-400 font-mono">
                        <div>
                          <span className="text-slate-500 block text-[8px]">WALLS</span>
                          <span className="text-slate-200 font-bold">{wallCount}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[8px]">ROOMS</span>
                          <span className="text-slate-200 font-bold">{roomCount}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[8px]">VASTU</span>
                          <span className="text-amber-400 font-bold">A+</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-slate-800 flex justify-between items-center text-[10px] text-slate-500">
                      <span className="flex items-center gap-1">
                        <Clock size={11} />
                        {p.created_at ? new Date(p.created_at).toLocaleDateString() : 'Recent'}
                      </span>
                      <span className="text-sky-400 flex items-center gap-1 font-semibold group-hover:translate-x-1 transition-transform">
                        <span>Open 3D</span>
                        <ArrowRight size={11} />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* FUTURISTIC INTERACTIVE FEATURE DEEP DIVE */}
        <div className="pt-8 border-t border-slate-800/80 space-y-6">
          <div className="text-center space-y-1.5 max-w-2xl mx-auto">
            <h3 className="text-xs font-bold uppercase tracking-wider text-sky-400">
              Architectural Engine Capabilities
            </h3>
            <h2 className="text-xl sm:text-2xl font-black text-white">
              Built Like Professional CAD, Automated with Vision
            </h2>
            <p className="text-xs text-slate-400">Select any feature below to inspect how 2builders synthesizes your architectural data</p>
          </div>

          {/* Feature Tabs */}
          <div className="flex flex-wrap items-center justify-center gap-2 border-b border-slate-800 pb-4">
            {[
              { id: 'centerlines', label: 'Centerline Vectorization', icon: CheckCircle2 },
              { id: 'dollhouse', label: '3D Dollhouse View', icon: Box },
              { id: 'walkthrough', label: 'First-Person Walkthrough', icon: Footprints },
              { id: 'vastu', label: '8-Zone Vastu Shastra', icon: Compass },
              { id: 'exports', label: 'Universal CAD Exports', icon: Download }
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeFeatureTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveFeatureTab(tab.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                    isActive
                      ? 'bg-sky-500/20 text-sky-300 border border-sky-400/50 shadow-lg shadow-sky-500/10'
                      : 'bg-slate-900/60 border border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  <Icon size={14} className={isActive ? 'text-sky-400' : 'text-slate-500'} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Active Feature Content Card */}
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-3xl p-6 sm:p-8">
            {activeFeatureTab === 'centerlines' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                <div className="space-y-3">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold">
                    <span>Zero Overlaps Guarantee</span>
                  </div>
                  <h3 className="text-lg sm:text-xl font-black text-white">
                    Consolidated Single Centerlines from Double-Line Cavity Drawings
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Most architectural floor plans draw walls with double parallel strokes representing the cavity. 2builders uses medial axis skeletonization and iterative parallel consolidation to merge both strokes into a single, clean architectural centerline, eliminating intersecting wall meshes and z-fighting in 3D.
                  </p>
                  <ul className="space-y-1.5 text-xs text-slate-300 font-medium">
                    <li className="flex items-center gap-2">
                      <Check size={14} className="text-emerald-400" />
                      <span>Filters external dimension lines and outside measurement arrows</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check size={14} className="text-emerald-400" />
                      <span>Snaps T-junctions and L-corners with sub-millimeter precision</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check size={14} className="text-emerald-400" />
                      <span>Forms closed room polygons with automated square meter & sqft calculation</span>
                    </li>
                  </ul>
                </div>
                <div className="rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 p-4 font-mono text-[11px] text-sky-300 space-y-2">
                  <div className="text-slate-500">// Deterministic Centerline Pipeline</div>
                  <div className="text-emerald-400">✓ Cavity Closing: [kw: 12px, bridge: 48px]</div>
                  <div className="text-cyan-400">✓ Centerline Extraction: 48 walls detected</div>
                  <div className="text-amber-400">✓ Overlapping Wall Colliders: 0 (Zero)</div>
                  <div className="text-indigo-400">✓ Planar Rooms: 9 Enclosed Polygons</div>
                </div>
              </div>
            )}

            {activeFeatureTab === 'dollhouse' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                <div className="space-y-3">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-sky-500/10 border border-sky-500/30 text-sky-400 text-[10px] font-bold">
                    <span>Interactive 3D Dollhouse</span>
                  </div>
                  <h3 className="text-lg sm:text-xl font-black text-white">
                    Cut-Away 900mm Walls & PBR Realistic Lighting
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Switch between full ceiling height walls and low cut-away dollhouse views to inspect floor layouts, furniture arrangements, and spatial circulation from any orbital perspective.
                  </p>
                  <div className="flex gap-2 pt-2">
                    <span className="px-3 py-1 rounded-lg bg-slate-950 border border-slate-800 text-[11px] text-slate-300 font-semibold">OrbitControls 360°</span>
                    <span className="px-3 py-1 rounded-lg bg-slate-950 border border-slate-800 text-[11px] text-slate-300 font-semibold">Isometric Camera</span>
                    <span className="px-3 py-1 rounded-lg bg-slate-950 border border-slate-800 text-[11px] text-slate-300 font-semibold">PBR Sun Lighting</span>
                  </div>
                </div>
                <div className="h-44 rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 relative">
                  <img src="/samples/live_3d_render.jpg" alt="Dollhouse" className="w-full h-full object-cover opacity-80" />
                </div>
              </div>
            )}

            {activeFeatureTab === 'walkthrough' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                <div className="space-y-3">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-[10px] font-bold">
                    <span>First-Person Exploration</span>
                  </div>
                  <h3 className="text-lg sm:text-xl font-black text-white">
                    Walk Through Your Floor Plan at Eye-Level (1600mm)
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Experience your architectural drawing from the human perspective. WASD keyboard navigation, mouse look, and instant room teleportation give you the exact feel of being inside the completed home.
                  </p>
                  <div className="flex gap-2 pt-2 font-mono text-[11px] text-slate-400">
                    <span className="bg-slate-950 px-2 py-1 rounded border border-slate-800">[W][A][S][D] Move</span>
                    <span className="bg-slate-950 px-2 py-1 rounded border border-slate-800">[Mouse] Look</span>
                    <span className="bg-slate-950 px-2 py-1 rounded border border-slate-800">1600mm Eye Height</span>
                  </div>
                </div>
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 font-mono text-xs text-indigo-300 space-y-2">
                  <div>&gt; camera.position.set(rx, 1.6, rz);</div>
                  <div>&gt; collisionDetection: active [mesh bounding boxes]</div>
                  <div>&gt; miniMap: live [interactive architectural compass]</div>
                </div>
              </div>
            )}

            {activeFeatureTab === 'vastu' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                <div className="space-y-3">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-bold">
                    <span>Vastu Shastra Intelligence</span>
                  </div>
                  <h3 className="text-lg sm:text-xl font-black text-white">
                    Automated Brahmasthan & 8 Directional Energy Zones
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Evaluates directional alignments for Kitchen (Agni/SE), Master Bedroom (Earth/SW), Bathrooms, and Entryways with dosha detection and architectural score card from A+ to C.
                  </p>
                  <div className="flex gap-2 pt-2 text-[11px] font-bold text-amber-300">
                    <span>☸ 8 Sectors Aligned to Magnetic North</span>
                  </div>
                </div>
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
                  <div className="flex justify-between items-center text-amber-400 font-bold">
                    <span>Overall Vastu Compliance</span>
                    <span>92/100 (A+)</span>
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono">Brahmasthan (Center): Clear • Agni (SE): Kitchen Optimal</div>
                </div>
              </div>
            )}

            {activeFeatureTab === 'exports' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                <div className="space-y-3">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-400 text-[10px] font-bold">
                    <span>Production Deliverables</span>
                  </div>
                  <h3 className="text-lg sm:text-xl font-black text-white">
                    One-Click Exports to CAD, 3D Print, and Vector PDF
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Deliver files immediately to clients, structural engineers, or 3D visualizers in industry-standard formats with clean naming and title blocks.
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-xs font-mono text-slate-300 pt-1">
                    <span className="p-2 rounded-lg bg-slate-950 border border-slate-800">📄 Vector PDF Blueprint</span>
                    <span className="p-2 rounded-lg bg-slate-950 border border-slate-800">📦 WebGL GLB 3D</span>
                    <span className="p-2 rounded-lg bg-slate-950 border border-slate-800">📐 Wavefront OBJ</span>
                    <span className="p-2 rounded-lg bg-slate-950 border border-slate-800">🖨️ 3D Printing STL</span>
                  </div>
                </div>
                <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 text-center space-y-2">
                  <Download size={32} className="mx-auto text-purple-400 animate-pulse" />
                  <span className="text-xs font-bold text-slate-200 block">Instant Download Ready</span>
                  <span className="text-[10px] text-slate-500 font-mono">Direct browser download, no cloud waiting</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* FREQUENTLY ASKED QUESTIONS ACCORDION */}
        <div className="pt-8 border-t border-slate-800/80 space-y-4">
          <div className="text-center space-y-1">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Frequently Asked Questions
            </h3>
            <p className="text-xs text-slate-500">Everything you need to know about the 2builders Plan-to-3D engine</p>
          </div>

          <div className="space-y-2.5 max-w-2xl mx-auto">
            {faqs.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div
                  key={idx}
                  className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden transition-all"
                >
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="w-full p-4 text-left flex items-center justify-between text-xs sm:text-sm font-bold text-slate-200 hover:text-white"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown size={16} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180 text-sky-400' : ''}`} />
                  </button>
                  {isOpen && (
                    <div className="px-4 pb-4 text-xs text-slate-400 leading-relaxed border-t border-slate-800/60 pt-3 animate-in fade-in duration-150">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* FOOTER */}
        <footer className="pt-8 pb-4 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <Building2 size={16} className="text-sky-400" />
            <span className="font-bold text-slate-300">2BUILDERS</span>
            <span>— The Deterministic Plan to 3D Platform</span>
          </div>

          <div className="flex items-center gap-4 text-[11px]">
            <span>100% Deterministic Geometry</span>
            <span>•</span>
            <span>Vastu Shastra AI</span>
            <span>•</span>
            <span>v2.0 Engine</span>
          </div>
        </footer>

      </main>

      {/* Global File Viewer Guide Modal */}
      <FileViewerGuideModal />

      {/* Global Toast Container */}
      <ToastContainer />
    </div>
  );
};
