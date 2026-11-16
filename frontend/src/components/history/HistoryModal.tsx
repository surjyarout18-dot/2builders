import React, { useState, useEffect } from 'react';
import {
  History,
  GitBranch,
  RotateCcw,
  RotateCw,
  Plus,
  Clock,
  Layers,
  Square,
  DoorOpen,
  Maximize2,
  CheckCircle2,
  AlertCircle,
  X,
  ArrowRight
} from 'lucide-react';
import { useFloorPlanStore } from '../../store/useFloorPlanStore';
import { VersionCheckpoint } from '../../types/architectural';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HistoryModal: React.FC<HistoryModalProps> = ({ isOpen, onClose }) => {
  const {
    model,
    createCheckpoint,
    restoreCheckpoint,
    undo,
    redo,
    historyIndex,
    history
  } = useFloorPlanStore();

  const [activeTab, setActiveTab] = useState<'checkpoints' | 'actions'>('checkpoints');
  const [newCheckpointName, setNewCheckpointName] = useState<string>('');
  const [newCheckpointSummary, setNewCheckpointSummary] = useState<string>('');
  const [restoredId, setRestoredId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const checkpoints = model.checkpoints || [];

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCheckpointName.trim()) return;
    createCheckpoint(
      newCheckpointName.trim(),
      newCheckpointSummary.trim() || 'Manual user checkpoint'
    );
    setNewCheckpointName('');
    setNewCheckpointSummary('');
  };

  const handleRestore = (cp: VersionCheckpoint) => {
    restoreCheckpoint(cp.id);
    setRestoredId(cp.id);
    setTimeout(() => setRestoredId(null), 2500);
  };

  // Compute active model statistics
  const activeFloor = model.floors[0] || { walls: [], rooms: [], doors: [], windows: [] };
  const totalWalls = model.floors.reduce((acc, fl) => acc + (fl.walls || []).length, 0);
  const totalRooms = model.floors.reduce((acc, fl) => acc + (fl.rooms || []).length, 0);
  const totalArea = model.floors.reduce(
    (acc, fl) => acc + (fl.rooms || []).reduce((ra, r) => ra + (r.area_sqm || 0), 0),
    0
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md font-sans"
      onClick={onClose}
    >
      <div
        className="relative flex h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-[#1F2942] bg-[#0A0D16] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#1F2942] bg-[#0E1424] px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#00F0FF]/15 text-[#00F0FF] border border-[#00F0FF]/30">
              <History className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-[#F1F5F9]">
                  Revision History & Model Checkpoints
                </h2>
                <span className="rounded-full bg-[#00F0FF]/10 px-2 py-0.5 font-mono text-[10px] font-bold text-[#00F0FF]">
                  /history
                </span>
              </div>
              <p className="font-mono text-xs text-[#94A3B8]">
                Audit trail • Architectural milestones • Time-travel rollback
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Quick Undo / Redo */}
            <div className="flex items-center rounded-lg border border-[#1F2942] bg-[#161F33] p-0.5 mr-2">
              <button
                onClick={undo}
                disabled={historyIndex <= 0}
                className="flex items-center gap-1 rounded px-2 py-1 text-xs text-[#94A3B8] hover:text-[#F1F5F9] disabled:opacity-40 transition-colors"
                title="Undo (Ctrl+Z)"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Undo</span>
              </button>
              <div className="h-3.5 w-px bg-[#1F2942]" />
              <button
                onClick={redo}
                disabled={historyIndex >= history.length - 1}
                className="flex items-center gap-1 rounded px-2 py-1 text-xs text-[#94A3B8] hover:text-[#F1F5F9] disabled:opacity-40 transition-colors"
                title="Redo (Ctrl+Y)"
              >
                <RotateCw className="h-3.5 w-3.5" />
                <span>Redo</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-[#94A3B8] hover:bg-[#1F2942] hover:text-[#F1F5F9] transition-colors"
              title="Close (ESC)"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation & Live Stats */}
        <div className="flex items-center justify-between border-b border-[#1F2942] bg-[#070A12] px-6 py-2.5 text-xs font-mono">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('checkpoints')}
              className={`rounded-lg px-3 py-1.5 font-bold transition-all ${
                activeTab === 'checkpoints'
                  ? 'bg-[#00F0FF] text-[#0A0D14]'
                  : 'text-[#94A3B8] hover:bg-[#161F33] hover:text-[#F1F5F9]'
              }`}
            >
              Saved Milestones ({checkpoints.length})
            </button>
            <button
              onClick={() => setActiveTab('actions')}
              className={`rounded-lg px-3 py-1.5 font-bold transition-all ${
                activeTab === 'actions'
                  ? 'bg-[#00F0FF] text-[#0A0D14]'
                  : 'text-[#94A3B8] hover:bg-[#161F33] hover:text-[#F1F5F9]'
              }`}
            >
              Action Stack ({history.length} steps)
            </button>
          </div>

          <div className="flex items-center gap-3 text-[#94A3B8]">
            <span>Active: <strong className="text-[#F1F5F9]">{totalWalls}</strong> walls</span>
            <span>•</span>
            <span><strong className="text-[#F1F5F9]">{totalRooms}</strong> rooms</span>
            <span>•</span>
            <span><strong className="text-[#00F0FF]">{totalArea.toFixed(1)} m²</strong> gross</span>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex flex-1 overflow-hidden p-6 gap-6">
          {activeTab === 'checkpoints' ? (
            <div className="flex flex-1 flex-col md:flex-row gap-6 overflow-hidden">
              {/* Checkpoints Timeline List */}
              <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin">
                {checkpoints.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-48 rounded-xl border border-dashed border-[#1F2942] text-center p-6">
                    <History className="h-8 w-8 text-[#64748B] mb-2" />
                    <p className="text-sm font-semibold text-[#94A3B8]">No Saved Checkpoints</p>
                    <p className="text-xs text-[#64748B] mt-1 max-w-sm">
                      Create your first milestone using the form to bookmark your architectural geometry.
                    </p>
                  </div>
                ) : (
                  checkpoints.map((cp, idx) => {
                    const isRestored = restoredId === cp.id;
                    const dateStr = new Date(cp.timestamp).toLocaleString([], {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    });

                    // Snapshot metrics if present
                    const snapWalls = cp.snapshot
                      ? cp.snapshot.floors.reduce((a, f) => a + (f.walls || []).length, 0)
                      : null;
                    const snapRooms = cp.snapshot
                      ? cp.snapshot.floors.reduce((a, f) => a + (f.rooms || []).length, 0)
                      : null;

                    return (
                      <div
                        key={cp.id}
                        className={`group relative rounded-xl border p-4 transition-all ${
                          isRestored
                            ? 'border-[#10B981] bg-[#10B981]/10'
                            : 'border-[#1F2942] bg-[#101626] hover:border-[#00F0FF]/50'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#00F0FF]/15 text-[#00F0FF] font-mono text-[11px] font-bold">
                              {idx + 1}
                            </span>
                            <div>
                              <h3 className="font-bold text-sm text-[#F1F5F9] group-hover:text-[#00F0FF] transition-colors">
                                {cp.name}
                              </h3>
                              <div className="flex items-center gap-1.5 font-mono text-[11px] text-[#64748B] mt-0.5">
                                <Clock className="h-3 w-3" />
                                <span>{dateStr}</span>
                              </div>
                            </div>
                          </div>

                          <button
                            onClick={() => handleRestore(cp)}
                            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                              isRestored
                                ? 'bg-[#10B981] text-[#0A0D14]'
                                : 'bg-[#1F2942] text-[#F1F5F9] hover:bg-[#00F0FF] hover:text-[#0A0D14]'
                            }`}
                          >
                            {isRestored ? (
                              <>
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                <span>Restored!</span>
                              </>
                            ) : (
                              <>
                                <RotateCcw className="h-3.5 w-3.5" />
                                <span>Restore This</span>
                              </>
                            )}
                          </button>
                        </div>

                        <p className="text-xs text-[#94A3B8] mt-2.5 leading-relaxed bg-[#0A0D16] p-2.5 rounded-lg border border-[#1F2942]/60">
                          {cp.change_summary}
                        </p>

                        {/* Snapshot stats */}
                        {snapWalls !== null && snapRooms !== null && (
                          <div className="mt-2.5 flex items-center gap-3 font-mono text-[10px] text-[#64748B]">
                            <span>{snapWalls} Walls</span>
                            <span>•</span>
                            <span>{snapRooms} Rooms</span>
                            <span>•</span>
                            <span>Exact Geometry Preserved</span>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Create Checkpoint Form */}
              <div className="w-full md:w-80 flex flex-col justify-between rounded-xl border border-[#1F2942] bg-[#0E1424] p-5">
                <form onSubmit={handleCreate} className="space-y-4">
                  <div className="flex items-center gap-2 text-sm font-bold text-[#F1F5F9]">
                    <Plus className="h-4 w-4 text-[#00F0FF]" />
                    <span>Create Milestone</span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono text-[#94A3B8] mb-1">
                      Milestone Name *
                    </label>
                    <input
                      type="text"
                      value={newCheckpointName}
                      onChange={(e) => setNewCheckpointName(e.target.value)}
                      placeholder="e.g. Master Bedroom Expansion"
                      className="w-full rounded-lg border border-[#1F2942] bg-[#161F33] px-3 py-2 text-xs text-[#F1F5F9] focus:border-[#00F0FF] focus:outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono text-[#94A3B8] mb-1">
                      Description / Summary
                    </label>
                    <textarea
                      value={newCheckpointSummary}
                      onChange={(e) => setNewCheckpointSummary(e.target.value)}
                      placeholder="e.g. Added partition wall, shifted hallway door, updated parquet floor finish"
                      rows={3}
                      className="w-full rounded-lg border border-[#1F2942] bg-[#161F33] px-3 py-2 text-xs text-[#F1F5F9] focus:border-[#00F0FF] focus:outline-none resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#00F0FF] py-2.5 text-xs font-bold text-[#0A0D14] shadow-md shadow-[#00F0FF]/20 hover:bg-[#00D1DF] transition-all"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Save Milestone Checkpoint</span>
                  </button>
                </form>

                <div className="mt-4 rounded-lg bg-[#070A12] p-3 border border-[#1F2942]/60 text-[11px] text-[#94A3B8] space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-[#00F0FF]">
                    <AlertCircle className="h-3.5 w-3.5" />
                    <span>Deep Architectural Snapshots</span>
                  </div>
                  <p className="text-[10px] text-[#64748B]">
                    Checkpoints capture the full parametric hierarchy: walls, doors, windows, materials, furniture, and roof settings.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            /* Action Undo / Redo Stack Tab */
            <div className="flex-1 overflow-y-auto space-y-2 pr-2 scrollbar-thin">
              <div className="mb-3 text-xs text-[#94A3B8]">
                Fine-grained CAD action stack. The highlighted row is the active state in memory.
              </div>
              {history.map((hModel, idx) => {
                const isActive = historyIndex === idx;
                const hWalls = hModel.floors.reduce((a, f) => a + (f.walls || []).length, 0);
                const hRooms = hModel.floors.reduce((a, f) => a + (f.rooms || []).length, 0);

                return (
                  <div
                    key={idx}
                    className={`flex items-center justify-between rounded-xl border p-3 font-mono text-xs transition-all ${
                      isActive
                        ? 'border-[#00F0FF] bg-[#00F0FF]/10 text-[#F1F5F9]'
                        : 'border-[#1F2942]/80 bg-[#111726]/80 text-[#94A3B8]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`h-2.5 w-2.5 rounded-full ${isActive ? 'bg-[#00F0FF] animate-pulse' : 'bg-[#1F2942]'}`} />
                      <span className="font-bold">Step {idx + 1}</span>
                      <span>•</span>
                      <span>{hModel.name}</span>
                      <span>({hWalls} walls, {hRooms} rooms)</span>
                    </div>

                    {isActive && (
                      <span className="rounded bg-[#00F0FF] px-2 py-0.5 text-[10px] font-bold text-[#0A0D14]">
                        CURRENT STATE
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
