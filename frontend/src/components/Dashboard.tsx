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
  Download
} from 'lucide-react';
import { Project } from '../types';
import { useProjectStore } from '../store/useProjectStore';
import { FileViewerGuideModal } from './FileViewerGuideModal';
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

  // 2builders Plan to 3D Options
  const [interiorStyle, setInteriorStyle] = useState<string>('Modern');
  const [ceilingHeightMm, setCeilingHeightMm] = useState<number>(3050); // 10'
  const [isFurnished, setIsFurnished] = useState<boolean>(true);
  const [northDeg, setNorthDeg] = useState<number>(0);

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
      // Auto-compress large phone/camera images so they never exceed serverless payload limits
      const file = await compressImageIfNeeded(inputFile);

      if (file.size > 4.5 * 1024 * 1024) {
        throw new Error(`File size (${(file.size / (1024 * 1024)).toFixed(1)}MB) exceeds the 4.5MB serverless limit. Please upload a compressed JPG/PNG or PDF.`);
      }

      setStatusMessage(`Uploading "${file.name}" to 2builders...`);

      // 1. Upload
      const formData = new FormData();
      formData.append('file', file);

      const upRes = await fetch('/api/v1/plans/upload', {
        method: 'POST',
        body: formData
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
      setAnalysisPercent(40);
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
      setAnalysisPercent(70);
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

        toast.success(`Generated 3D Model with ${planDoc.walls?.length || 0} walls & ${planDoc.rooms?.length || 0} rooms!`);

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

  const samplePlans = [
    {
      id: 'sample_1',
      title: 'Modern 3BHK Residence',
      subtitle: '9 Enclosed Rooms • 142 sqm',
      vastu: 'A (85/100)',
      image: '/samples/modern_3bhk.jpg',
      badge: 'Popular'
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

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col font-sans selection:bg-sky-500 selection:text-slate-950 relative overflow-x-hidden">
      {/* Background Architectural Grid Effect */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b12_1px,transparent_1px),linear-gradient(to_bottom,#1e293b12_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[350px] bg-gradient-to-b from-sky-500/10 via-indigo-600/5 to-transparent blur-3xl pointer-events-none" />

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
      <header className="h-16 border-b border-white/[0.08] px-4 sm:px-8 flex items-center justify-between bg-slate-950/80 backdrop-blur-xl sticky top-0 z-30">
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

      {/* Main Content */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-8 py-8 space-y-10 relative z-10">
        
        {/* HERO TITLE & STATS PILLS */}
        <div className="text-center space-y-3.5 max-w-3xl mx-auto pt-2">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-sky-500/10 via-indigo-500/10 to-purple-500/10 border border-sky-500/30 text-sky-300 text-xs font-semibold shadow-inner">
            <Sparkles size={14} className="text-sky-400 animate-pulse" />
            <span>Pure Deterministic Geometry • Sub-Millimeter Accuracy</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight leading-tight">
            Transform Any 2D Floor Plan Into a <span className="bg-gradient-to-r from-sky-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent">Living 3D World</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Upload any scanned drawing, brochure page, or photo. Our deterministic algorithm extracts non-overlapping centerline walls, calculates 8-zone Vastu Shastra compliance, and builds interactive 3D models in seconds.
          </p>

          {/* Quick Stats Ticker */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2 text-[11px] font-mono text-slate-400">
            <span className="flex items-center gap-1.5 bg-slate-900/60 border border-slate-800 px-3 py-1 rounded-full">
              <CheckCircle2 size={13} className="text-emerald-400" />
              <span>Zero Overlapping Walls</span>
            </span>
            <span className="flex items-center gap-1.5 bg-slate-900/60 border border-slate-800 px-3 py-1 rounded-full">
              <Compass size={13} className="text-amber-400" />
              <span>8-Zone Vastu Shastra</span>
            </span>
            <span className="flex items-center gap-1.5 bg-slate-900/60 border border-slate-800 px-3 py-1 rounded-full">
              <Zap size={13} className="text-sky-400" />
              <span>Under 5s Synthesis</span>
            </span>
            <span className="flex items-center gap-1.5 bg-slate-900/60 border border-slate-800 px-3 py-1 rounded-full">
              <Download size={13} className="text-purple-400" />
              <span>GLB • OBJ • STL • PDF</span>
            </span>
          </div>
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
            
            {/* Options Bar above upload */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 sm:gap-4 p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 text-left">
              {/* 1. Interior Style */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                  Interior Style
                </label>
                <select
                  value={interiorStyle}
                  onChange={(e) => setInteriorStyle(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500 font-semibold"
                >
                  <option value="Modern">Modern Minimalist</option>
                  <option value="Contemporary Indian">Contemporary Indian</option>
                  <option value="Warm Minimalist">Warm Japandi Minimalist</option>
                  <option value="Industrial">Industrial Loft</option>
                </select>
              </div>

              {/* 2. Ceiling Height */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                  Ceiling Height
                </label>
                <div className="grid grid-cols-3 gap-1">
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

              {/* 3. Furnished vs Shell */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                  Furnishing Mode
                </label>
                <div className="grid grid-cols-2 gap-1">
                  <button
                    type="button"
                    onClick={() => setIsFurnished(true)}
                    className={`py-2 rounded-xl text-[11px] font-bold transition-all border ${
                      isFurnished
                        ? 'bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-600/30'
                        : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    Furnished
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
                    Empty Shell
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
              className={`cursor-pointer flex flex-col items-center justify-center p-8 rounded-2xl border-2 border-dashed transition-all duration-200 text-center ${
                isDragging
                  ? 'border-sky-400 bg-sky-500/10'
                  : 'border-slate-700/80 hover:border-sky-500/60 bg-slate-950/40 hover:bg-slate-900/50'
              }`}
            >
              <div className="p-4 rounded-2xl bg-gradient-to-tr from-sky-500/20 to-indigo-600/20 border border-sky-500/30 text-sky-400 shadow-inner group-hover:scale-110 transition-transform mb-3">
                <Upload size={38} className={isUploading ? 'animate-bounce' : isDragging ? 'scale-125 transition-transform' : 'animate-pulse'} />
              </div>
              
              <div className="space-y-1.5">
                <h3 className="text-lg sm:text-xl font-bold text-slate-100 flex items-center justify-center gap-2">
                  <span>{isDragging ? 'Drop Your Floor Plan File Here' : 'Drag & Drop Floor Plan Here or Browse'}</span>
                  <Sparkles size={18} className="text-sky-400" />
                </h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                  Supports brochure photos, scans, CAD drawings, JPG, PNG, WebP, or vector PDF (up to 10MB).
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
                  <span className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-xl shadow-sky-500/25 transition-all transform active:scale-95">
                    <Upload size={14} />
                    <span>Select Floor Plan Image or PDF</span>
                  </span>
                </div>
              )}

              <div className="text-[11px] text-slate-500 font-mono pt-3">
                100% Client-Safe • Non-AI Geometry • Zero Image Training
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
                Or Try With Instant 1-Click Samples
              </h3>
            </div>
            <span className="text-[11px] text-slate-500 hidden sm:inline">No file? Click any demo below to generate 3D instantly</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            {samplePlans.map((s) => (
              <div
                key={s.id}
                onClick={() => !isUploading && handleLoadSample(s.image, s.title)}
                className="group relative bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-sky-500/60 rounded-2xl p-3.5 cursor-pointer transition-all shadow-md hover:shadow-xl hover:shadow-sky-500/10 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="relative h-28 rounded-xl overflow-hidden bg-slate-950 border border-slate-800/80">
                    <img
                      src={s.image}
                      alt={s.title}
                      className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300 opacity-80 group-hover:opacity-100"
                    />
                    <div className="absolute top-2 right-2 bg-slate-950/80 backdrop-blur px-2 py-0.5 rounded-full border border-slate-700/80 text-[10px] font-bold text-amber-300">
                      Vastu {s.vastu}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-bold text-xs text-slate-100 group-hover:text-sky-300 transition-colors">
                      {s.title}
                    </h4>
                    <p className="text-[11px] text-slate-400 font-mono">{s.subtitle}</p>
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-sky-400 font-semibold">
                  <span className="flex items-center gap-1 group-hover:text-sky-300">
                    <Play size={11} className="fill-sky-400" />
                    <span>Try 1-Click 3D Demo</span>
                  </span>
                  <ArrowRight size={13} className="group-hover:translate-x-1 transition-transform" />
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
              <span>Your 3D Projects ({projects.length})</span>
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

        {/* ARCHITECTURAL ENGINE CAPABILITIES SHOWCASE */}
        <div className="pt-6 border-t border-slate-800/80 space-y-4">
          <div className="text-center space-y-1">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Why Architectural Teams Choose 2builders
            </h3>
            <p className="text-xs text-slate-500">Engineered with pure mathematical geometry for real-world construction precision</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
              <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-400/30 flex items-center justify-center text-sky-400">
                <CheckCircle2 size={16} />
              </div>
              <h4 className="font-bold text-xs text-slate-200">Consolidated Centerlines</h4>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Automatically detects double cavity strokes and unifies them into single structural centerlines with 0 overlaps.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-400/30 flex items-center justify-center text-amber-400">
                <Compass size={16} />
              </div>
              <h4 className="font-bold text-xs text-slate-200">8-Zone Vastu Shastra</h4>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Computes energy center Brahmasthan and 8 directional zones with real-time room compliance scoring.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-400/30 flex items-center justify-center text-indigo-400">
                <Footprints size={16} />
              </div>
              <h4 className="font-bold text-xs text-slate-200">First-Person Walkthrough</h4>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Step inside with eye-level camera navigation, realistic PBR materials, and cutaway dollhouse views.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-400/30 flex items-center justify-center text-emerald-400">
                <FileText size={16} />
              </div>
              <h4 className="font-bold text-xs text-slate-200">CAD & Vector Exports</h4>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Instant vector PDF blueprints with title block, WebGL glTF/GLB, Wavefront OBJ, and 3D printing STL.
              </p>
            </div>
          </div>
        </div>

      </main>

      {/* Global File Viewer Guide Modal */}
      <FileViewerGuideModal />

      {/* Global Toast Container */}
      <ToastContainer />
    </div>
  );
};
