import React from 'react';
import { X, CheckCircle2, AlertTriangle, AlertCircle, ShieldCheck } from 'lucide-react';
import { useProjectStore } from '../store/useProjectStore';

export const ValidationReportModal: React.FC = () => {
  const isValidationModalOpen = useProjectStore((s) => s.isValidationModalOpen);
  const setValidationModalOpen = useProjectStore((s) => s.setValidationModalOpen);
  const validationReport = useProjectStore((s) => s.validationReport);
  const setSelectedEntity = useProjectStore((s) => s.setSelectedEntity);

  if (!isValidationModalOpen || !validationReport) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-cad-panel border border-cad-border w-full max-w-lg rounded-xl shadow-2xl flex flex-col overflow-hidden text-slate-100">
        {/* Header */}
        <div className="p-4 border-b border-cad-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck size={18} className="text-cad-accent" />
            <span className="font-bold text-base">Geometry Validation Report</span>
          </div>
          <button
            onClick={() => setValidationModalOpen(false)}
            className="text-slate-400 hover:text-slate-100 p-1 rounded"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 text-xs max-h-[60vh] overflow-y-auto">
          {validationReport.isValid ? (
            <div className="p-4 bg-emerald-950/40 border border-emerald-800 rounded-lg flex items-center gap-3 text-emerald-300">
              <CheckCircle2 size={24} className="shrink-0 text-emerald-400" />
              <div>
                <div className="font-bold text-sm">Building Geometry is Fully Valid!</div>
                <div className="text-[11px] text-emerald-400/80 mt-0.5">{validationReport.summary}</div>
              </div>
            </div>
          ) : (
            <div className="p-3 bg-red-950/40 border border-red-800 rounded-lg flex items-center gap-3 text-red-300">
              <AlertCircle size={22} className="shrink-0 text-red-400" />
              <div>
                <div className="font-bold">Geometric Inconsistencies Detected</div>
                <div className="text-[11px] text-red-400/80 mt-0.5">{validationReport.summary}</div>
              </div>
            </div>
          )}

          {/* Issues List */}
          {validationReport.issues.length > 0 && (
            <div className="space-y-2">
              <span className="font-semibold text-slate-300">Detailed Diagnostic Findings</span>
              {validationReport.issues.map((issue, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded border text-xs flex gap-3 items-start ${
                    issue.type === 'error'
                      ? 'bg-red-950/20 border-red-900/60 text-red-200'
                      : 'bg-yellow-950/20 border-yellow-900/60 text-yellow-200'
                  }`}
                >
                  {issue.type === 'error' ? (
                    <AlertCircle size={16} className="text-red-400 mt-0.5 shrink-0" />
                  ) : (
                    <AlertTriangle size={16} className="text-yellow-400 mt-0.5 shrink-0" />
                  )}

                  <div className="flex-1 space-y-1">
                    <div className="font-medium">{issue.description}</div>
                    <div className="text-[11px] text-slate-400">
                      Recommendation: <span className="text-slate-200">{issue.suggestion}</span>
                    </div>
                  </div>

                  {issue.objectId && (
                    <button
                      onClick={() => {
                        setSelectedEntity({ type: 'wall', id: issue.objectId! });
                        setValidationModalOpen(false);
                      }}
                      className="px-2 py-1 bg-cad-surface border border-cad-border hover:border-cad-accent text-[10px] text-cad-accent rounded shrink-0"
                    >
                      Locate
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-cad-border flex justify-end">
          <button
            onClick={() => setValidationModalOpen(false)}
            className="px-4 py-1.5 bg-cad-surface hover:bg-cad-border border border-cad-border text-slate-200 font-medium rounded"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

