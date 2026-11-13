import React from 'react';
import {
  Sliders,
  Trash2,
  Square,
  DoorOpen,
  Maximize2,
  Grid,
  Armchair,
  X
} from 'lucide-react';
import { useFloorPlanStore } from '../../store/useFloorPlanStore';
import { MaterialPicker } from './MaterialPicker';

interface PropertiesPanelProps {
  onOpenFurnitureCatalog: () => void;
}

export const PropertiesPanel: React.FC<PropertiesPanelProps> = ({ onOpenFurnitureCatalog }) => {
  const {
    model,
    selectedEntity,
    setSelectedEntity,
    updateWall,
    deleteWall,
    updateDoor,
    deleteDoor,
    updateWindow,
    deleteWindow,
    updateRoom,
    deleteRoom,
    updateFurniture,
    deleteFurniture
  } = useFloorPlanStore();

  const floor = model.floors[0] || { walls: [], doors: [], windows: [], rooms: [], furniture: [] };

  // Calculate project totals
  const totalAreaSqm = floor.rooms.reduce((acc, r) => acc + r.area_sqm, 0);
  const totalAreaSqft = totalAreaSqm * 10.7639;

  // Selected Wall
  const selectedWall = selectedEntity.type === 'wall'
    ? floor.walls.find((w) => w.id === selectedEntity.id)
    : null;

  // Selected Room
  const selectedRoom = selectedEntity.type === 'room'
    ? floor.rooms.find((r) => r.id === selectedEntity.id)
    : null;

  // Selected Door
  const selectedDoor = selectedEntity.type === 'door'
    ? floor.doors.find((d) => d.id === selectedEntity.id)
    : null;

  // Selected Window
  const selectedWindow = selectedEntity.type === 'window'
    ? floor.windows.find((w) => w.id === selectedEntity.id)
    : null;

  // Selected Furniture
  const selectedFurniture = selectedEntity.type === 'furniture'
    ? floor.furniture.find((f) => f.id === selectedEntity.id)
    : null;

  return (
    <div className="flex h-full w-80 flex-col border-l border-[#1F2942] bg-[#111726]/95 backdrop-blur-md select-none overflow-y-auto">
      {/* Panel Header */}
      <div className="flex items-center justify-between border-b border-[#1F2942] px-4 py-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-[#F1F5F9]">
          <Sliders className="h-4 w-4 text-[#00F0FF]" />
          <span>Properties Inspector</span>
        </div>
        {selectedEntity.type && (
          <button
            onClick={() => setSelectedEntity({ type: null, id: null })}
            className="rounded p-1 text-[#94A3B8] hover:bg-[#1F2942] hover:text-[#F1F5F9]"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="p-4 space-y-5">
        {/* WALL PROPERTIES */}
        {selectedWall && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#00F0FF]">
                <Square className="h-3.5 w-3.5" />
                Wall: {selectedWall.id}
              </span>
              <button
                onClick={() => deleteWall(selectedWall.id)}
                className="flex items-center gap-1 rounded bg-[#EF4444]/10 px-2 py-1 text-xs text-[#EF4444] hover:bg-[#EF4444]/20"
              >
                <Trash2 className="h-3 w-3" />
                <span>Delete</span>
              </button>
            </div>

            <div>
              <label className="block text-xs text-[#94A3B8]">Wall Type</label>
              <div className="mt-1.5 grid grid-cols-2 gap-2">
                {(['exterior', 'interior'] as const).map((wt) => (
                  <button
                    key={wt}
                    onClick={() => updateWall({ ...selectedWall, wall_type: wt })}
                    className={`rounded-lg border py-1.5 text-xs font-medium capitalize ${
                      selectedWall.wall_type === wt
                        ? 'border-[#00F0FF] bg-[#00F0FF]/10 text-[#00F0FF]'
                        : 'border-[#1F2942] bg-[#0A0D14] text-[#94A3B8]'
                    }`}
                  >
                    {wt}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs text-[#94A3B8]">Thickness</label>
              <select
                value={selectedWall.thickness}
                onChange={(e) => updateWall({ ...selectedWall, thickness: parseFloat(e.target.value) })}
                className="mt-1.5 w-full rounded-lg border border-[#1F2942] bg-[#0A0D14] px-3 py-1.5 text-xs text-[#F1F5F9] focus:border-[#00F0FF] focus:outline-none"
              >
                <option value={0.15}>0.15m (150mm Interior Partition)</option>
                <option value={0.20}>0.20m (200mm Standard Wall)</option>
                <option value={0.25}>0.25m (250mm Exterior Masonry)</option>
                <option value={0.30}>0.30m (300mm Insulated Exterior)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs text-[#94A3B8]">Wall Height (m)</label>
              <input
                type="number"
                step="0.1"
                value={selectedWall.height}
                onChange={(e) => updateWall({ ...selectedWall, height: parseFloat(e.target.value) || 2.8 })}
                className="mt-1.5 w-full rounded-lg border border-[#1F2942] bg-[#0A0D14] px-3 py-1.5 text-xs text-[#F1F5F9] focus:border-[#00F0FF] focus:outline-none"
              />
            </div>
          </div>
        )}

        {/* ROOM PROPERTIES */}
        {selectedRoom && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#00F0FF]">
                <Grid className="h-3.5 w-3.5" />
                Room Space
              </span>
              <button
                onClick={() => deleteRoom(selectedRoom.id)}
                className="flex items-center gap-1 rounded bg-[#EF4444]/10 px-2 py-1 text-xs text-[#EF4444] hover:bg-[#EF4444]/20"
              >
                <Trash2 className="h-3 w-3" />
                <span>Delete</span>
              </button>
            </div>

            <div>
              <label className="block text-xs text-[#94A3B8]">Room Name</label>
              <input
                type="text"
                value={selectedRoom.name}
                onChange={(e) => updateRoom({ ...selectedRoom, name: e.target.value })}
                className="mt-1.5 w-full rounded-lg border border-[#1F2942] bg-[#0A0D14] px-3 py-1.5 text-xs text-[#F1F5F9] focus:border-[#00F0FF] focus:outline-none"
              />
            </div>

            <div className="rounded-lg border border-[#1F2942] bg-[#0A0D14] p-3">
              <div className="flex justify-between text-xs text-[#94A3B8]">
                <span>Calculated Floor Area:</span>
                <span className="font-mono font-semibold text-[#00F0FF]">{selectedRoom.area_sqm} m²</span>
              </div>
              <div className="mt-1 flex justify-between text-xs text-[#94A3B8]">
                <span>Imperial Equivalent:</span>
                <span className="font-mono text-[#F1F5F9]">{selectedRoom.area_sqft} sq ft</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#94A3B8] mb-2">PBR Floor Finish</label>
              <MaterialPicker
                type="floor"
                currentValue={selectedRoom.floor_material}
                onSelect={(val) => updateRoom({ ...selectedRoom, floor_material: val })}
              />
            </div>
          </div>
        )}

        {/* DOOR PROPERTIES */}
        {selectedDoor && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#F59E0B]">
                <DoorOpen className="h-3.5 w-3.5" />
                Door Opening
              </span>
              <button
                onClick={() => deleteDoor(selectedDoor.id)}
                className="flex items-center gap-1 rounded bg-[#EF4444]/10 px-2 py-1 text-xs text-[#EF4444] hover:bg-[#EF4444]/20"
              >
                <Trash2 className="h-3 w-3" />
                <span>Delete</span>
              </button>
            </div>

            <div>
              <label className="block text-xs text-[#94A3B8]">Clear Width (m)</label>
              <input
                type="number"
                step="0.05"
                value={selectedDoor.width}
                onChange={(e) => updateDoor({ ...selectedDoor, width: parseFloat(e.target.value) || 0.9 })}
                className="mt-1.5 w-full rounded-lg border border-[#1F2942] bg-[#0A0D14] px-3 py-1.5 text-xs text-[#F1F5F9] focus:border-[#00F0FF] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs text-[#94A3B8]">Door Height (m)</label>
              <input
                type="number"
                step="0.05"
                value={selectedDoor.height}
                onChange={(e) => updateDoor({ ...selectedDoor, height: parseFloat(e.target.value) || 2.1 })}
                className="mt-1.5 w-full rounded-lg border border-[#1F2942] bg-[#0A0D14] px-3 py-1.5 text-xs text-[#F1F5F9] focus:border-[#00F0FF] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs text-[#94A3B8]">Swing Direction</label>
              <div className="mt-1.5 grid grid-cols-2 gap-2">
                {(['left', 'right'] as const).map((dir) => (
                  <button
                    key={dir}
                    onClick={() => updateDoor({ ...selectedDoor, swing_direction: dir })}
                    className={`rounded-lg border py-1.5 text-xs font-medium capitalize ${
                      selectedDoor.swing_direction === dir
                        ? 'border-[#00F0FF] bg-[#00F0FF]/10 text-[#00F0FF]'
                        : 'border-[#1F2942] bg-[#0A0D14] text-[#94A3B8]'
                    }`}
                  >
                    {dir} Swing
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* WINDOW PROPERTIES */}
        {selectedWindow && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#10B981]">
                <Maximize2 className="h-3.5 w-3.5" />
                Window
              </span>
              <button
                onClick={() => deleteWindow(selectedWindow.id)}
                className="flex items-center gap-1 rounded bg-[#EF4444]/10 px-2 py-1 text-xs text-[#EF4444] hover:bg-[#EF4444]/20"
              >
                <Trash2 className="h-3 w-3" />
                <span>Delete</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-[#94A3B8]">Width (m)</label>
                <input
                  type="number"
                  step="0.1"
                  value={selectedWindow.width}
                  onChange={(e) => updateWindow({ ...selectedWindow, width: parseFloat(e.target.value) || 1.4 })}
                  className="mt-1.5 w-full rounded-lg border border-[#1F2942] bg-[#0A0D14] px-3 py-1.5 text-xs text-[#F1F5F9] focus:border-[#00F0FF] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-[#94A3B8]">Height (m)</label>
                <input
                  type="number"
                  step="0.1"
                  value={selectedWindow.height}
                  onChange={(e) => updateWindow({ ...selectedWindow, height: parseFloat(e.target.value) || 1.4 })}
                  className="mt-1.5 w-full rounded-lg border border-[#1F2942] bg-[#0A0D14] px-3 py-1.5 text-xs text-[#F1F5F9] focus:border-[#00F0FF] focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-[#94A3B8]">Sill Height from Floor (m)</label>
              <input
                type="number"
                step="0.1"
                value={selectedWindow.sill_height}
                onChange={(e) => updateWindow({ ...selectedWindow, sill_height: parseFloat(e.target.value) || 0.9 })}
                className="mt-1.5 w-full rounded-lg border border-[#1F2942] bg-[#0A0D14] px-3 py-1.5 text-xs text-[#F1F5F9] focus:border-[#00F0FF] focus:outline-none"
              />
            </div>
          </div>
        )}

        {/* FURNITURE PROPERTIES */}
        {selectedFurniture && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#00F0FF]">
                <Armchair className="h-3.5 w-3.5" />
                {selectedFurniture.name}
              </span>
              <button
                onClick={() => deleteFurniture(selectedFurniture.id)}
                className="flex items-center gap-1 rounded bg-[#EF4444]/10 px-2 py-1 text-xs text-[#EF4444] hover:bg-[#EF4444]/20"
              >
                <Trash2 className="h-3 w-3" />
                <span>Delete</span>
              </button>
            </div>

            <div>
              <label className="block text-xs text-[#94A3B8]">Rotation (degrees)</label>
              <input
                type="range"
                min="0"
                max="360"
                step="15"
                value={Math.round((selectedFurniture.rotation_y * 180) / Math.PI) % 360}
                onChange={(e) => updateFurniture({
                  ...selectedFurniture,
                  rotation_y: (parseFloat(e.target.value) * Math.PI) / 180
                })}
                className="mt-2 w-full accent-[#00F0FF]"
              />
              <div className="mt-1 text-right font-mono text-xs text-[#00F0FF]">
                {Math.round((selectedFurniture.rotation_y * 180) / Math.PI) % 360}°
              </div>
            </div>
          </div>
        )}

        {/* PROJECT OVERVIEW (DEFAULT WHEN NOTHING SELECTED) */}
        {!selectedWall && !selectedRoom && !selectedDoor && !selectedWindow && !selectedFurniture && (
          <div className="space-y-4">
            <div className="rounded-xl border border-[#1F2942] bg-[#0A0D14] p-4">
              <div className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wider">Project Summary</div>
              <h3 className="mt-1 text-base font-bold text-[#F1F5F9]">{model.name}</h3>

              <div className="mt-4 grid grid-cols-2 gap-3 border-t border-[#1F2942] pt-3">
                <div>
                  <div className="text-[10px] text-[#94A3B8] uppercase">Living Area</div>
                  <div className="text-base font-bold font-mono text-[#00F0FF]">{totalAreaSqm.toFixed(1)} m²</div>
                  <div className="text-[10px] text-[#94A3B8]">{totalAreaSqft.toFixed(0)} sq ft</div>
                </div>
                <div>
                  <div className="text-[10px] text-[#94A3B8] uppercase">Total Rooms</div>
                  <div className="text-base font-bold font-mono text-[#F1F5F9]">{floor.rooms.length}</div>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2 border-t border-[#1F2942] pt-3 text-center">
                <div className="rounded bg-[#111726] p-1.5">
                  <div className="text-[9px] text-[#94A3B8]">WALLS</div>
                  <div className="text-xs font-bold text-[#F1F5F9]">{floor.walls.length}</div>
                </div>
                <div className="rounded bg-[#111726] p-1.5">
                  <div className="text-[9px] text-[#94A3B8]">DOORS</div>
                  <div className="text-xs font-bold text-[#F1F5F9]">{floor.doors.length}</div>
                </div>
                <div className="rounded bg-[#111726] p-1.5">
                  <div className="text-[9px] text-[#94A3B8]">WINDOWS</div>
                  <div className="text-xs font-bold text-[#F1F5F9]">{floor.windows.length}</div>
                </div>
              </div>
            </div>

            {/* Quick action buttons */}
            <button
              onClick={onOpenFurnitureCatalog}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#00F0FF] py-2.5 text-xs font-bold text-[#0A0D14] shadow-lg shadow-[#00F0FF]/20 hover:bg-[#00D1DF] transition-all"
            >
              <Armchair className="h-4 w-4" />
              <span>Browse Furniture Assets</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
