import React, { useState } from 'react';
import { useProjectStore } from '../store/useProjectStore';
import { CheckCircle2, AlertCircle, HelpCircle, Layers, ArrowRight, Edit3, Compass, Ruler, Home } from 'lucide-react';

export const ReviewModal: React.FC = () => {
  const isReviewModalOpen = useProjectStore((s) => s.isReviewModalOpen);
  const setReviewModalOpen = useProjectStore((s) => s.setReviewModalOpen);
  const planDoc = useProjectStore((s) => s.twoBuildersPlan);
  const setTwoBuildersPlan = useProjectStore((s) => s.setTwoBuildersPlan);
  const setViewMode = useProjectStore((s) => s.setViewMode);
  const setStatusMessage = useProjectStore((s) => s.setStatusMessage);

  const questions = planDoc?.review?.questions || [];
  const [answers, setAnswers] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const q of questions) {
      initial[q.id] = q.selected || (q.options ? q.options[0] : '');
    }
    return initial;
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isReviewModalOpen || !planDoc) return null;

  const outerBounds = planDoc.outerBounds || { widthMm: 9000, heightMm: 7000 };
  const widthM = (outerBounds.widthMm / 1000).toFixed(1);
  const heightM = (outerBounds.heightMm / 1000).toFixed(1);
  const vastu = planDoc.vastu || { score: 90, grade: 'A' };

  const handleSelectOption = (qid: string, val: string) => {
    setAnswers((prev) => ({ ...prev, [qid]: val }));
  };

  const handleConfirm = async () => {
    setIsSubmitting(true);
    setStatusMessage('Applying review answers and updating 3D model...');

    try {
      const payloadAnswers = Object.entries(answers).map(([qid, sel]) => {
        const qObj = questions.find((q: any) => q.id === qid);
        return {
          questionId: qid,
          selected: sel,
          targetId: qObj?.targetId
        };
      });

      const res = await fetch(`/api/v1/plans/${planDoc.id}/answers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: payloadAnswers })
      });

      if (res.ok) {
        const data = await res.json();
        setTwoBuildersPlan(data.plan);
      }

      setReviewModalOpen(false);
      setViewMode('3d');
      setStatusMessage('3D Architectural Model ready!');
    } catch (err: any) {
      console.error(err);
      setReviewModalOpen(false);
      setViewMode('3d');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenEditor = () => {
    setReviewModalOpen(false);
    setViewMode('split');
    setStatusMessage('Opened in 2D Editor for fine-tuning');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-sky-500/20">
              <CheckCircle2 size={22} className="text-white" />
            </div>
            <div>
              <h2 className="font-bold text-lg text-slate-100 flex items-center gap-2">
                <span>2builders Verification Review</span>
                <span className="text-xs bg-sky-500/20 text-sky-300 border border-sky-500/40 px-2 py-0.5 rounded-full font-mono">
                  v{planDoc.version || 1}
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Deterministic extraction complete. Confirm low-confidence questions or adjust in editor.
              </p>
            </div>
          </div>

          <div className="text-right">
            <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Vastu Score</div>
            <div className="text-base font-black text-amber-400 flex items-center gap-1 justify-end">
              <span>☸</span>
              <span>{vastu.score}/100 ({vastu.grade})</span>
            </div>
          </div>
        </div>

        {/* Plan Summary Stat Tiles */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 p-3.5 sm:p-5 bg-slate-950/30 border-b border-slate-800 text-center">
          <div className="bg-slate-800/50 p-2 sm:p-2.5 rounded-xl border border-slate-700/60">
            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Rooms</span>
            <span className="text-base sm:text-lg font-black text-sky-400">{planDoc.rooms?.length || 0}</span>
          </div>
          <div className="bg-slate-800/50 p-2 sm:p-2.5 rounded-xl border border-slate-700/60">
            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Walls</span>
            <span className="text-base sm:text-lg font-black text-slate-200">{planDoc.walls?.length || 0}</span>
          </div>
          <div className="bg-slate-800/50 p-2 sm:p-2.5 rounded-xl border border-slate-700/60">
            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Openings</span>
            <span className="text-base sm:text-lg font-black text-emerald-400">{planDoc.openings?.length || 0}</span>
          </div>
          <div className="bg-slate-800/50 p-2 sm:p-2.5 rounded-xl border border-slate-700/60">
            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Outer Size</span>
            <span className="text-xs sm:text-sm font-black text-amber-300">{widthM}m × {heightM}m</span>
          </div>
        </div>

        {/* Verification Questions */}
        <div className="p-4 sm:p-5 flex flex-col gap-3.5 sm:gap-4 max-h-[42vh] overflow-y-auto">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-300 uppercase tracking-wider">
            <HelpCircle size={15} className="text-amber-400" />
            <span>Verification Questions ({questions.length})</span>
          </div>

          {questions.map((q: any, idx: number) => {
            const currentSel = answers[q.id] || q.selected;
            return (
              <div key={q.id} className="bg-slate-800/40 border border-slate-700/80 rounded-xl p-3 sm:p-3.5 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200">
                    {idx + 1}. {q.question}
                  </span>
                  <span className="text-[10px] bg-amber-400/10 text-amber-300 border border-amber-400/30 px-1.5 py-0.5 rounded font-mono">
                    {q.trigger}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-1.5 sm:gap-2">
                  {(q.options || []).map((opt: string) => {
                    const isSelected = currentSel === opt;
                    return (
                      <button
                        key={opt}
                        onClick={() => handleSelectOption(q.id, opt)}
                        className={`px-3 py-2 rounded-lg text-xs font-semibold text-left transition-all border ${
                          isSelected
                            ? 'bg-sky-500/20 border-sky-400 text-sky-200 shadow-sm'
                            : 'bg-slate-900/60 border-slate-700/60 text-slate-300 hover:border-slate-500 hover:bg-slate-800'
                        }`}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Actions */}
        <div className="p-3.5 sm:p-4 bg-slate-950/80 border-t border-slate-800 flex flex-col-reverse sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
          <button
            onClick={handleOpenEditor}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-700 hover:border-slate-500 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-bold transition-all shadow"
          >
            <Edit3 size={15} />
            <span>Fix in 2D Editor</span>
          </button>

          <button
            onClick={handleConfirm}
            disabled={isSubmitting}
            className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-sky-500/25 transition-all transform active:scale-95"
          >
            <span>{isSubmitting ? 'Generating 3D...' : 'Confirm & View 3D'}</span>
            <ArrowRight size={15} />
          </button>
        </div>
      </div>
    </div>
  );
};


