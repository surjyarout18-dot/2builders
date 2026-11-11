import React from 'react';
import {
  Sparkles,
  PenTool,
  Image as ImageIcon,
  LayoutGrid,
  FileEdit,
  Building2,
  FileCode,
  Zap,
  Droplets,
  Lightbulb,
  Monitor,
  Camera,
  Box,
  PlayCircle,
  Sofa,
  Home,
  Flower2,
  Trees,
  BedDouble,
  X,
  ArrowRight,
  Crown
} from 'lucide-react';
import { useProjectStore } from '../store/useProjectStore';
import { toast } from './Toast';

interface AllToolsMegaMenuProps {
  onOpenEditor?: () => void;
}

export const AllToolsMegaMenu: React.FC<AllToolsMegaMenuProps> = ({ onOpenEditor }) => {
  const isMegaMenuOpen = useProjectStore((s) => s.isMegaMenuOpen);
  const setMegaMenuOpen = useProjectStore((s) => s.setMegaMenuOpen);
  const setPremiumModalOpen = useProjectStore((s) => s.setPremiumModalOpen);
  const setGeneratorModalOpen = useProjectStore((s) => s.setGeneratorModalOpen);
  const setImportModalOpen = useProjectStore((s) => s.setImportModalOpen);
  const setExportModalOpen = useProjectStore((s) => s.setExportModalOpen);
  const setActiveTool = useProjectStore((s) => s.setActiveTool);
  const viewMode = useProjectStore((s) => s.viewMode);
  const setViewMode = useProjectStore((s) => s.setViewMode);
  const setRenderMode = useProjectStore((s) => s.setRenderMode);
  const setShowFurniture = useProjectStore((s) => s.setShowFurniture);
  const setActiveSpecialLayer = useProjectStore((s) => s.setActiveSpecialLayer);
  const setCinematicTourActive = useProjectStore((s) => s.setCinematicTourActive);
  const generateAILayout = useProjectStore((s) => s.generateAILayout);
  const project = useProjectStore((s) => s.project);

  if (!isMegaMenuOpen) return null;

  const handleToolClick = (toolId: string) => {
    setMegaMenuOpen(false);

    if (!project && toolId !== 'generator' && toolId !== 'sketch_to_plan') {
      generateAILayout({ type: 'house', preset: '3bhk' });
    }

    onOpenEditor?.();

    switch (toolId) {
      case 'generator':
        setGeneratorModalOpen(true);
        break;
      case 'creator':
        setViewMode('2d');
        setActiveTool('wall');
        toast.info('Switched to Floor Plan Creator (Draw Walls)');
        break;
      case 'sketch_to_plan':
        setImportModalOpen(true);
        break;
      case 'designer':
        setGeneratorModalOpen(true);
        break;
      case 'editor':
        setViewMode('2d');
        setActiveTool('select');
        toast.info('Switched to Floor Plan Editor');
        break;
      case 'to_3d':
        setViewMode('3d');
        setRenderMode('realistic');
        toast.success('Loaded Realistic 3D Dollhouse View');
        break;
      case 'to_cad':
        setExportModalOpen(true);
        break;
      case 'electrical':
        setActiveSpecialLayer('electrical');
        setViewMode(viewMode === '3d' ? 'split' : '2d');
        toast.success('Electrical Plan Layer Active (Sockets, Switches & Conduits)');
        break;
      case 'plumbing':
        setActiveSpecialLayer('plumbing');
        setViewMode(viewMode === '3d' ? 'split' : '2d');
        toast.success('Plumbing Plan Layer Active (Water Lines & Drainage Stacks)');
        break;
      case 'lighting':
        setActiveSpecialLayer('lighting');
        setViewMode('split');
        toast.success('Lighting Plan Layer Active (Recessed LEDs & Lux Levels)');
        break;
      case 'visualizer':
        setViewMode('split');
        toast.info('Floor Plan Visualizer (Synchronized 2D/3D)');
        break;
      case 'sketch_to_image':
        setViewMode('3d');
        setRenderMode('realistic');
        toast.info('Rendering photorealistic architectural model...');
        break;
      case 'model_generator':
        setExportModalOpen(true);
        break;
      case 'animation':
        setViewMode('3d');
        setCinematicTourActive(true);
        toast.success('Cinematic Flythrough Walkthrough Started!');
        break;
      case 'interior':
        useProjectStore.getState().setInteriorStyle('Modern');
        setShowFurniture(true);
        setViewMode('3d');
        toast.success('Interior Design Studio active');
        break;
      case 'exterior':
        useProjectStore.getState().setWallCutaway(false);
        setViewMode('3d');
        toast.info('Exterior Full-Height Elevation active');
        break;
      case 'garden':
      case 'landscape':
        setActiveSpecialLayer('landscape');
        setViewMode('3d');
        toast.success('Garden & Landscape Deck layer enabled');
        break;
      case 'staging':
        setShowFurniture(true);
        setViewMode('3d');
        toast.success('Virtual Staging: Parametric 3D Furniture Loaded');
        break;
      default:
        break;
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-20 px-3 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={() => setMegaMenuOpen(false)}
    >
      <div
        className="w-full max-w-5xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-white shadow-md">
              <Sparkles size={18} />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white tracking-wide flex items-center gap-2">
                <span>2BUILDERS Architectural AI Suite</span>
                <span className="text-[10px] font-mono uppercase bg-sky-500/20 text-sky-300 border border-sky-400/30 px-2 py-0.5 rounded-full font-semibold">
                  19 Professional Tools
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">Everything you need to draft, generate, convert, simulate, and stage 2D/3D spaces</p>
            </div>
          </div>
          <button
            onClick={() => setMegaMenuOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* 4-Column Grid matching floor-plan.ai */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 p-6 max-h-[75vh] overflow-y-auto">
          {/* Column 1: CREATE PLAN */}
          <div className="space-y-4">
            <h3 className="text-xs font-black tracking-wider text-sky-400 uppercase flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
              <span>Create Plan</span>
            </h3>

            <div className="space-y-2">
              <button
                onClick={() => handleToolClick('generator')}
                className="w-full text-left p-2.5 rounded-xl hover:bg-slate-800/80 border border-transparent hover:border-slate-700 transition-all group flex items-start gap-3"
              >
                <div className="w-8 h-8 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Sparkles size={16} />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-200 group-hover:text-sky-300">Floor Plan Generator</span>
                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">HOT</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">Generate floor plans from text or room specifications with AI.</p>
                </div>
              </button>

              <button
                onClick={() => handleToolClick('creator')}
                className="w-full text-left p-2.5 rounded-xl hover:bg-slate-800/80 border border-transparent hover:border-slate-700 transition-all group flex items-start gap-3"
              >
                <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <PenTool size={16} />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-200 group-hover:text-cyan-300">Floor Plan Creator</span>
                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">HOT</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">Create precise, editable floor plans with CAD drawing tools.</p>
                </div>
              </button>

              <button
                onClick={() => handleToolClick('sketch_to_plan')}
                className="w-full text-left p-2.5 rounded-xl hover:bg-slate-800/80 border border-transparent hover:border-slate-700 transition-all group flex items-start gap-3"
              >
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <ImageIcon size={16} />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-200 group-hover:text-emerald-300">Sketch to Floor Plan</span>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">Turn hand-drawn napkin sketches into clean, vector floor plans.</p>
                </div>
              </button>

              <button
                onClick={() => handleToolClick('designer')}
                className="w-full text-left p-2.5 rounded-xl hover:bg-slate-800/80 border border-transparent hover:border-slate-700 transition-all group flex items-start gap-3"
              >
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <LayoutGrid size={16} />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-200 group-hover:text-indigo-300">Floor Plan Designer</span>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">Design and customize modular layouts for any living space.</p>
                </div>
              </button>
            </div>

            <button
              onClick={() => handleToolClick('generator')}
              className="text-[11px] text-sky-400 hover:text-sky-300 font-semibold flex items-center gap-1 pt-2 transition-colors"
            >
              <span>View all in Create Plan</span>
              <ArrowRight size={12} />
            </button>
          </div>

          {/* Column 2: EDIT & CONVERT */}
          <div className="space-y-4">
            <h3 className="text-xs font-black tracking-wider text-emerald-400 uppercase flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>Edit & Convert</span>
            </h3>

            <div className="space-y-2">
              <button
                onClick={() => handleToolClick('editor')}
                className="w-full text-left p-2.5 rounded-xl hover:bg-slate-800/80 border border-transparent hover:border-slate-700 transition-all group flex items-start gap-3"
              >
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <FileEdit size={16} />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-200 group-hover:text-emerald-300">Floor Plan Editor</span>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">Edit room layouts, walls, doors, windows, and dimensions.</p>
                </div>
              </button>

              <button
                onClick={() => handleToolClick('to_3d')}
                className="w-full text-left p-2.5 rounded-xl hover:bg-slate-800/80 border border-transparent hover:border-slate-700 transition-all group flex items-start gap-3"
              >
                <div className="w-8 h-8 rounded-lg bg-teal-500/10 text-teal-400 border border-teal-500/20 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Building2 size={16} />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-200 group-hover:text-teal-300">Floor Plan to 3D</span>
                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">HOT</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">Turn a 2D floor plan into a realistic living 3D dollhouse.</p>
                </div>
              </button>

              <button
                onClick={() => handleToolClick('to_cad')}
                className="w-full text-left p-2.5 rounded-xl hover:bg-slate-800/80 border border-transparent hover:border-slate-700 transition-all group flex items-start gap-3"
              >
                <div className="w-8 h-8 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <FileCode size={16} />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-200 group-hover:text-sky-300">Floor Plan to CAD</span>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">Convert floor plans into editable DXF & SVG CAD files.</p>
                </div>
              </button>

              <button
                onClick={() => handleToolClick('electrical')}
                className="w-full text-left p-2.5 rounded-xl hover:bg-slate-800/80 border border-transparent hover:border-slate-700 transition-all group flex items-start gap-3"
              >
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Zap size={16} />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-200 group-hover:text-amber-300">Electrical Plan</span>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">Generate clear electrical socket, switch & wiring layouts.</p>
                </div>
              </button>

              <button
                onClick={() => handleToolClick('plumbing')}
                className="w-full text-left p-2.5 rounded-xl hover:bg-slate-800/80 border border-transparent hover:border-slate-700 transition-all group flex items-start gap-3"
              >
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Droplets size={16} />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-200 group-hover:text-blue-300">Plumbing Plan</span>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">Map water supply routes, fixtures & drainage pipe stacks.</p>
                </div>
              </button>

              <button
                onClick={() => handleToolClick('lighting')}
                className="w-full text-left p-2.5 rounded-xl hover:bg-slate-800/80 border border-transparent hover:border-slate-700 transition-all group flex items-start gap-3"
              >
                <div className="w-8 h-8 rounded-lg bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Lightbulb size={16} />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-200 group-hover:text-yellow-300">Lighting Plan</span>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">Coordinate recessed LEDs, pendants & lux levels.</p>
                </div>
              </button>
            </div>

            <button
              onClick={() => handleToolClick('editor')}
              className="text-[11px] text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1 pt-2 transition-colors"
            >
              <span>View all in Edit & Convert</span>
              <ArrowRight size={12} />
            </button>
          </div>

          {/* Column 3: VISUALIZE */}
          <div className="space-y-4">
            <h3 className="text-xs font-black tracking-wider text-purple-400 uppercase flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
              <span>Visualize</span>
            </h3>

            <div className="space-y-2">
              <button
                onClick={() => handleToolClick('visualizer')}
                className="w-full text-left p-2.5 rounded-xl hover:bg-slate-800/80 border border-transparent hover:border-slate-700 transition-all group flex items-start gap-3"
              >
                <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Monitor size={16} />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-200 group-hover:text-purple-300">Floor Plan Visualizer</span>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">Transform floor plans into interactive synchronized visualizations.</p>
                </div>
              </button>

              <button
                onClick={() => handleToolClick('sketch_to_image')}
                className="w-full text-left p-2.5 rounded-xl hover:bg-slate-800/80 border border-transparent hover:border-slate-700 transition-all group flex items-start gap-3"
              >
                <div className="w-8 h-8 rounded-lg bg-violet-500/10 text-violet-400 border border-violet-500/20 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Camera size={16} />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-200 group-hover:text-violet-300">Sketch to Image</span>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">Turn sketches into realistic architectural & interior images.</p>
                </div>
              </button>

              <button
                onClick={() => handleToolClick('model_generator')}
                className="w-full text-left p-2.5 rounded-xl hover:bg-slate-800/80 border border-transparent hover:border-slate-700 transition-all group flex items-start gap-3"
              >
                <div className="w-8 h-8 rounded-lg bg-pink-500/10 text-pink-400 border border-pink-500/20 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Box size={16} />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-200 group-hover:text-pink-300">3D Model Generator</span>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">Export GLB, OBJ & USDZ 3D assets for Web, AR & CAD.</p>
                </div>
              </button>

              <button
                onClick={() => handleToolClick('animation')}
                className="w-full text-left p-2.5 rounded-xl hover:bg-slate-800/80 border border-transparent hover:border-slate-700 transition-all group flex items-start gap-3"
              >
                <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <PlayCircle size={16} />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-200 group-hover:text-rose-300">Floor Plan Animation</span>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">Turn floor plans into cinematic animated drone walkthroughs.</p>
                </div>
              </button>
            </div>

            <button
              onClick={() => handleToolClick('visualizer')}
              className="text-[11px] text-purple-400 hover:text-purple-300 font-semibold flex items-center gap-1 pt-2 transition-colors"
            >
              <span>View all in Visualize</span>
              <ArrowRight size={12} />
            </button>
          </div>

          {/* Column 4: SPACE DESIGN */}
          <div className="space-y-4">
            <h3 className="text-xs font-black tracking-wider text-rose-400 uppercase flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
              <span>Space Design</span>
            </h3>

            <div className="space-y-2">
              <button
                onClick={() => handleToolClick('interior')}
                className="w-full text-left p-2.5 rounded-xl hover:bg-slate-800/80 border border-transparent hover:border-slate-700 transition-all group flex items-start gap-3"
              >
                <div className="w-8 h-8 rounded-lg bg-orange-500/10 text-orange-400 border border-orange-500/20 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Sofa size={16} />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-200 group-hover:text-orange-300">Interior Design</span>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">Redesign any room with Japandi, Modern & Vastu palettes.</p>
                </div>
              </button>

              <button
                onClick={() => handleToolClick('exterior')}
                className="w-full text-left p-2.5 rounded-xl hover:bg-slate-800/80 border border-transparent hover:border-slate-700 transition-all group flex items-start gap-3"
              >
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Home size={16} />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-200 group-hover:text-amber-300">Exterior Design</span>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">Visualize exterior facade cladding, roof pitches & verandahs.</p>
                </div>
              </button>

              <button
                onClick={() => handleToolClick('garden')}
                className="w-full text-left p-2.5 rounded-xl hover:bg-slate-800/80 border border-transparent hover:border-slate-700 transition-all group flex items-start gap-3"
              >
                <div className="w-8 h-8 rounded-lg bg-lime-500/10 text-lime-400 border border-lime-500/20 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Flower2 size={16} />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-200 group-hover:text-lime-300">Garden Design</span>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">Create beautiful garden layouts and outdoor patio seating.</p>
                </div>
              </button>

              <button
                onClick={() => handleToolClick('landscape')}
                className="w-full text-left p-2.5 rounded-xl hover:bg-slate-800/80 border border-transparent hover:border-slate-700 transition-all group flex items-start gap-3"
              >
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Trees size={16} />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-200 group-hover:text-emerald-300">Landscape Design</span>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">Design perimeter lawns, pathways and yards with AI.</p>
                </div>
              </button>

              <button
                onClick={() => handleToolClick('staging')}
                className="w-full text-left p-2.5 rounded-xl hover:bg-slate-800/80 border border-transparent hover:border-slate-700 transition-all group flex items-start gap-3"
              >
                <div className="w-8 h-8 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <BedDouble size={16} />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-200 group-hover:text-red-300">Virtual Staging</span>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">Furnish empty rooms with realistic parametric furniture & decor.</p>
                </div>
              </button>
            </div>

            <button
              onClick={() => handleToolClick('interior')}
              className="text-[11px] text-rose-400 hover:text-rose-300 font-semibold flex items-center gap-1 pt-2 transition-colors"
            >
              <span>View all in Space Design</span>
              <ArrowRight size={12} />
            </button>
          </div>
        </div>

        {/* Bottom Pro Upgrade Banner */}
        <div className="px-6 py-3.5 bg-gradient-to-r from-amber-950/50 via-slate-900 to-amber-950/50 border-t border-amber-500/30 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center shrink-0">
              <Crown size={15} />
            </div>
            <div>
              <span className="font-bold text-white">Unlock Unlimited 4K Renders, CAD DXF & Full Vastu Analytics</span>
              <p className="text-[11px] text-slate-400">Upgrade to Pro Architect for commercial client presentation rights</p>
            </div>
          </div>
          <button
            onClick={() => {
              setMegaMenuOpen(false);
              setPremiumModalOpen(true);
            }}
            className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-slate-950 font-black text-xs transition-all shadow-md shadow-amber-500/20 shrink-0 flex items-center gap-1.5 cursor-pointer"
          >
            <span>View Pro Plans</span>
            <ArrowRight size={13} />
          </button>
        </div>
      </div>
    </div>
  );
};
