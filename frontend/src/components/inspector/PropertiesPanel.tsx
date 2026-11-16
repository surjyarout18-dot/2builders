import React, { useState, useEffect } from 'react';
import {
  Sliders,
  Trash2,
  Square,
  DoorOpen,
  Maximize2,
  Grid,
  Armchair,
  X,
  Milestone,
  Columns3,
  Home,
  Compass,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useFloorPlanStore } from '../../store/useFloorPlanStore';
import { MaterialPicker } from './MaterialPicker';

interface PropertiesPanelProps {
  onOpenFurnitureCatalog: () => void;
}

export const PropertiesPanel: React.FC<PropertiesPanelProps> = ({ onOpenFurnitureCatalog }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const {
    model,
    activeFloorIndex,
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
    deleteFurniture,
    updateStair,
    deleteStair,
    updateColumn,
    deleteColumn,
    updateRoof,
    updateSite
  } = useFloorPlanStore();

  const floor = model.floors[activeFloorIndex] || model.floors[0] || {
    walls: [],
    doors: [],
    windows: [],
    rooms: [],
    furniture: [],
    stairs: [],
    columns: []
  };

  const totalAreaSqm = (floor.rooms || []).reduce((acc, r) => acc + r.area_sqm, 0);
  const totalAreaSqft = totalAreaSqm * 10.7639;

  const selectedWall = selectedEntity.type === 'wall'
    ? (floor.walls || []).find((w) => w.id === selectedEntity.id)
    : null;

  const selectedRoom = selectedEntity.type === 'room'
    ? (floor.rooms || []).find((r) => r.id === selectedEntity.id)
    : null;

  const selectedDoor = selectedEntity.type === 'door'
    ? (floor.doors || []).find((d) => d.id === selectedEntity.id)
    : null;

  const selectedWindow = selectedEntity.type === 'window'
    ? (floor.windows || []).find((w) => w.id === selectedEntity.id)
    : null;

  const selectedFurniture = selectedEntity.type === 'furniture'
    ? (floor.furniture || []).find((f) => f.id === selectedEntity.id)
    : null;

  const selectedStair = selectedEntity.type === 'stair'
    ? (floor.stairs || []).find((s) => s.id === selectedEntity.id)
    : null;

  const selectedColumn = selectedEntity.type === 'column'
    ? (floor.columns || []).find((c) => c.id === selectedEntity.id)
    : null;

  const roof = model.building.roof || {
    roof_type: 'gable',
    pitch: 22,
    overhang: 0.45,
    thickness: 0.15,
    material: 'zinc_standing_seam',
    visible: false
  };

  const site = model.building.site || {
    plot_width: 20,
    plot_depth: 25,
    setback_front: 5,
    setback_rear: 4,
    setback_sides: 3,
    has_driveway: true,
    has_garden: true,
    has_boundary_wall: true
  };

  // Auto-expand inspector when user selects an architectural element
  useEffect(() => {
    if (selectedEntity.type && isCollapsed) {
      setIsCollapsed(false);
    }
  }, [selectedEntity.type]);

  if (isCollapsed) {
    return (
      <div className="flex h-full w-12 flex-col items-center justify-between border-l border-[#1F2942] bg-[#0E1424]/95 py-3 backdrop-blur-md select-none transition-all duration-300 z-20">
        <div className="flex flex-col items-center gap-3">
          <button
            onClick={() => setIsCollapsed(false)}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#161F33] text-[#00F0FF] hover:bg-[#00F0FF]/20 transition-colors shadow-md"
            title="Expand Properties Inspector (Ctrl+B)"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="h-4 w-px bg-[#1F2942]" />
          <button
            onClick={() => setIsCollapsed(false)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[#94A3B8] hover:bg-[#161F33] hover:text-[#00F0FF] transition-colors"
            title="Inspect Properties"
          >
            <Sliders className="h-4 w-4" />
          </button>
          <button
            onClick={onOpenFurnitureCatalog}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[#94A3B8] hover:bg-[#161F33] hover:text-[#00F0FF] transition-colors"
            title="Open Furniture Catalog"
          >
            <Armchair className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full w-80 flex-col border-l border-[#1F2942] bg-[#111726]/95 backdrop-blur-md select-none overflow-y-auto transition-all duration-300">
      {/* Panel Header */}
      <div className="flex items-center justify-between border-b border-[#1F2942] px-4 py-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-[#F1F5F9]">
          <Sliders className="h-4 w-4 text-[#00F0FF]" />
          <span>Properties Inspector</span>
        </div>
        <div className="flex items-center gap-1">
          {selectedEntity.type && (
            <button
              onClick={() => setSelectedEntity({ type: null, id: null })}
              className="rounded p-1 text-[#94A3B8] hover:bg-[#1F2942] hover:text-[#F1F5F9] transition-colors"
              title="Clear Selection"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={() => setIsCollapsed(true)}
            className="rounded p-1 text-[#94A3B8] hover:bg-[#1F2942] hover:text-[#00F0FF] transition-colors"
            title="Collapse Inspector (Expand Canvas View)"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
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
              <select
                value={selectedWall.wall_type}
                onChange={(e) => updateWall({ ...selectedWall, wall_type: e.target.value as any })}
                className="mt-1.5 w-full rounded-lg border border-[#1F2942] bg-[#0A0D14] px-3 py-1.5 text-xs text-[#F1F5F9] focus:border-[#00F0FF] focus:outline-none"
              >
                <option value="exterior">Exterior Load-Bearing (0.25m)</option>
                <option value="interior">Interior Partition (0.15m)</option>
                <option value="partition">Lightweight Stud (0.10m)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs text-[#94A3B8]">Thickness (meters)</label>
              <input
                type="number"
                step="0.05"
                value={selectedWall.thickness}
                onChange={(e) => updateWall({ ...selectedWall, thickness: parseFloat(e.target.value) || 0.20 })}
                className="mt-1.5 w-full rounded-lg border border-[#1F2942] bg-[#0A0D14] px-3 py-1.5 text-xs text-[#F1F5F9] focus:border-[#00F0FF] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs text-[#94A3B8]">Height (meters)</label>
              <input
                type="number"
                step="0.1"
                value={selectedWall.height}
                onChange={(e) => updateWall({ ...selectedWall, height: parseFloat(e.target.value) || 2.80 })}
                className="mt-1.5 w-full rounded-lg border border-[#1F2942] bg-[#0A0D14] px-3 py-1.5 text-xs text-[#F1F5F9] focus:border-[#00F0FF] focus:outline-none"
              />
            </div>
          </div>
        )}

        {/* STAIR PROPERTIES */}
        {selectedStair && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#A855F7]">
                <Milestone className="h-3.5 w-3.5" />
                Staircase: {selectedStair.id}
              </span>
              <button
                onClick={() => deleteStair(selectedStair.id)}
                className="flex items-center gap-1 rounded bg-[#EF4444]/10 px-2 py-1 text-xs text-[#EF4444] hover:bg-[#EF4444]/20"
              >
                <Trash2 className="h-3 w-3" />
                <span>Delete</span>
              </button>
            </div>

            <div>
              <label className="block text-xs text-[#94A3B8]">Stair Type</label>
              <select
                value={selectedStair.stair_type}
                onChange={(e) => updateStair({ ...selectedStair, stair_type: e.target.value as any })}
                className="mt-1.5 w-full rounded-lg border border-[#1F2942] bg-[#0A0D14] px-3 py-1.5 text-xs text-[#F1F5F9]"
              >
                <option value="straight">Straight Run</option>
                <option value="l_shape">L-Shape Landing</option>
                <option value="u_shape">U-Shape Switchback</option>
              </select>
            </div>

            <div>
              <label className="block text-xs text-[#94A3B8]">Risers Count</label>
              <input
                type="number"
                value={selectedStair.risers_count}
                onChange={(e) => updateStair({ ...selectedStair, risers_count: parseInt(e.target.value) || 14 })}
                className="mt-1.5 w-full rounded-lg border border-[#1F2942] bg-[#0A0D14] px-3 py-1.5 text-xs text-[#F1F5F9]"
              />
            </div>

            <div>
              <label className="block text-xs text-[#94A3B8]">Width (meters)</label>
              <input
                type="number"
                step="0.05"
                value={selectedStair.width}
                onChange={(e) => updateStair({ ...selectedStair, width: parseFloat(e.target.value) || 0.9 })}
                className="mt-1.5 w-full rounded-lg border border-[#1F2942] bg-[#0A0D14] px-3 py-1.5 text-xs text-[#F1F5F9]"
              />
            </div>
          </div>
        )}

        {/* COLUMN PROPERTIES */}
        {selectedColumn && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#10B981]">
                <Columns3 className="h-3.5 w-3.5" />
                Column: {selectedColumn.id}
              </span>
              <button
                onClick={() => deleteColumn(selectedColumn.id)}
                className="flex items-center gap-1 rounded bg-[#EF4444]/10 px-2 py-1 text-xs text-[#EF4444] hover:bg-[#EF4444]/20"
              >
                <Trash2 className="h-3 w-3" />
                <span>Delete</span>
              </button>
            </div>

            <div>
              <label className="block text-xs text-[#94A3B8]">Profile Shape</label>
              <select
                value={selectedColumn.shape}
                onChange={(e) => updateColumn({ ...selectedColumn, shape: e.target.value as any })}
                className="mt-1.5 w-full rounded-lg border border-[#1F2942] bg-[#0A0D14] px-3 py-1.5 text-xs text-[#F1F5F9]"
              >
                <option value="square">Square Rectangular</option>
                <option value="round">Circular Round</option>
              </select>
            </div>

            <div>
              <label className="block text-xs text-[#94A3B8]">Size / Diameter (meters)</label>
              <input
                type="number"
                step="0.05"
                value={selectedColumn.radius_or_size}
                onChange={(e) => updateColumn({ ...selectedColumn, radius_or_size: parseFloat(e.target.value) || 0.35 })}
                className="mt-1.5 w-full rounded-lg border border-[#1F2942] bg-[#0A0D14] px-3 py-1.5 text-xs text-[#F1F5F9]"
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
                {selectedRoom.name}
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
              <label className="block text-xs text-[#94A3B8]">Space Name</label>
              <input
                type="text"
                value={selectedRoom.name}
                onChange={(e) => updateRoom({ ...selectedRoom, name: e.target.value })}
                className="mt-1.5 w-full rounded-lg border border-[#1F2942] bg-[#0A0D14] px-3 py-1.5 text-xs text-[#F1F5F9] focus:border-[#00F0FF] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs text-[#94A3B8]">Room Classification</label>
              <select
                value={selectedRoom.room_type}
                onChange={(e) => updateRoom({ ...selectedRoom, room_type: e.target.value })}
                className="mt-1.5 w-full rounded-lg border border-[#1F2942] bg-[#0A0D14] px-3 py-1.5 text-xs text-[#F1F5F9]"
              >
                <option value="living_room">Living Room</option>
                <option value="bedroom">Bedroom</option>
                <option value="kitchen">Kitchen</option>
                <option value="bathroom">Bathroom</option>
                <option value="dining">Dining Room</option>
                <option value="office">Office / Study</option>
                <option value="hallway">Hallway / Circulation</option>
              </select>
            </div>

            <MaterialPicker
              type="floor"
              currentValue={selectedRoom.floor_material}
              onSelect={(matId) => updateRoom({ ...selectedRoom, floor_material: matId })}
            />
          </div>
        )}

        {/* DOOR PROPERTIES */}
        {selectedDoor && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#00F0FF]">
                <DoorOpen className="h-3.5 w-3.5" />
                Door: {selectedDoor.id}
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
              <label className="block text-xs text-[#94A3B8]">Door Width (meters)</label>
              <input
                type="number"
                step="0.05"
                value={selectedDoor.width}
                onChange={(e) => updateDoor({ ...selectedDoor, width: parseFloat(e.target.value) || 0.9 })}
                className="mt-1.5 w-full rounded-lg border border-[#1F2942] bg-[#0A0D14] px-3 py-1.5 text-xs text-[#F1F5F9] focus:border-[#00F0FF] focus:outline-none"
              />
            </div>
          </div>
        )}

        {/* WINDOW PROPERTIES */}
        {selectedWindow && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#00F0FF]">
                <Maximize2 className="h-3.5 w-3.5" />
                Window: {selectedWindow.id}
              </span>
              <button
                onClick={() => deleteWindow(selectedWindow.id)}
                className="flex items-center gap-1 rounded bg-[#EF4444]/10 px-2 py-1 text-xs text-[#EF4444] hover:bg-[#EF4444]/20"
              >
                <Trash2 className="h-3 w-3" />
                <span>Delete</span>
              </button>
            </div>

            <div>
              <label className="block text-xs text-[#94A3B8]">Window Width (meters)</label>
              <input
                type="number"
                step="0.1"
                value={selectedWindow.width}
                onChange={(e) => updateWindow({ ...selectedWindow, width: parseFloat(e.target.value) || 1.4 })}
                className="mt-1.5 w-full rounded-lg border border-[#1F2942] bg-[#0A0D14] px-3 py-1.5 text-xs text-[#F1F5F9] focus:border-[#00F0FF] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs text-[#94A3B8]">Sill Height (meters)</label>
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

        {/* DEFAULT VIEW: PROJECT, ROOF & SITE INSPECTOR */}
        {!selectedWall && !selectedRoom && !selectedDoor && !selectedWindow && !selectedFurniture && !selectedStair && !selectedColumn && (
          <div className="space-y-4">
            <div className="rounded-xl border border-[#1F2942] bg-[#0A0D14] p-4">
              <div className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wider">Project Summary</div>
              <h3 className="mt-1 text-base font-bold text-[#F1F5F9]">{model.name}</h3>

              <div className="mt-3 grid grid-cols-2 gap-3 border-t border-[#1F2942] pt-3">
                <div>
                  <div className="text-[10px] text-[#94A3B8] uppercase">Living Area</div>
                  <div className="text-base font-bold font-mono text-[#00F0FF]">{totalAreaSqm.toFixed(1)} m²</div>
                  <div className="text-[10px] text-[#94A3B8]">{totalAreaSqft.toFixed(0)} sq ft</div>
                </div>
                <div>
                  <div className="text-[10px] text-[#94A3B8] uppercase">Levels</div>
                  <div className="text-base font-bold font-mono text-[#F1F5F9]">{model.floors.length} Floors</div>
                </div>
              </div>
            </div>

            {/* Parametric 3D Roof Controls */}
            <div className="rounded-xl border border-[#1F2942] bg-[#0A0D14] p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#00F0FF]">
                  <Home className="h-3.5 w-3.5" />
                  3D Roof System
                </span>
                <label className="flex items-center gap-1 text-[11px] text-[#94A3B8] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={roof.visible}
                    onChange={(e) => updateRoof({ visible: e.target.checked })}
                    className="rounded border-[#1F2942] text-[#00F0FF]"
                  />
                  <span>Show</span>
                </label>
              </div>

              <div>
                <label className="block text-[11px] text-[#94A3B8]">Roof Geometry</label>
                <select
                  value={roof.roof_type}
                  onChange={(e) => updateRoof({ roof_type: e.target.value as any })}
                  className="mt-1 w-full rounded-lg border border-[#1F2942] bg-[#161F33] px-2.5 py-1.5 text-xs text-[#F1F5F9]"
                >
                  <option value="gable">Gable Pitch</option>
                  <option value="hip">Hip Roof</option>
                  <option value="shed">Shed (Mono-pitch)</option>
                  <option value="flat">Flat with Parapet</option>
                </select>
              </div>

              <div>
                <div className="flex justify-between text-[11px] text-[#94A3B8]">
                  <span>Pitch Slope</span>
                  <span className="font-mono text-[#00F0FF]">{roof.pitch}°</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={45}
                  value={roof.pitch}
                  onChange={(e) => updateRoof({ pitch: Number(e.target.value) })}
                  className="w-full accent-[#00F0FF]"
                />
              </div>

              <div>
                <label className="block text-[11px] text-[#94A3B8]">Roof Material</label>
                <select
                  value={roof.material}
                  onChange={(e) => updateRoof({ material: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-[#1F2942] bg-[#161F33] px-2.5 py-1.5 text-xs text-[#F1F5F9]"
                >
                  <option value="zinc_standing_seam">Standing Seam Zinc</option>
                  <option value="terracotta_tile">Terracotta Clay Tile</option>
                  <option value="slate_shingle">Slate Shingle</option>
                </select>
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
