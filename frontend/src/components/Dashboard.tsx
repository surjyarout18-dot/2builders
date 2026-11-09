import React, { useState, useEffect } from 'react';
import { Plus, Folder, Clock, Trash2, Box, ArrowRight, Building2, Check, Sparkles, Upload, FileText, Compass, Footprints, Layers, ShieldCheck, HelpCircle } from 'lucide-react';
import { Project } from '../types';
import { useProjectStore } from '../store/useProjectStore';
import { FileViewerGuideModal } from './FileViewerGuideModal';

interface DashboardProps {
  onSelectProject: (projectId: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onSelectProject }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [analysisStep, setAnalysisStep] = useState<string>('queued');
  const [analysisPercent, setAnalysisPercent] = useState<number>(0);
  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);
  const [projectName, setProjectName] = useState<string>('Residential House ADU');
  const [template, setTemplate] = useState<'adu' | 'blank'>('adu');

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

        // Open 3D View and trigger Review Modal
        useProjectStore.getState().setViewMode('3d');
        setReviewModalOpen(true);
        setStatusMessage(`Generated 3D Model from ${file.name}`);
        onSelectProject(planId);
      }
    } catch (err: any) {
      alert(`Error converting plan: ${err.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleUploadAndAnalyse(e.target.files[0]);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this project?')) return;
    try {
      await fetch(`/api/projects/${id}`, { method: 'DELETE' });
      fetchProjects();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top 2builders Navigation Bar */}
      <header className="h-16 border-b border-slate-800 px-8 flex items-center justify-between bg-slate-900/80 backdrop-blur sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-sky-500/20">
            <Building2 size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-black tracking-tight text-white">2BUILDERS</h1>
              <span className="text-[10px] bg-sky-500/20 text-sky-300 border border-sky-400/40 px-2 py-0.5 rounded-full font-bold">
                PLAN TO 3D
              </span>
            </div>
            <p className="text-[11px] text-slate-400">Deterministic Architectural 3D Reconstruction & Vastu Engine</p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <button
            onClick={() => {
              useProjectStore.getState().setViewerGuideFormat('glb');
              useProjectStore.getState().setViewerGuideOpen(true);
            }}
            className="flex items-center gap-1.5 text-sky-300 hover:text-sky-200 bg-sky-950/60 hover:bg-sky-900/60 border border-sky-500/40 px-3 py-1.5 rounded-full font-semibold transition-colors"
            title="Learn how to view downloaded 3D models and blueprints locally"
          >
            <HelpCircle size={14} className="text-sky-400" />
            <span>Viewer Guide</span>
          </button>
          <span className="flex items-center gap-1.5 text-emerald-400 font-mono bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 rounded-full">
            <ShieldCheck size={14} />
            <span>Non-AI Geometry Engine</span>
          </span>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-8 space-y-8">
        
        {/* HERO DROPZONE & OPTIONS */}
        <div className="relative overflow-hidden rounded-3xl bg-slate-900/90 border-2 border-dashed border-sky-500/40 hover:border-sky-400 p-8 shadow-2xl transition-all group">
          
          {/* Options Bar above upload */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 p-4 rounded-2xl bg-slate-950/60 border border-slate-800 text-left">
            {/* 1. Interior Style */}
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                Interior Style
              </label>
              <select
                value={interiorStyle}
                onChange={(e) => setInteriorStyle(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500 font-semibold"
              >
                <option value="Modern">Modern Minimalist</option>
                <option value="Contemporary Indian">Contemporary Indian</option>
                <option value="Warm Minimalist">Warm Minimalist</option>
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
                    className={`py-1.5 rounded-lg text-[11px] font-bold transition-all border ${
                      ceilingHeightMm === c.val
                        ? 'bg-sky-500 border-sky-400 text-slate-950'
                        : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800'
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
                  className={`py-1.5 rounded-lg text-[11px] font-bold transition-all border ${
                    isFurnished
                      ? 'bg-indigo-600 border-indigo-500 text-white'
                      : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  Furnished
                </button>
                <button
                  type="button"
                  onClick={() => setIsFurnished(false)}
                  className={`py-1.5 rounded-lg text-[11px] font-bold transition-all border ${
                    !isFurnished
                      ? 'bg-indigo-600 border-indigo-500 text-white'
                      : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  Empty Shell
                </button>
              </div>
            </div>
          </div>

          {/* Upload Drop Target */}
          <input
            type="file"
            id="hero-file-upload"
            accept=".jpg,.jpeg,.png,.webp,.pdf,.dxf"
            onChange={handleFileInput}
            className="hidden"
            disabled={isUploading}
          />
          <label htmlFor="hero-file-upload" className="cursor-pointer flex flex-col items-center space-y-3">
            <div className="p-4 rounded-2xl bg-gradient-to-tr from-sky-500/20 to-indigo-600/20 border border-sky-500/30 text-sky-400 group-hover:scale-105 transition-transform shadow-inner">
              <Upload size={38} className={isUploading ? 'animate-bounce' : 'animate-pulse'} />
            </div>
            
            <div className="space-y-1 text-center">
              <h2 className="text-xl font-bold text-slate-100 flex items-center justify-center gap-2">
                <span>Upload Floor Plan & Build 3D Model</span>
                <Sparkles size={18} className="text-sky-400" />
              </h2>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Drop your brochure page, photo, scan or CAD drawing (JPG, PNG, WebP, PDF up to 10MB).
              </p>
            </div>

            {/* Analysis Progress Bar */}
            {isUploading ? (
              <div className="w-full max-w-md mt-4 space-y-2">
                <div className="flex justify-between text-xs font-mono text-slate-300">
                  <span className="capitalize">{analysisStep.replace('_', ' ')}...</span>
                  <span className="text-sky-400 font-bold">{analysisPercent}%</span>
                </div>
                <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
                  <div
                    className="h-full bg-gradient-to-r from-sky-500 to-indigo-500 transition-all duration-300 rounded-full"
                    style={{ width: `${analysisPercent}%` }}
                  />
                </div>
              </div>
            ) : (
              <div className="pt-2">
                <span className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-xl shadow-sky-500/20 transition-all transform active:scale-95">
                  Select Floor Plan Image or PDF
                </span>
              </div>
            )}

            <div className="text-[11px] text-slate-500 font-mono pt-1">
              Deterministic Computer Vision • Exact Room Dimensions • Vastu Zones
            </div>
          </label>
        </div>

        {/* RECENT PROJECTS SECTION */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Your 3D Homes ({projects.length})
            </h2>
          </div>

          {isLoading ? (
            <div className="text-center py-16 text-slate-500 text-xs font-mono">Loading homes...</div>
          ) : projects.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-slate-800 rounded-2xl bg-slate-900/40 space-y-2">
              <p className="text-xs text-slate-400">No projects yet. Upload a plan above to see your furnished 3D home!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                    className="group bg-slate-900/90 border border-slate-800 hover:border-sky-500/60 p-4 rounded-2xl cursor-pointer transition-all shadow-md flex flex-col justify-between"
                  >
                    <div className="space-y-2.5">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2">
                          <Folder size={16} className="text-sky-400" />
                          <span className="font-bold text-slate-100 text-xs group-hover:text-sky-300 transition-colors">
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
      </main>

      {/* Global File Viewer Guide Modal */}
      <FileViewerGuideModal />
    </div>
  );
};
