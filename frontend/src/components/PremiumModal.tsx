import React, { useState } from 'react';
import {
  X,
  Crown,
  Sparkles,
  Check,
  Zap,
  ShieldCheck,
  Building2,
  ChevronDown,
  Lock,
  ArrowRight,
  CheckCircle2
} from 'lucide-react';
import { useProjectStore } from '../store/useProjectStore';
import { toast } from './Toast';

type BillingCycle = 'monthly' | 'yearly';
type Currency = 'USD' | 'INR' | 'EUR';

export const PremiumModal: React.FC = () => {
  const isPremiumModalOpen = useProjectStore((s) => s.isPremiumModalOpen);
  const setPremiumModalOpen = useProjectStore((s) => s.setPremiumModalOpen);
  const userTier = useProjectStore((s) => s.userTier);
  const setUserTier = useProjectStore((s) => s.setUserTier);

  const [billingCycle, setBillingCycle] = useState<BillingCycle>('yearly');
  const [currency, setCurrency] = useState<Currency>('USD');
  const [showMatrix, setShowMatrix] = useState<boolean>(false);
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  if (!isPremiumModalOpen) return null;

  const currencySymbols: Record<Currency, string> = {
    USD: '$',
    INR: '₹',
    EUR: '€'
  };

  const pricingData = {
    starter: {
      USD: { monthly: 0, yearly: 0 },
      INR: { monthly: 0, yearly: 0 },
      EUR: { monthly: 0, yearly: 0 }
    },
    pro: {
      USD: { monthly: 29, yearly: 19 },
      INR: { monthly: 2299, yearly: 1499 },
      EUR: { monthly: 27, yearly: 18 }
    },
    enterprise: {
      USD: { monthly: 69, yearly: 49 },
      INR: { monthly: 5499, yearly: 3999 },
      EUR: { monthly: 64, yearly: 45 }
    }
  };

  const sym = currencySymbols[currency];
  const proPrice = billingCycle === 'yearly' ? pricingData.pro[currency].yearly : pricingData.pro[currency].monthly;
  const entPrice = billingCycle === 'yearly' ? pricingData.enterprise[currency].yearly : pricingData.enterprise[currency].monthly;

  const handleUpgrade = (tier: 'free' | 'pro' | 'enterprise') => {
    setUserTier(tier);
    if (tier === 'pro') {
      toast.success('🎉 Welcome to Pro Architect! Unlimited 4K renders, CAD exports, and Vastu analytics unlocked.');
    } else if (tier === 'enterprise') {
      toast.success('🚀 Enterprise Studio Tier Activated! Multi-story support and commercial licenses ready.');
    } else {
      toast.info('Switched to Free Starter Plan.');
    }
    setPremiumModalOpen(false);
  };

  const comparisonFeatures = [
    { name: 'Deterministic Wall & Room Vectorization', free: 'Basic (1 plan)', pro: 'Unlimited', enterprise: 'Unlimited' },
    { name: 'Interactive 3D Dollhouse View', free: 'Standard', pro: 'Cut-Away & Full 3D', enterprise: 'Cut-Away & Full 3D' },
    { name: '4K PBR Photorealistic Lighting & Materials', free: '—', pro: '✓ Included', enterprise: '✓ Included' },
    { name: 'First-Person WASD Walkthrough & 360 Flythrough', free: '—', pro: '✓ Included', enterprise: '✓ Included' },
    { name: '19-Tool AI Architectural Mega Suite', free: 'Limited', pro: 'Full Access', enterprise: 'Full Access' },
    { name: 'MEP Electrical, Plumbing & Lighting Layers', free: '—', pro: '✓ Included', enterprise: '✓ Included' },
    { name: '8-Zone Vastu Shastra Dosha & Remedy Analytics', free: 'Score Only', pro: 'Complete Report', enterprise: 'Complete Report' },
    { name: 'Universal CAD Exports (DXF & Vector PDF)', free: 'Watermarked', pro: 'Production Ready', enterprise: 'Production Ready' },
    { name: '3D Mesh Exports (GLB, OBJ, 3D Print STL)', free: 'GLB Only', pro: 'All Formats', enterprise: 'All Formats' },
    { name: 'Multi-Floor & Multi-Elevation Buildings', free: '1 Floor', pro: 'Up to 3 Floors', enterprise: 'Unlimited Floors' },
    { name: 'White-Label Branding & Firm Title Blocks', free: '—', pro: '—', enterprise: '✓ Included' },
    { name: 'REST API & 2builders.plan/1 Schema Access', free: '—', pro: '—', enterprise: '✓ Full Access' },
    { name: 'Commercial Rights & Client Presentations', free: 'Personal', pro: 'Commercial', enterprise: 'Commercial + Resale' },
    { name: 'Priority GPU Processing Queue', free: 'Standard', pro: 'Sub-5s Priority', enterprise: 'Instant Dedicated' },
    { name: 'Dedicated Architectural Concierge & Support', free: 'Community', pro: 'Priority Email', enterprise: '1-on-1 Specialist' }
  ];

  const faqs = [
    {
      q: 'Can I cancel or switch plans at any time?',
      a: 'Yes, absolutely. You can upgrade, downgrade, or cancel your subscription at any moment with 1 click from your account settings. There are no lock-in contracts.'
    },
    {
      q: 'Do I get commercial rights for client architectural projects?',
      a: 'Yes! Both Pro Architect and Studio Enterprise tiers include full commercial licensing rights to present, sell, publish, and build projects using your exported 3D models and blueprints.'
    },
    {
      q: 'How does 2builders achieve 100% deterministic geometry without AI hallucinations?',
      a: 'Our platform relies on exact mathematical medial axis skeletonization, cavity consolidation algorithms, and precise topological graph snapping. This ensures every wall centerline is watertight and scale-accurate, with zero overlapping surfaces.'
    },
    {
      q: 'What formats can I export my 3D homes and plans into?',
      a: 'You can export into AutoCAD DXF, ISO A4 Vector PDF Blueprints with schedules, WebGL GLB (glTF 2.0), Wavefront OBJ, 3D printing STL, and high-resolution 4K PNG renders.'
    },
    {
      q: 'Is there a money-back guarantee?',
      a: 'Yes, we provide a 14-day, 100% no-questions-asked money-back guarantee. If 2builders does not transform your drafting workflow, we will issue a full refund immediately.'
    }
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-xl animate-in fade-in duration-200 overflow-y-auto"
      onClick={() => setPremiumModalOpen(false)}
    >
      <div
        className="w-full max-w-5xl my-auto bg-gradient-to-b from-[#0b1220] to-[#070b14] border border-white/10 rounded-3xl shadow-2xl overflow-hidden text-slate-100 flex flex-col relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Architectural Glow Effect */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-48 bg-gradient-to-b from-amber-500/20 via-sky-500/10 to-transparent blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="p-6 sm:p-8 pb-4 relative z-10 text-center space-y-4">
          <button
            onClick={() => setPremiumModalOpen(false)}
            className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            title="Close"
          >
            <X size={20} />
          </button>

          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-amber-500/15 via-orange-500/15 to-amber-500/15 border border-amber-500/40 text-amber-300 text-xs font-bold shadow-lg shadow-amber-500/10">
            <Crown size={15} className="text-amber-400 fill-amber-400" />
            <span>2BUILDERS PREMIUM ARCHITECTURAL PLANS</span>
          </div>

          <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
            Build Better Spaces with{' '}
            <span className="bg-gradient-to-r from-amber-300 via-amber-400 to-orange-400 bg-clip-text text-transparent">
              Pro Architectural Power
            </span>
          </h2>

          <p className="text-xs sm:text-sm text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Unlock unlimited 2D-to-3D floor plan conversions, 4K realistic PBR renders, universal CAD/BIM exports,
            MEP layers, and automated 8-Zone Vastu Shastra compliance analysis.
          </p>

          {/* Currency Switcher & Billing Cycle Toggle */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            {/* Currency Pill */}
            <div className="inline-flex items-center bg-slate-900/90 border border-slate-700/80 rounded-xl p-1 text-xs font-semibold">
              {(['USD', 'INR', 'EUR'] as Currency[]).map((curr) => (
                <button
                  key={curr}
                  onClick={() => setCurrency(curr)}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    currency === curr
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {curr} ({currencySymbols[curr]})
                </button>
              ))}
            </div>

            {/* Monthly / Yearly Toggle */}
            <div className="inline-flex items-center bg-slate-900/90 border border-slate-700/80 rounded-xl p-1 text-xs font-semibold">
              <button
                onClick={() => setBillingCycle('monthly')}
                className={`px-3.5 py-1.5 rounded-lg transition-all ${
                  billingCycle === 'monthly'
                    ? 'bg-slate-800 text-white font-bold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingCycle('yearly')}
                className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                  billingCycle === 'yearly'
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black shadow-md shadow-amber-500/20'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>Annual Billing</span>
                <span className="text-[10px] bg-slate-950/80 text-amber-300 px-1.5 py-0.2 rounded font-black tracking-wide">
                  SAVE 40%
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* 3 Tier Cards */}
        <div className="p-6 sm:p-8 pt-2 grid grid-cols-1 md:grid-cols-3 gap-5 max-h-[60vh] overflow-y-auto relative z-10">
          
          {/* TIER 1: STARTER */}
          <div className="bg-slate-900/60 border border-slate-800/90 hover:border-slate-700 rounded-2xl p-5 sm:p-6 flex flex-col justify-between transition-all">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Starter</span>
                {userTier === 'free' && (
                  <span className="text-[10px] bg-slate-800 text-slate-300 border border-slate-700 px-2 py-0.5 rounded-full font-bold">
                    Active Plan
                  </span>
                )}
              </div>

              <div>
                <div className="text-3xl font-black text-white">
                  {sym}0
                  <span className="text-xs text-slate-500 font-normal ml-1">/ forever</span>
                </div>
                <p className="text-xs text-slate-400 mt-1 leading-snug">
                  Ideal for testing the deterministic geometry engine and previewing 3D home conversions.
                </p>
              </div>

              <div className="pt-2 border-t border-slate-800 space-y-2.5 text-xs text-slate-300">
                <div className="flex items-center gap-2">
                  <Check size={14} className="text-emerald-400 shrink-0" />
                  <span>Deterministic 2D to 3D Conversion</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check size={14} className="text-emerald-400 shrink-0" />
                  <span>Standard 3D Dollhouse View</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check size={14} className="text-emerald-400 shrink-0" />
                  <span>Single-Floor Project Support</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check size={14} className="text-emerald-400 shrink-0" />
                  <span>Basic Vastu 8-Zone Energy Check</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check size={14} className="text-emerald-400 shrink-0" />
                  <span>Standard 3D WebGL GLB Export</span>
                </div>
                <div className="flex items-center gap-2 text-slate-500">
                  <X size={14} className="shrink-0" />
                  <span>No 4K Photorealistic Renders</span>
                </div>
                <div className="flex items-center gap-2 text-slate-500">
                  <X size={14} className="shrink-0" />
                  <span>No CAD DXF or Vector PDF Blueprints</span>
                </div>
              </div>
            </div>

            <div className="pt-6">
              <button
                type="button"
                onClick={() => handleUpgrade('free')}
                className="w-full py-2.5 rounded-xl border border-slate-700 hover:border-slate-500 bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 text-xs font-bold transition-all text-center"
              >
                {userTier === 'free' ? 'Current Plan' : 'Select Starter'}
              </button>
            </div>
          </div>

          {/* TIER 2: PRO ARCHITECT (MOST POPULAR) */}
          <div className="relative bg-gradient-to-b from-amber-950/40 via-slate-900/90 to-slate-900/90 border-2 border-amber-500/80 shadow-2xl shadow-amber-500/15 rounded-2xl p-5 sm:p-6 flex flex-col justify-between transition-all scale-[1.02] z-20">
            {/* Top Ribbon Badge */}
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 text-slate-950 text-[10px] font-black uppercase px-3 py-0.5 rounded-full shadow-md tracking-wider flex items-center gap-1">
              <Sparkles size={11} className="fill-slate-950" />
              <span>MOST POPULAR • ARCHITECT CHOICE</span>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                  <Crown size={15} className="text-amber-400 fill-amber-400" />
                  <span>Pro Architect</span>
                </span>
                {userTier === 'pro' && (
                  <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full font-bold">
                    Active
                  </span>
                )}
              </div>

              <div>
                <div className="text-3xl sm:text-4xl font-black text-white flex items-baseline gap-1">
                  <span>{sym}{proPrice}</span>
                  <span className="text-xs text-slate-400 font-normal">/ month</span>
                </div>
                <p className="text-[11px] text-amber-200/80 mt-1 font-medium">
                  {billingCycle === 'yearly' ? `Billed annually at ${sym}${proPrice * 12}/year (save 40%)` : 'Billed monthly, cancel anytime'}
                </p>
                <p className="text-xs text-slate-300 mt-1.5 leading-snug">
                  Everything an architect, interior designer, or 3D visualizer needs for full client production.
                </p>
              </div>

              <div className="pt-2 border-t border-amber-500/30 space-y-2.5 text-xs text-slate-200">
                <div className="flex items-center gap-2">
                  <Check size={14} className="text-amber-400 font-bold shrink-0" />
                  <span className="font-semibold text-white">Unlimited 2D to 3D Conversions</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check size={14} className="text-amber-400 font-bold shrink-0" />
                  <span><strong>4K Ultra-HD</strong> PBR Photorealistic Renders</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check size={14} className="text-amber-400 font-bold shrink-0" />
                  <span><strong>All 19</strong> Floor-Plan.AI Mega Suite Tools</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check size={14} className="text-amber-400 font-bold shrink-0" />
                  <span><strong>MEP Layers</strong>: Electrical, Plumbing & Lighting</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check size={14} className="text-amber-400 font-bold shrink-0" />
                  <span><strong>Full 8-Zone Vastu</strong> Dosha Detection & Remedies</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check size={14} className="text-amber-400 font-bold shrink-0" />
                  <span><strong>First-Person Walkthrough</strong> & 360 Flythrough Video</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check size={14} className="text-amber-400 font-bold shrink-0" />
                  <span><strong>CAD DXF & Vector PDF</strong> Blueprint Exports</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check size={14} className="text-amber-400 font-bold shrink-0" />
                  <span>GLB, Wavefront OBJ & 3D Print STL</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check size={14} className="text-amber-400 font-bold shrink-0" />
                  <span>Priority GPU Queue (Sub-5s Processing)</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check size={14} className="text-amber-400 font-bold shrink-0" />
                  <span>Commercial Client Presentation Rights</span>
                </div>
              </div>
            </div>

            <div className="pt-6">
              <button
                type="button"
                onClick={() => handleUpgrade('pro')}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-slate-950 text-xs sm:text-sm font-black transition-all shadow-xl shadow-amber-500/25 flex items-center justify-center gap-2 group cursor-pointer"
              >
                <Crown size={16} className="fill-slate-950" />
                <span>{userTier === 'pro' ? 'Current Plan (Active)' : 'Upgrade to Pro Architect'}</span>
                <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>

          {/* TIER 3: STUDIO & ENTERPRISE */}
          <div className="bg-slate-900/60 border border-slate-800/90 hover:border-indigo-500/50 rounded-2xl p-5 sm:p-6 flex flex-col justify-between transition-all">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                  <Building2 size={15} />
                  <span>Studio & Enterprise</span>
                </span>
                {userTier === 'enterprise' && (
                  <span className="text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 px-2 py-0.5 rounded-full font-bold">
                    Active
                  </span>
                )}
              </div>

              <div>
                <div className="text-3xl sm:text-4xl font-black text-white flex items-baseline gap-1">
                  <span>{sym}{entPrice}</span>
                  <span className="text-xs text-slate-400 font-normal">/ month</span>
                </div>
                <p className="text-[11px] text-indigo-300/80 mt-1 font-medium">
                  {billingCycle === 'yearly' ? `Billed annually at ${sym}${entPrice * 12}/year` : 'Billed monthly'}
                </p>
                <p className="text-xs text-slate-400 mt-1.5 leading-snug">
                  Tailored for architectural studios, engineering firms, real estate teams, and high-volume developers.
                </p>
              </div>

              <div className="pt-2 border-t border-slate-800 space-y-2.5 text-xs text-slate-300">
                <div className="flex items-center gap-2">
                  <Check size={14} className="text-indigo-400 shrink-0" />
                  <span className="font-semibold text-white">Everything in Pro Architect, plus:</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check size={14} className="text-indigo-400 shrink-0" />
                  <span><strong>Multi-Story Projects</strong> (Unlimited Floors)</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check size={14} className="text-indigo-400 shrink-0" />
                  <span><strong>White-Label Branding</strong> on Blueprints & Renders</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check size={14} className="text-indigo-400 shrink-0" />
                  <span><strong>Team Workspace</strong> (Up to 10 Seats Included)</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check size={14} className="text-indigo-400 shrink-0" />
                  <span><strong>REST API</strong> & `2builders.plan/1` Schema Access</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check size={14} className="text-indigo-400 shrink-0" />
                  <span>Custom Title Blocks & Stamp Templates</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check size={14} className="text-indigo-400 shrink-0" />
                  <span>Dedicated Architectural Concierge & CAD Support</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check size={14} className="text-indigo-400 shrink-0" />
                  <span>Custom Invoicing & Enterprise SLA</span>
                </div>
              </div>
            </div>

            <div className="pt-6">
              <button
                type="button"
                onClick={() => handleUpgrade('enterprise')}
                className="w-full py-2.5 rounded-xl border border-indigo-500/50 hover:border-indigo-400 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-200 text-xs font-bold transition-all text-center flex items-center justify-center gap-1.5"
              >
                <span>{userTier === 'enterprise' ? 'Current Plan (Active)' : 'Get Studio License'}</span>
                <ArrowRight size={13} />
              </button>
            </div>
          </div>
        </div>

        {/* Feature Comparison Accordion & Trust Badges */}
        <div className="px-6 sm:px-8 pb-6 border-t border-slate-800/80 pt-4 space-y-4 relative z-10 bg-slate-950/40">
          
          {/* Trust Guarantees Row */}
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-8 text-[11px] text-slate-400 font-medium">
            <div className="flex items-center gap-1.5 text-emerald-400">
              <ShieldCheck size={16} />
              <span>14-Day 100% Money-Back Guarantee</span>
            </div>
            <div className="flex items-center gap-1.5 text-sky-400">
              <Lock size={15} />
              <span>256-Bit SSL Encrypted Checkout</span>
            </div>
            <div className="flex items-center gap-1.5 text-amber-400">
              <Zap size={15} />
              <span>Instant Activation (No Delay)</span>
            </div>
            <div className="flex items-center gap-1.5 text-purple-400">
              <CheckCircle2 size={15} />
              <span>Cancel Anytime with 1 Click</span>
            </div>
          </div>

          {/* Toggle Full Comparison Matrix */}
          <div className="text-center pt-2">
            <button
              onClick={() => setShowMatrix(!showMatrix)}
              className="inline-flex items-center gap-1.5 text-xs text-sky-400 hover:text-sky-300 font-bold transition-colors"
            >
              <span>{showMatrix ? 'Hide Full Feature Comparison Matrix' : 'View Full Feature Comparison Matrix (15 Categories)'}</span>
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
                    <th className="py-2 px-3">Starter</th>
                    <th className="py-2 px-3 text-amber-400">Pro Architect</th>
                    <th className="py-2 px-3 text-indigo-400">Studio & Enterprise</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                  {comparisonFeatures.map((f, i) => (
                    <tr key={i} className="hover:bg-slate-800/30">
                      <td className="py-2 px-3 font-sans font-medium text-slate-200">{f.name}</td>
                      <td className="py-2 px-3 text-slate-400">{f.free}</td>
                      <td className="py-2 px-3 text-amber-300 font-bold">{f.pro}</td>
                      <td className="py-2 px-3 text-indigo-300 font-bold">{f.enterprise}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* FAQ Preview */}
          <div className="pt-2 space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block text-center">
              Frequently Asked Questions
            </span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
              {faqs.slice(0, 4).map((faq, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-left cursor-pointer hover:border-slate-700 transition-colors"
                  onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
                >
                  <div className="flex items-center justify-between font-bold text-slate-200">
                    <span>{faq.q}</span>
                    <ChevronDown size={14} className={`text-slate-400 shrink-0 transition-transform ${activeFaq === idx ? 'rotate-180 text-amber-400' : ''}`} />
                  </div>
                  {activeFaq === idx && (
                    <p className="mt-2 text-slate-400 text-[11px] leading-relaxed pt-2 border-t border-slate-800/80">
                      {faq.a}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};

