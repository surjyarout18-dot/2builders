import React from 'react';
import { useProjectStore } from '../store/useProjectStore';
import { Trash2, Plus, Sliders, Box, Layers, Building } from 'lucide-react';
import { WallBuilder } from '../geometry/WallBuilder';
import { RoomDetector } from '../geometry/RoomDetector';

export const PropertiesPanel: React.FC = () => {
  const project = useProjectStore((s) => s.project);
  const activeFloorId = useProjectStore((s) => s.activeFloorId);
  const selectedEntity = useProjectStore((s) => s.selectedEntity);
  const setSelectedEntity = useProjectStore((s) => s.setSelectedEntity);
  const updateWall = useProjectStore((s) => s.updateWall);
  const deleteWall = useProjectStore((s) => s.deleteWall);
  const addOpening = useProjectStore((s) => s.addOpening);
  const updateOpening = useProjectStore((s) => s.updateOpening);
  const deleteOpening = useProjectStore((s) => s.deleteOpening);
  const updateRoom = useProjectStore((s) => s.updateRoom);
  const deleteRoom = useProjectStore((s) => s.deleteRoom);

  const activeFloor = project?.floors.find((f) => f.id === activeFloorId) || project?.floors[0];

  // Find selected wall if any
  const selectedWall = selectedEntity?.type === 'wall'
    ? activeFloor?.walls.find((w) => w.id === selectedEntity.id)
    : null;

  // Find selected opening if any
  let selectedOpening = null;
  let hostWall = null;
  if (selectedEntity?.type === 'opening' && activeFloor) {
    for (const w of activeFloor.walls) {
      const op = w.openings?.find((o) => o.id === selectedEntity.id);
      if (op) {
        selectedOpening = op;
        hostWall = w;
        break;
      }
    }
  }

  // Find selected room if any
  const selectedRoom = selectedEntity?.type === 'room'
    ? activeFloor?.rooms.find((r) => r.id === selectedEntity.id)
    : null;

  return (
    <div className="w-80 h-full bg-cad-panel border-l border-cad-border flex flex-col z-10 text-xs overflow-y-auto">
      {/* Panel Header */}
      <div className="p-3 border-b border-cad-border flex items-center justify-between font-semibold text-slate-200">
        <div className="flex items-center gap-2">
          <Sliders size={16} className="text-cad-accent" />
          <span>Properties Inspector</span>
        </div>
        {selectedEntity && (
          <button
            onClick={() => setSelectedEntity(null)}
            className="text-slate-400 hover:text-slate-200 text-[11px]"
          >
            Clear
          </button>
        )}
      </div>

      <div className="p-4 space-y-5 flex-1">
        {/* Case 1: Wall Selected */}
        {selectedWall && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-100 flex items-center gap-1.5">
                <Box size={14} className="text-cad-accent" /> Wall Entity
              </span>
              <button
                onClick={() => deleteWall(selectedWall.id)}
                className="text-red-400 hover:text-red-300 p-1 rounded hover:bg-red-950/40"
                title="Delete Wall"
              >
                <Trash2 size={14} />
              </button>
            </div>

            {/* Wall Length */}
            {(() => {
              const len = Math.hypot(
                selectedWall.end[0] - selectedWall.start[0],
                selectedWall.end[1] - selectedWall.start[1]
              );
              return (
                <div className="bg-cad-surface p-2.5 rounded border border-cad-border space-y-1">
                  <div className="flex justify-between text-slate-400">
                    <span>Length</span>
                    <span className="font-mono text-slate-100 font-bold">{len.toFixed(2)} m</span>
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono">
                    Start: [{selectedWall.start[0].toFixed(2)}, {selectedWall.start[1].toFixed(2)}] → End: [{selectedWall.end[0].toFixed(2)}, {selectedWall.end[1].toFixed(2)}]
                  </div>
                </div>
              );
            })()}

            {/* Thickness */}
            <div>
              <label className="block text-slate-400 mb-1">Thickness (m)</label>
              <select
                value={selectedWall.thickness}
                onChange={(e) => updateWall(selectedWall.id, { thickness: parseFloat(e.target.value) })}
                className="w-full bg-cad-surface border border-cad-border rounded p-2 text-slate-100 font-mono outline-none focus:border-cad-accent"
              >
                <option value={0.10}>0.10 m (Thin Partition)</option>
                <option value={0.15}>0.15 m (Internal Wall)</option>
                <option value={0.20}>0.20 m (Standard External)</option>
                <option value={0.25}>0.25 m (Heavy External)</option>
                <option value={0.30}>0.30 m (Structural Core)</option>
              </select>
            </div>

            {/* Height */}
            <div>
              <label className="block text-slate-400 mb-1">Height (m)</label>
              <input
                type="number"
                step="0.1"
                min="1.0"
                max="10.0"
                value={selectedWall.height}
                onChange={(e) => updateWall(selectedWall.id, { height: parseFloat(e.target.value) || 3.0 })}
                className="w-full bg-cad-surface border border-cad-border rounded p-2 text-slate-100 font-mono outline-none focus:border-cad-accent"
              />
            </div>

            {/* Type */}
            <div>
              <label className="block text-slate-400 mb-1">Wall Classification</label>
              <select
                value={selectedWall.type}
                onChange={(e) => updateWall(selectedWall.id, { type: e.target.value as any })}
                className="w-full bg-cad-surface border border-cad-border rounded p-2 text-slate-100 outline-none focus:border-cad-accent"
              >
                <option value="external">External Structural Wall</option>
                <option value="internal">Internal Load-Bearing Wall</option>
                <option value="partition">Interior Partition</option>
              </select>
            </div>

            {/* Attached Openings */}
            <div className="pt-2 border-t border-cad-border">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-slate-300">Openings ({selectedWall.openings?.length || 0})</span>
                <div className="flex gap-1">
                  <button
                    onClick={() => addOpening(selectedWall.id, { type: 'door', offset: 0.5, width: 0.9, height: 2.1, sillHeight: 0 })}
                    className="px-2 py-1 bg-cad-surface hover:bg-cad-border rounded text-[11px] text-cad-accent"
                  >
                    + Door
                  </button>
                  <button
                    onClick={() => addOpening(selectedWall.id, { type: 'window', offset: 1.5, width: 1.2, height: 1.2, sillHeight: 0.9 })}
                    className="px-2 py-1 bg-cad-surface hover:bg-cad-border rounded text-[11px] text-cyan-400"
                  >
                    + Window
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                {(selectedWall.openings || []).map((op) => (
                  <div
                    key={op.id}
                    onClick={() => setSelectedEntity({ type: 'opening', id: op.id })}
                    className="p-2 bg-cad-surface hover:border-cad-accent border border-cad-border rounded cursor-pointer flex justify-between items-center"
                  >
                    <div>
                      <span className="font-semibold uppercase text-slate-200">{op.type}</span>
                      <span className="text-slate-400 ml-2 font-mono">{op.width}m × {op.height}m</span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono">@{op.offset}m</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Case 2: Opening Selected */}
        {selectedOpening && hostWall && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-100 flex items-center gap-1.5">
                <Box size={14} className="text-cad-accent" /> {selectedOpening.type.toUpperCase()} Entity
              </span>
              <button
                onClick={() => deleteOpening(selectedOpening.id)}
                className="text-red-400 hover:text-red-300 p-1 rounded hover:bg-red-950/40"
                title="Delete Opening"
              >
                <Trash2 size={14} />
              </button>
            </div>

            {/* Type */}
            <div>
              <label className="block text-slate-400 mb-1">Aperture Type</label>
              <select
                value={selectedOpening.type}
                onChange={(e) => updateOpening(selectedOpening.id, { type: e.target.value as any })}
                className="w-full bg-cad-surface border border-cad-border rounded p-2 text-slate-100 outline-none focus:border-cad-accent"
              >
                <option value="door">Door</option>
                <option value="window">Window</option>
              </select>
            </div>

            {/* Offset */}
            <div>
              <label className="block text-slate-400 mb-1">Offset along wall (m)</label>
              <input
                type="number"
                step="0.05"
                min="0"
                value={selectedOpening.offset}
                onChange={(e) => updateOpening(selectedOpening.id, { offset: parseFloat(e.target.value) || 0 })}
                className="w-full bg-cad-surface border border-cad-border rounded p-2 text-slate-100 font-mono outline-none focus:border-cad-accent"
              />
            </div>

            {/* Width */}
            <div>
              <label className="block text-slate-400 mb-1">Opening Width (m)</label>
              <input
                type="number"
                step="0.05"
                min="0.4"
                value={selectedOpening.width}
                onChange={(e) => updateOpening(selectedOpening.id, { width: parseFloat(e.target.value) || 0.9 })}
                className="w-full bg-cad-surface border border-cad-border rounded p-2 text-slate-100 font-mono outline-none focus:border-cad-accent"
              />
            </div>

            {/* Height */}
            <div>
              <label className="block text-slate-400 mb-1">Opening Height (m)</label>
              <input
                type="number"
                step="0.05"
                min="0.5"
                value={selectedOpening.height}
                onChange={(e) => updateOpening(selectedOpening.id, { height: parseFloat(e.target.value) || 2.1 })}
                className="w-full bg-cad-surface border border-cad-border rounded p-2 text-slate-100 font-mono outline-none focus:border-cad-accent"
              />
            </div>

            {/* Sill Height */}
            <div>
              <label className="block text-slate-400 mb-1">Sill Elevation (m)</label>
              <input
                type="number"
                step="0.05"
                min="0"
                value={selectedOpening.sillHeight}
                onChange={(e) => updateOpening(selectedOpening.id, { sillHeight: parseFloat(e.target.value) || 0 })}
                className="w-full bg-cad-surface border border-cad-border rounded p-2 text-slate-100 font-mono outline-none focus:border-cad-accent"
              />
            </div>
          </div>
        )}

        {/* Case 3: Room Selected */}
        {selectedRoom && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-100 flex items-center gap-1.5">
                <Layers size={14} className="text-cad-accent" /> Room Boundary
              </span>
              <button
                onClick={() => deleteRoom(selectedRoom.id)}
                className="text-red-400 hover:text-red-300 p-1 rounded hover:bg-red-950/40"
                title="Delete Room"
              >
                <Trash2 size={14} />
              </button>
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Room Name</label>
              <input
                type="text"
                value={selectedRoom.name}
                onChange={(e) => updateRoom(selectedRoom.id, { name: e.target.value })}
                className="w-full bg-cad-surface border border-cad-border rounded p-2 text-slate-100 outline-none focus:border-cad-accent"
              />
            </div>

            <div className="bg-cad-surface p-3 rounded border border-cad-border space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">Area</span>
                <span className="font-mono text-cad-accent font-bold">{selectedRoom.area.toFixed(2)} m²</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Imperial</span>
                <span className="font-mono text-slate-300">{(selectedRoom.area * 10.7639).toFixed(1)} sq ft</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Vertices</span>
                <span className="font-mono text-slate-300">{selectedRoom.boundary?.length || 0} pts</span>
              </div>
            </div>
          </div>
        )}

        {/* Case 4: Default Building Overview */}
        {!selectedWall && !selectedOpening && !selectedRoom && (
          <div className="space-y-4">
            <span className="font-bold text-slate-100 flex items-center gap-1.5">
              <Building size={14} className="text-cad-accent" /> Building Overview
            </span>

            <div className="space-y-2">
              <div className="bg-cad-surface p-2.5 rounded border border-cad-border flex justify-between">
                <span className="text-slate-400">Active Floor</span>
                <span className="font-bold text-slate-200">{activeFloor?.name || 'Floor 1'}</span>
              </div>
              <div className="bg-cad-surface p-2.5 rounded border border-cad-border flex justify-between">
                <span className="text-slate-400">Total Walls</span>
                <span className="font-mono text-slate-200">{activeFloor?.walls.length || 0}</span>
              </div>
              <div className="bg-cad-surface p-2.5 rounded border border-cad-border flex justify-between">
                <span className="text-slate-400">Total Rooms</span>
                <span className="font-mono text-slate-200">{activeFloor?.rooms.length || 0}</span>
              </div>
              <div className="bg-cad-surface p-2.5 rounded border border-cad-border flex justify-between">
                <span className="text-slate-400">Floor Elevation</span>
                <span className="font-mono text-slate-200">{activeFloor?.elevation.toFixed(2)} m</span>
              </div>
              <div className="bg-cad-surface p-2.5 rounded border border-cad-border flex justify-between">
                <span className="text-slate-400">Wall Height</span>
                <span className="font-mono text-slate-200">{activeFloor?.wallHeight.toFixed(2)} m</span>
              </div>
            </div>

            <div className="text-[11px] text-slate-500 leading-relaxed pt-2 border-t border-cad-border">
              Click any wall, door, window, or room in the 2D plan or 3D viewport to inspect and modify dimensions in real-time.
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

