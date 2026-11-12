import React, { useState, useEffect, useRef } from 'react';
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
  Download,
  ChevronDown,
  Lock,
  Grid,
  X,
  FileCode,
  Crown
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

  // Selected file or demo state for 2-panel converter
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedDemoId, setSelectedDemoId] = useState<string | null>(null);

  // 2builders Options
  const [interiorStyle, setInteriorStyle] = useState<string>('Modern');
  const [ceilingHeightMm, setCeilingHeightMm] = useState<number>(3050); // 10'
  const [isFurnished, setIsFurnished] = useState<boolean>(true);
  const [includeVastu, setIncludeVastu] = useState<boolean>(true);
  const [northDeg, setNorthDeg] = useState<number>(0);
  const [activeFeatureTab, setActiveFeatureTab] = useState<string>('centerlines');
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const setProject = useProjectStore((s) => s.setProject);
  const setStatusMessage = useProjectStore((s) => s.setStatusMessage);
  const setReviewModalOpen = useProjectStore((s) => s.setReviewModalOpen);
  const setTwoBuildersPlan = useProjectStore((s) => s.setTwoBuildersPlan);
  const setMegaMenuOpen = useProjectStore((s) => s.setMegaMenuOpen);
  const setGeneratorModalOpen = useProjectStore((s) => s.setGeneratorModalOpen);
  const setPremiumModalOpen = useProjectStore((s) => s.setPremiumModalOpen);
  const userTier = useProjectStore((s) => s.userTier);
  const dxfBannerDismissed = useProjectStore((s) => s.dxfBannerDismissed);
  const setDxfBannerDismissed = useProjectStore((s) => s.setDxfBannerDismissed);

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
        setSelectedFile(file);
        setSelectedDemoId(null);
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
    const validExts = ['.jpg', '.jpeg', '.png', '.webp', '.pdf', '.dxf'];
    const isImage = inputFile.type.startsWith('image/');
    const isPdf = inputFile.type === 'application/pdf' || inputFile.name.toLowerCase().endsWith('.pdf');
    const hasValidExt = validExts.some((ext) => inputFile.name.toLowerCase().endsWith(ext));

    if (!isImage && !isPdf && !hasValidExt) {
      toast.error('Please upload an architectural floor plan image (JPG, PNG, WebP), PDF, or DXF file.');
      return;
    }

    setIsUploading(true);
    setAnalysisStep('preprocessing');
    setAnalysisPercent(15);
    setStatusMessage(`Preparing "${inputFile.name}" for 3D conversion...`);

    try {
      const file = await compressImageIfNeeded(inputFile);

      if (file.size > 4.5 * 1024 * 1024) {
        throw new Error(
          `File size (${(file.size / (1024 * 1024)).toFixed(1)}MB) exceeds the 4.5MB limit. Please upload a compressed JPG/PNG or PDF.`
        );
      }

      setStatusMessage(`Analyzing "${file.name}" with deterministic geometry engine...`);
      setAnalysisStep('segmenting');
      setAnalysisPercent(35);

      // High-performance 1-step direct conversion
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
        setAnalysisStep('completed');

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

      const projRes = await fetch(`/api/projects/${planId}`);
      if (projRes.ok) {
        const projData = await projRes.json();
        setProject(projData);
        setTwoBuildersPlan(planDoc);
        setAnalysisPercent(100);
        setAnalysisStep('completed');

        toast.success(`Generated 3D Model: ${planDoc?.walls?.length || 0} walls & ${planDoc?.rooms?.length || 0} rooms!`);
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
      const file = e.target.files[0];
      setSelectedFile(file);
      setSelectedDemoId(null);
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
      setSelectedFile(file);
      await handleUploadAndAnalyse(file);
    } catch (err: any) {
      toast.error(`Error loading sample: ${err.message}`);
      setIsUploading(false);
    }
  };

  const handleConvertAction = () => {
    if (selectedFile) {
      handleUploadAndAnalyse(selectedFile);
    } else if (selectedDemoId) {
      const demo = samplePlans.find((s) => s.id === selectedDemoId);
      if (demo) {
        handleLoadSample(demo.image, demo.title);
      }
    } else {
      // Default to the first sample demo if no file has been provided
      handleLoadSample('/samples/modern_3bhk.jpg', 'Modern 3BHK Residence');
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
      accent: 'border-sky-400 bg-sky-950/30 text-sky-300'
    },
    {
      id: 'Warm Minimalist',
      name: 'Japandi Warm Wood',
      tagline: 'White Oak Parquet • Linen • Soft Daylight',
      accent: 'border-amber-400 bg-amber-950/30 text-amber-300'
    },
    {
      id: 'Contemporary Indian',
      name: 'Contemporary Vastu',
      tagline: 'Teak Accents • Energy Flow Harmony',
      accent: 'border-emerald-400 bg-emerald-950/30 text-emerald-300'
    },
    {
      id: 'Industrial',
      name: 'Urban Industrial Loft',
      tagline: 'Polished Concrete • Steel Beams • Panorama Glass',
      accent: 'border-purple-400 bg-purple-950/30 text-purple-300'
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

      {/* Unified Sticky Header Container (Eliminates overlap bug completely) */}
      <div className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-xl border-b border-white/[0.08]">
        {/* Top Announcement Banner from floor-plan.ai */}
        {!dxfBannerDismissed && (
          <div className="bg-gradient-to-r from-teal-700 via-emerald-600 to-teal-700 text-white text-xs py-2 px-4 flex items-center justify-between font-medium shadow-md border-b border-emerald-500/30">
            <div className="flex items-center gap-2 mx-auto truncate">
              <span className="bg-white/20 text-white px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                <FileCode size={12} />
                DXF
              </span>
              <span className="truncate">Convert floor plan images into DXF files for CAD software.</span>
              <button
                onClick={() => setMegaMenuOpen(true)}
                className="underline font-bold text-white hover:text-emerald-200 ml-1 cursor-pointer shrink-0"
              >
                Explore CAD & Tools
              </button>
            </div>
            <button
              onClick={() => setDxfBannerDismissed(true)}
              className="p-1 text-white/80 hover:text-white hover:bg-white/10 rounded transition-colors shrink-0"
              title="Dismiss announcement"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Top 2builders Navigation Bar */}
        <header className="h-16 px-4 sm:px-8 flex items-center justify-between">
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

          <div className="flex items-center gap-2 sm:gap-3 text-xs">
            {/* Products Mega Menu Button (floor-plan.ai style) */}
            <button
              onClick={() => setMegaMenuOpen(true)}
              className="flex items-center gap-1.5 text-slate-200 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/80 px-3 py-1.5 rounded-full font-semibold transition-all shadow-sm"
              title="Explore All 19 Floor-Plan.AI Architectural Tools"
            >
              <Grid size={14} className="text-sky-400" />
              <span className="hidden sm:inline">All Tools</span>
              <span className="text-[10px] text-slate-400">▾</span>
            </button>

            {/* AI Floor Plan Generator Button */}
            <button
              onClick={() => setGeneratorModalOpen(true)}
              className="flex items-center gap-1.5 text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 border border-indigo-400/40 px-3.5 py-1.5 rounded-full font-bold transition-all shadow-md shadow-indigo-500/20"
              title="Instant AI Floor Plan Generator"
            >
              <Sparkles size={14} className="text-amber-300" />
              <span>AI Generator</span>
            </button>

            {/* 100% Free & Unlimited Badge/Button */}
            <button
              onClick={() => {
                const el = document.getElementById('pricing-section');
                if (el) {
                  el.scrollIntoView({ behavior: 'smooth' });
                } else {
                  setPremiumModalOpen(true);
                }
              }}
              className="flex items-center gap-1.5 text-emerald-300 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-400/40 px-3.5 py-1.5 rounded-full font-bold transition-all shadow-sm cursor-pointer"
              title="All 2builders tools are 100% Free & Unlimited"
            >
              <Sparkles size={14} className="text-emerald-400" />
              <span>100% Free</span>
              <span className="text-[9px] bg-emerald-500/30 text-emerald-200 px-1.5 py-0.2 rounded font-black uppercase">
                No Limits
              </span>
            </button>

            <button
              onClick={() => {
                useProjectStore.getState().setViewerGuideFormat('glb');
                useProjectStore.getState().setViewerGuideOpen(true);
              }}
              className="hidden md:flex items-center gap-1.5 text-sky-300 hover:text-sky-200 bg-sky-950/60 hover:bg-sky-900/60 border border-sky-500/40 px-3 py-1.5 rounded-full font-semibold transition-all shadow-sm"
              title="Learn how to view downloaded 3D models and blueprints locally"
            >
              <HelpCircle size={14} className="text-sky-400" />
              <span>Viewer Guide</span>
            </button>
            <span className="hidden lg:flex items-center gap-2 text-emerald-400 font-mono bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 rounded-full text-[11px] font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Non-AI Geometry Engine</span>
            </span>
          </div>
        </header>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-8 py-8 sm:py-12 space-y-12 sm:space-y-16 relative z-10">
        
        {/* HERO TITLE & INTRO */}
        <div className="text-center space-y-4 max-w-3xl mx-auto pt-2">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-sky-500/10 via-indigo-500/10 to-purple-500/10 border border-sky-500/30 text-sky-300 text-xs font-semibold shadow-inner">
            <Sparkles size={14} className="text-sky-400 animate-pulse" />
            <span>Floor Plan to 3D Model Converter (Free & Instant)</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-[1.15]">
            Convert Any 2D Floor Plan Into a <span className="bg-gradient-to-r from-sky-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent">Furnished 3D Model</span>
          </h1>
          
          <p className="text-xs sm:text-base text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Upload your brochure drawing, sketch, PDF, or CAD file. 2builders extracts watertight non-overlapping wall centerlines, computes 8-zone Vastu Shastra energy sectors, and builds interactive 3D dollhouses in seconds.
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
              <span>GLB • OBJ • STL • CAD DXF • PDF</span>
            </span>
          </div>
        </div>

        {/* FLOORDESIGN.AI 2-PANEL CONVERTER WORKSPACE (Clean, Non-Overlapping Architecture) */}
        <div className="bg-[#0b1220]/95 border border-slate-800/90 rounded-3xl shadow-2xl p-5 sm:p-8 backdrop-blur-xl relative overflow-hidden">
          {/* Subtle Accent Glow */}
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Stepper Header Bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-6 mb-6 border-b border-slate-800/80 gap-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-400 border border-sky-400/40 flex items-center justify-center font-black text-sm">
                1
              </div>
              <div>
                <h3 className="text-sm font-bold text-white tracking-wide">2D-to-3D Synthesis Studio</h3>
                <p className="text-[11px] text-slate-400">Select or drop a plan on the left, configure design options on the right</p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
              <span className="px-2.5 py-1 rounded-md bg-slate-950 border border-slate-800 text-[10px]">
                Deterministic Vision Engine
              </span>
            </div>
          </div>

          {/* If Converting: Show 4-Stage Architectural Pipeline Stepper */}
          {isUploading ? (
            <div className="py-12 px-4 sm:px-8 max-w-xl mx-auto text-center space-y-6 animate-in fade-in duration-200">
              <div className="w-16 h-16 rounded-2xl bg-sky-500/20 border border-sky-400/50 flex items-center justify-center text-sky-400 mx-auto animate-bounce shadow-xl shadow-sky-500/25">
                <Box size={32} />
              </div>

              <div className="space-y-2">
                <h3 className="text-xl font-black text-white capitalize">
                  {analysisStep.replace('_', ' ')}...
                </h3>
                <p className="text-xs text-sky-300 font-mono">
                  Synthesizing 3D dollhouse geometry with watertight cavity snapping
                </p>
              </div>

              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-mono text-slate-400">
                  <span>Pipeline Progress</span>
                  <span className="text-sky-400 font-bold">{analysisPercent}%</span>
                </div>
                <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden border border-slate-800 p-0.5">
                  <div
                    className="h-full bg-gradient-to-r from-sky-400 via-indigo-500 to-purple-500 rounded-full transition-all duration-300 shadow-md shadow-sky-500/50"
                    style={{ width: `${analysisPercent}%` }}
                  />
                </div>
              </div>

              {/* 6 Realistic Architectural Pipeline Stages */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 pt-4 text-[10px] font-mono text-left">
                <div className={`p-2.5 rounded-xl border ${analysisPercent >= 15 ? 'bg-sky-950/40 border-sky-400 text-sky-300' : 'bg-slate-950/50 border-slate-800 text-slate-500'}`}>
                  <span className="font-bold block mb-0.5">01. CLEAN NOISE</span>
                  <span>Clear extra lines</span>
                </div>
                <div className={`p-2.5 rounded-xl border ${analysisPercent >= 35 ? 'bg-indigo-950/40 border-indigo-400 text-indigo-300' : 'bg-slate-950/50 border-slate-800 text-slate-500'}`}>
                  <span className="font-bold block mb-0.5">02. DETECT WALLS</span>
                  <span>Watertight bands</span>
                </div>
                <div className={`p-2.5 rounded-xl border ${analysisPercent >= 55 ? 'bg-cyan-950/40 border-cyan-400 text-cyan-300' : 'bg-slate-950/50 border-slate-800 text-slate-500'}`}>
                  <span className="font-bold block mb-0.5">03. DOORS & WINS</span>
                  <span>Openings & swings</span>
                </div>
                <div className={`p-2.5 rounded-xl border ${analysisPercent >= 75 ? 'bg-amber-950/40 border-amber-400 text-amber-300' : 'bg-slate-950/50 border-slate-800 text-slate-500'}`}>
                  <span className="font-bold block mb-0.5">04. ROOM NAMES</span>
                  <span>Topology labels</span>
                </div>
                <div className={`p-2.5 rounded-xl border ${analysisPercent >= 90 ? 'bg-purple-950/40 border-purple-400 text-purple-300' : 'bg-slate-950/50 border-slate-800 text-slate-500'}`}>
                  <span className="font-bold block mb-0.5">05. BUILD 3D</span>
                  <span>Mesh extrusion</span>
                </div>
                <div className={`p-2.5 rounded-xl border ${analysisPercent >= 98 ? 'bg-emerald-950/40 border-emerald-400 text-emerald-300' : 'bg-slate-950/50 border-slate-800 text-slate-500'}`}>
                  <span className="font-bold block mb-0.5">06. REALISTIC WAY</span>
                  <span>PBR staging & Vastu</span>
                </div>
              </div>
            </div>
          ) : (
            /* 2-Column Converter Layout (Clean floordesign.ai UX) */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              {/* LEFT PANEL: UPLOAD & DEMO BLUEPRINTS (7 Cols) */}
              <div className="lg:col-span-7 space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                    <Upload size={14} className="text-sky-400" />
                    <span>Upload 2D Floor Plan</span>
                  </label>
                  <span className="text-[11px] text-slate-400 font-mono">JPG, PNG, WebP, PDF, DXF (Max 10MB)</span>
                </div>

                {/* Dropzone Card */}
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
                      const file = e.dataTransfer.files[0];
                      setSelectedFile(file);
                      setSelectedDemoId(null);
                    }
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  className={`p-6 sm:p-8 rounded-2xl border-2 border-dashed cursor-pointer transition-all text-center flex flex-col items-center justify-center min-h-[200px] ${
                    isDragging
                      ? 'border-sky-400 bg-sky-500/10 scale-[1.01]'
                      : selectedFile
                      ? 'border-emerald-500/60 bg-emerald-950/15'
                      : 'border-slate-700/80 hover:border-sky-500/60 bg-slate-950/50 hover:bg-slate-950/70'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".jpg,.jpeg,.png,.webp,.pdf,.dxf"
                    onChange={handleFileInput}
                    className="hidden"
                  />

                  {selectedFile ? (
                    <div className="space-y-3">
                      <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
                        <Check size={28} />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-white truncate max-w-xs mx-auto">
                          {selectedFile.name}
                        </h4>
                        <p className="text-xs text-slate-400 font-mono mt-0.5">
                          {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • Ready for 3D Conversion
                        </p>
                      </div>
                      <span className="inline-block text-[11px] text-sky-400 underline font-semibold">
                        Click or drop another file to replace
                      </span>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="w-14 h-14 rounded-2xl bg-sky-500/15 text-sky-400 border border-sky-500/30 flex items-center justify-center mx-auto shadow-inner">
                        <Upload size={28} className="animate-pulse" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="font-bold text-sm sm:text-base text-white">
                          Drag & Drop Floor Plan Here or Browse
                        </h4>
                        <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                          Brochure scans, hand drawings, photos, or architectural vector PDF files.
                        </p>
                      </div>
                      <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors">
                        <Folder size={14} className="text-sky-400" />
                        <span>Select File from Computer</span>
                      </span>
                    </div>
                  )}
                </div>

                {/* 1-Click Sample Demos Selection */}
                <div className="space-y-2 pt-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                    Or select an instant sample blueprint:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {samplePlans.map((demo) => {
                      const isSelected = selectedDemoId === demo.id && !selectedFile;
                      return (
                        <button
                          key={demo.id}
                          type="button"
                          onClick={() => {
                            setSelectedDemoId(demo.id);
                            setSelectedFile(null);
                            handleLoadSample(demo.image, demo.title);
                          }}
                          className={`p-2.5 rounded-xl border text-left flex items-center gap-3 transition-all ${
                            isSelected
                              ? 'bg-sky-950/40 border-sky-400 shadow-md shadow-sky-500/20'
                              : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900/60'
                          }`}
                        >
                          <img
                            src={demo.image}
                            alt={demo.title}
                            className="w-10 h-10 rounded-lg object-cover border border-slate-700/80 shrink-0"
                          />
                          <div className="truncate">
                            <span className="font-bold text-xs text-slate-200 block truncate group-hover:text-sky-300">
                              {demo.title}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono block">
                              Vastu {demo.vastu}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* RIGHT PANEL: DESIGN ANALYSIS & BUILD SPECIFICATIONS (5 Cols) */}
              <div className="lg:col-span-5 bg-slate-950/60 border border-slate-800/80 rounded-2xl p-5 sm:p-6 space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                    <Sliders size={14} className="text-sky-400" />
                    <span>Design & Build Specifications</span>
                  </span>
                  <span className="text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">
                    PBR Materials
                  </span>
                </div>

                {/* 1. Interior Architectural Style */}
                <div className="space-y-2">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                    1. Architectural & Material Palette
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {stylePresets.map((sp) => {
                      const isSelected = interiorStyle === sp.id;
                      return (
                        <button
                          key={sp.id}
                          type="button"
                          onClick={() => setInteriorStyle(sp.id)}
                          className={`p-2.5 rounded-xl border text-left transition-all ${
                            isSelected
                              ? 'bg-sky-950/40 border-sky-400 shadow-md shadow-sky-500/15'
                              : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="font-bold text-xs text-slate-200 truncate">{sp.name}</span>
                            {isSelected && <CheckCircle2 size={13} className="text-sky-400 shrink-0" />}
                          </div>
                          <p className="text-[10px] text-slate-400 leading-tight truncate">{sp.tagline}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Ceiling Height & Furnishing Mode */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                      2. Ceiling Height
                    </label>
                    <div className="grid grid-cols-3 gap-1">
                      {[
                        { label: "9'", val: 2743 },
                        { label: "10'", val: 3050 },
                        { label: "11'", val: 3353 }
                      ].map((c) => (
                        <button
                          key={c.val}
                          type="button"
                          onClick={() => setCeilingHeightMm(c.val)}
                          className={`py-1.5 rounded-lg text-xs font-bold border transition-all ${
                            ceilingHeightMm === c.val
                              ? 'bg-sky-500 border-sky-400 text-slate-950 font-black shadow-sm'
                              : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                          }`}
                        >
                          {c.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                      3. Staging Mode
                    </label>
                    <div className="grid grid-cols-2 gap-1">
                      <button
                        type="button"
                        onClick={() => setIsFurnished(true)}
                        className={`py-1.5 rounded-lg text-[11px] font-bold border transition-all ${
                          isFurnished
                            ? 'bg-indigo-600 border-indigo-500 text-white shadow-sm'
                            : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        Furnished
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsFurnished(false)}
                        className={`py-1.5 rounded-lg text-[11px] font-bold border transition-all ${
                          !isFurnished
                            ? 'bg-indigo-600 border-indigo-500 text-white shadow-sm'
                            : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        Shell
                      </button>
                    </div>
                  </div>
                </div>

                {/* 3. Vastu Shastra 8-Zone Analytics Toggle */}
                <div className="pt-1">
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs">
                    <div className="flex items-center gap-2">
                      <Compass size={15} className="text-amber-400 shrink-0" />
                      <span className="font-semibold text-slate-200">8-Zone Vastu Shastra Analysis</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIncludeVastu(!includeVastu)}
                      className={`w-9 h-5 rounded-full p-0.5 transition-colors relative ${includeVastu ? 'bg-amber-500' : 'bg-slate-800'}`}
                    >
                      <div className={`w-4 h-4 rounded-full bg-white transition-transform ${includeVastu ? 'translate-x-4' : 'translate-x-0'}`} />
                    </button>
                  </div>
                </div>

                {/* Primary Action Button (Large, Clean CTA) */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleConvertAction}
                    className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-sky-400 via-indigo-500 to-purple-600 hover:from-sky-300 hover:to-indigo-400 text-slate-950 font-black text-sm tracking-wide shadow-xl shadow-sky-500/25 transition-all transform active:scale-98 flex items-center justify-center gap-2 group cursor-pointer"
                  >
                    <Sparkles size={16} className="fill-slate-950 group-hover:rotate-12 transition-transform" />
                    <span>Convert to 3D Model Now</span>
                    <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                  </button>
                  <p className="text-[11px] text-slate-500 text-center font-mono mt-2">
                    Deterministic Geometry • Watertight Snapping • 100% Free to Try
                  </p>
                </div>

              </div>

            </div>
          )}
        </div>

        {/* INTERACTIVE 2D ↔ 3D BEFORE/AFTER COMPARISON SLIDER */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-sky-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Interactive Transformation Preview (Drag to Compare 2D Blueprint vs Living 3D Dollhouse)
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

        {/* HOW IT WORKS: 6-STEP ARCHITECTURAL 3D PIPELINE */}
        <div className="space-y-6 pt-4">
          <div className="text-center space-y-1.5 max-w-xl mx-auto">
            <span className="text-xs font-bold uppercase tracking-wider text-sky-400">
              The 2builders 6-Step Workflow
            </span>
            <h2 className="text-xl sm:text-3xl font-black text-white">
              How We Turn Any 2D Floor Plan Into a Living 3D Model
            </h2>
            <p className="text-xs text-slate-400">Sub-millimeter deterministic precision in a realistic way</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 text-left space-y-2.5 hover:border-sky-500/40 transition-colors">
              <div className="w-9 h-9 rounded-xl bg-sky-500/15 border border-sky-400/30 flex items-center justify-center text-sky-400 font-black text-xs">
                01
              </div>
              <h3 className="font-bold text-sm text-white">Upload & Clear Extra Lines</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Upload scans, photos, sketches, or CAD drawings. Morphological opening strips text, dimension ticks, and hatching to isolate clean structural strokes.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 text-left space-y-2.5 hover:border-indigo-500/40 transition-colors">
              <div className="w-9 h-9 rounded-xl bg-indigo-500/15 border border-indigo-400/30 flex items-center justify-center text-indigo-400 font-black text-xs">
                02
              </div>
              <h3 className="font-bold text-sm text-white">Detect Walls</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Stacks directional wall runs into contiguous bands, clusters collinear walls into single centerlines, and snaps corners with zero overlaps.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 text-left space-y-2.5 hover:border-cyan-500/40 transition-colors">
              <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-400/30 flex items-center justify-center text-cyan-400 font-black text-xs">
                03
              </div>
              <h3 className="font-bold text-sm text-white">Detect Windows & Doors</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Identifies wall gap openings, evaluates double-line glass signatures for exterior windows, and detects quarter-circle door swings.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 text-left space-y-2.5 hover:border-amber-500/40 transition-colors">
              <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-400/30 flex items-center justify-center text-amber-400 font-black text-xs">
                04
              </div>
              <h3 className="font-bold text-sm text-white">Detect Room Names</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Extracts closed rectilinear room polygons via multi-seed floodfilling and assigns room identities (Living, Master Bedroom, Kitchen, Dining, Bath).
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 text-left space-y-2.5 hover:border-purple-500/40 transition-colors">
              <div className="w-9 h-9 rounded-xl bg-purple-500/15 border border-purple-400/30 flex items-center justify-center text-purple-400 font-black text-xs">
                05
              </div>
              <h3 className="font-bold text-sm text-white">Build 3D Model</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Generates a clean planar 3D mesh with exact wall thicknesses, lintels, sill heights, and watertight corner miters in Three.js and WebGL.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 text-left space-y-2.5 hover:border-emerald-500/40 transition-colors">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-400/30 flex items-center justify-center text-emerald-400 font-black text-xs">
                06
              </div>
              <h3 className="font-bold text-sm text-white">Realistic Way</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                PBR materials, Carrara marble flooring, glazed window panes, wooden door frames, interior furniture staging, and 8-zone Vastu Shastra overlay.
              </p>
            </div>
          </div>
        </div>

        {/* 1-CLICK DEMO SAMPLES SHOWCASE */}
        <div className="space-y-3.5 pt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-amber-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Interactive Showcase Gallery
              </h3>
            </div>
            <span className="text-[11px] text-slate-500 hidden sm:inline">Click any plan below to launch its living 3D dollhouse</span>
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
        <div className="space-y-4 pt-4">
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

        {/* ARCHITECTURAL ENGINE CAPABILITIES TABS */}
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

        {/* 100% FREE FOREVER & UNLIMITED ARCHITECTURAL FEATURES (NO PRICE / NO LIMITS) */}
        <div id="pricing-section" className="pt-8 border-t border-slate-800/80 space-y-8">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-bold shadow-md shadow-emerald-500/10">
              <Sparkles size={14} className="text-emerald-400" />
              <span>100% FREE FOREVER • NO LIMITS • NO PAYWALLS</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
              All Architectural Features Included —{' '}
              <span className="bg-gradient-to-r from-emerald-300 via-teal-300 to-sky-400 bg-clip-text text-transparent">
                Zero Price, Full Commercial Rights
              </span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              Every single capability of 2builders is completely free for all users. Convert unlimited 2D drawings into 3D dollhouses, export AutoCAD DXF & vector PDF blueprints, generate 4K photorealistic renders, and run 8-zone Vastu Shastra analysis with no restrictions.
            </p>
          </div>

          {/* 3 Unlocked Feature Suites (All 100% Free) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
            {/* Suite 1: 2D-to-3D Synthesis */}
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-3xl p-6 flex flex-col justify-between hover:border-slate-700 transition-all">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-sky-400">Deterministic Engine</span>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded font-bold font-mono">
                    UNLIMITED & FREE
                  </span>
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-black text-white">2D to 3D Synthesis</div>
                  <p className="text-xs text-slate-400 mt-1">Convert scanned drawings, photos, brochure pages, and CAD vector files.</p>
                </div>
                <div className="pt-3 border-t border-slate-800 space-y-2.5 text-xs text-slate-300">
                  <div className="flex items-center gap-2">
                    <Check size={14} className="text-emerald-400 shrink-0" />
                    <span><strong>Unlimited Conversions</strong> (JPG, PNG, WebP, PDF, DXF)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check size={14} className="text-emerald-400 shrink-0" />
                    <span><strong>Zero Overlapping Walls Guarantee</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check size={14} className="text-emerald-400 shrink-0" />
                    <span>Sub-millimeter scale registration (zero shift)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check size={14} className="text-emerald-400 shrink-0" />
                    <span>Automatic room boundary & sqm / sqft area detection</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check size={14} className="text-emerald-400 shrink-0" />
                    <span>T-junction & L-corner watertight consolidation</span>
                  </div>
                </div>
              </div>
              <div className="pt-6">
                <button
                  onClick={() => {
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="w-full py-2.5 rounded-xl border border-sky-500/40 hover:border-sky-400 bg-sky-600/20 hover:bg-sky-600/30 text-sky-200 text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                >
                  <Upload size={14} />
                  <span>Upload a Plan (100% Free)</span>
                </button>
              </div>
            </div>

            {/* Suite 2: 3D Visualization & PBR (Featured) */}
            <div className="relative bg-gradient-to-b from-sky-950/30 via-slate-900/90 to-slate-900/90 border-2 border-sky-500/70 rounded-3xl p-6 sm:p-7 flex flex-col justify-between shadow-2xl shadow-sky-500/15 scale-[1.02] z-20">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-sky-400 via-indigo-500 to-purple-500 text-slate-950 text-[10px] font-black uppercase px-3.5 py-0.5 rounded-full shadow-md tracking-wider flex items-center gap-1">
                <Sparkles size={11} className="fill-slate-950" />
                <span>ALL UNLOCKED • NO SUBSCRIPTION</span>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
                    <Box size={15} />
                    <span>3D Visualization Suite</span>
                  </span>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded font-black">
                    FREE FOREVER
                  </span>
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-black text-white">Interactive 3D Dollhouse</div>
                  <p className="text-xs text-slate-300 mt-1">Orbit, cut-away, and walk through spaces with realistic lighting and furniture.</p>
                </div>
                <div className="pt-3 border-t border-sky-500/30 space-y-2.5 text-xs text-slate-200">
                  <div className="flex items-center gap-2">
                    <Check size={14} className="text-emerald-400 font-bold shrink-0" />
                    <span><strong>4K Photorealistic PBR Rendering</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check size={14} className="text-emerald-400 font-bold shrink-0" />
                    <span><strong>Cut-Away 900mm Walls</strong> vs Full Ceiling Height</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check size={14} className="text-emerald-400 font-bold shrink-0" />
                    <span><strong>First-Person Walkthrough</strong> (1600mm eye-level, WASD)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check size={14} className="text-emerald-400 font-bold shrink-0" />
                    <span><strong>360 Cinematic Flythrough Video Tour</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check size={14} className="text-emerald-400 font-bold shrink-0" />
                    <span><strong>Virtual Staging</strong> with parametric furniture & decor</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check size={14} className="text-emerald-400 font-bold shrink-0" />
                    <span><strong>All 19 Floor-Plan.AI Architectural Tools</strong></span>
                  </div>
                </div>
              </div>

              <div className="pt-6">
                <button
                  onClick={() => handleLoadSample('/samples/modern_3bhk.jpg', 'Modern 3BHK Residence')}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-sky-400 via-indigo-500 to-purple-600 hover:from-sky-300 hover:to-indigo-400 text-slate-950 text-xs sm:text-sm font-black transition-all shadow-xl shadow-sky-500/25 flex items-center justify-center gap-2 group cursor-pointer"
                >
                  <Play size={16} className="fill-slate-950" />
                  <span>Launch 1-Click 3D Model (Free)</span>
                  <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>

            {/* Suite 3: CAD Exports & Vastu */}
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-3xl p-6 flex flex-col justify-between hover:border-slate-700 transition-all">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
                    <Download size={15} />
                    <span>CAD & Vastu Intelligence</span>
                  </span>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded font-bold font-mono">
                    UNRESTRICTED
                  </span>
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-black text-white">Universal Exports & Vastu</div>
                  <p className="text-xs text-slate-400 mt-1">Export professional deliverables with no watermarks and full commercial rights.</p>
                </div>
                <div className="pt-3 border-t border-slate-800 space-y-2.5 text-xs text-slate-300">
                  <div className="flex items-center gap-2">
                    <Check size={14} className="text-emerald-400 shrink-0" />
                    <span><strong>AutoCAD DXF</strong> Layered Vector Drawings</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check size={14} className="text-emerald-400 shrink-0" />
                    <span><strong>ISO A4 Vector PDF Blueprint</strong> with Title Block</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check size={14} className="text-emerald-400 shrink-0" />
                    <span><strong>WebGL GLB, Wavefront OBJ & 3D Print STL</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check size={14} className="text-emerald-400 shrink-0" />
                    <span><strong>8-Zone Vastu Shastra</strong> Brahmasthan & Dosha Reports</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check size={14} className="text-emerald-400 shrink-0" />
                    <span><strong>100% Commercial Usage Rights</strong> for Client Pitches</span>
                  </div>
                </div>
              </div>
              <div className="pt-6">
                <button
                  onClick={() => setMegaMenuOpen(true)}
                  className="w-full py-2.5 rounded-xl border border-purple-500/40 hover:border-purple-400 bg-purple-600/20 hover:bg-purple-600/30 text-purple-200 text-xs font-bold transition-all text-center flex items-center justify-center gap-1.5"
                >
                  <Grid size={14} />
                  <span>Explore All 19 Free Tools</span>
                  <ArrowRight size={13} />
                </button>
              </div>
            </div>
          </div>

          {/* Guarantee & No-Limits Trust Bar */}
          <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800 flex flex-wrap items-center justify-around gap-4 text-xs text-slate-400">
            <div className="flex items-center gap-2 text-emerald-400 font-semibold">
              <CheckCircle2 size={18} />
              <span>100% Free Forever</span>
            </div>
            <div className="flex items-center gap-2 text-sky-400 font-semibold">
              <Zap size={16} />
              <span>No Limits on Conversions or Exports</span>
            </div>
            <div className="flex items-center gap-2 text-purple-400 font-semibold">
              <ShieldCheck size={16} />
              <span>Full Commercial Usage Rights Included</span>
            </div>
            <div className="flex items-center gap-2 text-amber-400 font-semibold">
              <Sparkles size={16} />
              <span>No Credit Card or Registration Required</span>
            </div>
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
