import React, { useState } from 'react';
import {
  X,
  Sparkles,
  Check,
  Zap,
  ShieldCheck,
  Building2,
  ChevronDown,
  ArrowRight,
  CheckCircle2,
  Box,
  Download
} from 'lucide-react';
import { useProjectStore } from '../store/useProjectStore';

export const PremiumModal: React.FC = () => {
  const isPremiumModalOpen = useProjectStore((s) => s.isPremiumModalOpen);
  const setPremiumModalOpen = useProjectStore((s) => s.setPremiumModalOpen);

  const [showMatrix, setShowMatrix] = useState<boolean>(false);
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  if (!isPremiumModalOpen) return null;

  const comparisonFeatures = [
    { name: 'Deterministic Wall & Room Vectorization', status: '✓ Included (Unlimited)' },
    { name: 'Interactive 3D Dollhouse Orbital View', status: '✓ Included (Free)' },
    { name: '4K PBR Photorealistic Lighting & Materials', status: '✓ Included (Free)' },
    { name: 'First-Person WASD Walkthrough & 360 Flythrough', status: '✓ Included (Free)' },
    { name: '19-Tool Architectural AI Mega Suite', status: '✓ Full Access (Free)' },
    { name: 'MEP Electrical, Plumbing & Lighting Layers', status: '✓ Included (Free)' },
    { name: '8-Zone Vastu Shastra Dosha & Remedy Analytics', status: '✓ Full Report (Free)' },
    { name: 'Universal CAD Exports (AutoCAD DXF & Vector PDF)', status: '✓ Unwatermarked (Free)' },
    { name: '3D Mesh Exports (GLB, OBJ, 3D Print STL)', status: '✓ All Formats (Free)' },
    { name: 'Multi-Floor & Multi-Elevation Buildings', status: '✓ Unlimited (Free)' },
    { name: 'White-Label Branding & Firm Title Blocks', status: '✓ Included (Free)' },
    { name: 'REST API & 2builders.plan/1 Schema Access', status: '✓ Full Access (Free)' },
    { name: 'Commercial Rights & Client Presentations', status: '✓ Commercial Included (Free)' },
    { name: 'Sub-5s Instant GPU Processing Queue', status: '✓ Instant Priority (Free)' }
  ];

  const faqs = [
    {
      q: 'Is 2builders really 100% free with no limits?',
      a: 'Yes, absolutely. There are no paid subscriptions, no credit card requirements, no usage caps, and no hidden fees. All 19 tools, 4K renders, and CAD exports are completely free.'
    },
    {
      q: 'Can I use exported models and blueprints commercially?',
      a: 'Yes! All exports—including AutoCAD DXF files, ISO A4 Vector PDF blueprints, and 3D GLB/OBJ meshes—are unwatermarked and include full commercial usage rights for client presentations and real estate listings.'
    },
    {
      q: 'How does 2builders achieve 100% deterministic geometry without AI hallucinations?',
      a: 'The engine uses pure computer vision algorithms: medial axis skeletonization and iterative cavity consolidation. Walls, doors, and rooms are mapped with sub-millimeter mathematical accuracy with zero overlapping meshes.'
    },
    {
      q: 'What file formats can I export?',
      a: 'You can export into AutoCAD DXF, ISO A4 Vector PDF Blueprints, glTF 2.0 Binary (GLB), Wavefront OBJ, 3D printing STL, and high-resolution 4K PNG renders.'
    }
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-xl animate-in fade-in duration-200 overflow-y-auto"
      onClick={() => setPremiumModalOpen(false)}
    >
      <div
        className="w-full max-w-4xl my-auto bg-gradient-to-b from-[#0b1220] to-[#070b14] border border-white/10 rounded-3xl shadow-2xl overflow-hidden text-slate-100 flex flex-col relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Architectural Glow Effect */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-48 bg-gradient-to-b from-emerald-500/15 via-sky-500/10 to-transparent blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="p-6 sm:p-8 pb-4 relative z-10 text-center space-y-4">
          <button
            onClick={() => setPremiumModalOpen(false)}
            className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            title="Close"
          >
            <X size={20} />
          </button>

          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-bold shadow-md shadow-emerald-500/10">
            <Sparkles size={15} className="text-emerald-400" />
            <span>100% FREE FOREVER • ALL CAPABILITIES UNLOCKED</span>
          </div>

          <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
            Professional Architectural Power —{' '}
            <span className="bg-gradient-to-r from-emerald-300 via-teal-300 to-sky-400 bg-clip-text text-transparent">
              Zero Price, No Limits
            </span>
          </h2>

          <p className="text-xs sm:text-sm text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Every feature on 2builders is completely free for all users. Enjoy unlimited 2D-to-3D conversions, 4K realistic PBR renders, universal CAD/BIM exports, and automated 8-Zone Vastu Shastra analysis with full commercial presentation rights.
          </p>
        </div>

        {/* 3 Core Capability Columns */}
        <div className="p-6 sm:p-8 pt-2 grid grid-cols-1 md:grid-cols-3 gap-4 max-h-[55vh] overflow-y-auto relative z-10">
          
          {/* Column 1: Conversion */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sky-400 font-bold text-xs uppercase tracking-wider">
                <Box size={16} />
                <span>Deterministic 2D-to-3D</span>
              </div>
              <h3 className="font-bold text-base text-white">Unlimited Synthesis</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Convert infinite floor plans from scans, photos, sketches, or CAD drawings with sub-millimeter precision.
              </p>
              <div className="pt-2 border-t border-slate-800 space-y-2 text-xs text-slate-300">
                <div className="flex items-center gap-2">
                  <Check size={14} className="text-emerald-400 shrink-0" />
                  <span>Unlimited floor plan uploads</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check size={14} className="text-emerald-400 shrink-0" />
                  <span>Zero overlapping walls guarantee</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check size={14} className="text-emerald-400 shrink-0" />
                  <span>Sub-millimeter scale accuracy</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check size={14} className="text-emerald-400 shrink-0" />
                  <span>Automated room & area detection</span>
                </div>
              </div>
            </div>
          </div>

          {/* Column 2: 3D Visualization */}
          <div className="bg-slate-900/60 border border-sky-500/40 rounded-2xl p-5 flex flex-col justify-between shadow-lg shadow-sky-500/10">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider">
                <Sparkles size={16} />
                <span>Realistic 3D & Walkthrough</span>
              </div>
              <h3 className="font-bold text-base text-white">4K PBR Dollhouse</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Full orbital 3D dollhouse, cut-away 900mm walls, and eye-level WASD walkthroughs with warm PBR sunlight.
              </p>
              <div className="pt-2 border-t border-slate-800 space-y-2 text-xs text-slate-300">
                <div className="flex items-center gap-2">
                  <Check size={14} className="text-emerald-400 shrink-0" />
                  <span>4K photorealistic PBR rendering</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check size={14} className="text-emerald-400 shrink-0" />
                  <span>First-person eye-level walkthrough</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check size={14} className="text-emerald-400 shrink-0" />
                  <span>360 cinematic flythrough camera</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check size={14} className="text-emerald-400 shrink-0" />
                  <span>All 19 Floor-Plan.AI tool suite access</span>
                </div>
              </div>
            </div>
          </div>

          {/* Column 3: Exports & Vastu */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-purple-400 font-bold text-xs uppercase tracking-wider">
                <Download size={16} />
                <span>CAD Exports & Vastu</span>
              </div>
              <h3 className="font-bold text-base text-white">Universal Deliverables</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Deliver CAD files and blueprints directly to clients with zero watermarks and full commercial rights.
              </p>
              <div className="pt-2 border-t border-slate-800 space-y-2 text-xs text-slate-300">
                <div className="flex items-center gap-2">
                  <Check size={14} className="text-emerald-400 shrink-0" />
                  <span>AutoCAD DXF vector drawings</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check size={14} className="text-emerald-400 shrink-0" />
                  <span>ISO A4 Vector PDF Blueprints</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check size={14} className="text-emerald-400 shrink-0" />
                  <span>WebGL GLB, OBJ & 3D Print STL</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check size={14} className="text-emerald-400 shrink-0" />
                  <span>Full commercial presentation rights</span>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Feature Comparison Accordion & Trust Badges */}
        <div className="px-6 sm:px-8 pb-6 border-t border-slate-800/80 pt-4 space-y-4 relative z-10 bg-slate-950/40">
          
          {/* Trust Guarantees Row */}
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-8 text-[11px] text-slate-400 font-medium">
            <div className="flex items-center gap-1.5 text-emerald-400">
              <CheckCircle2 size={16} />
              <span>100% Free Forever</span>
            </div>
            <div className="flex items-center gap-1.5 text-sky-400">
              <Zap size={15} />
              <span>No Limits on Conversions</span>
            </div>
            <div className="flex items-center gap-1.5 text-purple-400">
              <ShieldCheck size={15} />
              <span>Commercial Rights Included</span>
            </div>
            <div className="flex items-center gap-1.5 text-amber-400">
              <Sparkles size={15} />
              <span>No Credit Card Required</span>
            </div>
          </div>

          {/* Toggle Full Comparison Matrix */}
          <div className="text-center pt-1">
            <button
              onClick={() => setShowMatrix(!showMatrix)}
              className="inline-flex items-center gap-1.5 text-xs text-sky-400 hover:text-sky-300 font-bold transition-colors"
            >
              <span>{showMatrix ? 'Hide Feature Breakdown' : 'View All 14 Included Capabilities'}</span>
              <ChevronDown size={14} className={`transition-transform ${showMatrix ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {/* Full Matrix Table */}
          {showMatrix && (
            <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/60 p-3 animate-in fade-in duration-150">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-[10px] text-slate-400 uppercase tracking-wider font-bold">
                    <th className="py-2 px-3">Architectural Feature</th>
                    <th className="py-2 px-3 text-emerald-400">2builders Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                  {comparisonFeatures.map((f, i) => (
                    <tr key={i} className="hover:bg-slate-800/30">
                      <td className="py-2 px-3 font-sans font-medium text-slate-200">{f.name}</td>
                      <td className="py-2 px-3 text-emerald-300 font-bold">{f.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Close / Start Button */}
          <div className="pt-2 text-center">
            <button
              type="button"
              onClick={() => {
                setPremiumModalOpen(false);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="px-8 py-3 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-sky-500 hover:from-emerald-400 hover:to-sky-400 text-slate-950 font-black text-xs sm:text-sm tracking-wide shadow-xl shadow-emerald-500/20 transition-all transform active:scale-95 inline-flex items-center gap-2 cursor-pointer"
            >
              <Sparkles size={16} className="fill-slate-950" />
              <span>Start Converting Floor Plans (100% Free)</span>
              <ArrowRight size={14} />
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};
