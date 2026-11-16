import { create } from 'zustand';
import {
  ArchitecturalModel,
  Floor,
  Wall,
  Door,
  Window,
  Stair,
  Column,
  Roof,
  Site,
  Room,
  FurnitureItem,
  ViewMode,
  CADTool,
  SelectedEntity,
  UnitSystem,
  VersionCheckpoint,
  PointXZ
} from '../types/architectural';

const INITIAL_MODEL: ArchitecturalModel = {
  schema_version: "1.0",
  project_id: "demo_villa",
  name: "Contemporary 2-Bedroom Villa",
  units: "meters",
  unit_system: "metric",
  building: {
    total_floors: 1,
    default_height: 2.80,
    units: "meters",
    roof: {
      roof_type: 'gable',
      pitch: 22,
      overhang: 0.45,
      thickness: 0.15,
      material: 'zinc_standing_seam',
      visible: false
    },
    site: {
      plot_width: 22,
      plot_depth: 26,
      setback_front: 5.0,
      setback_rear: 4.0,
      setback_sides: 3.0,
      has_driveway: true,
      has_garden: true,
      has_boundary_wall: true
    }
  },
  calibration: {
    pixel_distance: 100,
    real_meters: 2.5,
    meters_per_pixel: 0.025,
    is_calibrated: true
  },
  checkpoints: [
    {
      id: "cp_initial",
      name: "Initial Conception",
      timestamp: Date.now() - 3600000,
      change_summary: "Baseline 2-Bedroom Villa layout with furnished master & open living room."
    }
  ],
  floors: [
    {
      id: "floor_0",
      name: "Ground Floor",
      level: 0,
      elevation: 0.0,
      height: 2.80,
      walls: [
        // Exterior Boundary (10m x 8m)
        { id: "w_ext_top", floor_id: "floor_0", start: { x: 0, z: 0 }, end: { x: 10, z: 0 }, thickness: 0.25, height: 2.80, wall_type: "exterior" },
        { id: "w_ext_right", floor_id: "floor_0", start: { x: 10, z: 0 }, end: { x: 10, z: 8 }, thickness: 0.25, height: 2.80, wall_type: "exterior" },
        { id: "w_ext_bottom", floor_id: "floor_0", start: { x: 10, z: 8 }, end: { x: 0, z: 8 }, thickness: 0.25, height: 2.80, wall_type: "exterior" },
        { id: "w_ext_left", floor_id: "floor_0", start: { x: 0, z: 8 }, end: { x: 0, z: 0 }, thickness: 0.25, height: 2.80, wall_type: "exterior" },
        // Interior Partitions
        { id: "w_int_v1", floor_id: "floor_0", start: { x: 5.5, z: 0 }, end: { x: 5.5, z: 8 }, thickness: 0.15, height: 2.80, wall_type: "interior" },
        { id: "w_int_h1", floor_id: "floor_0", start: { x: 5.5, z: 4 }, end: { x: 10, z: 4 }, thickness: 0.15, height: 2.80, wall_type: "interior" },
        { id: "w_int_bath", floor_id: "floor_0", start: { x: 0, z: 5.2 }, end: { x: 3.2, z: 5.2 }, thickness: 0.15, height: 2.80, wall_type: "interior" },
      ],
      doors: [
        { id: "door_main", floor_id: "floor_0", wall_id: "w_ext_bottom", position: { x: 2.5, z: 8.0 }, width: 1.0, height: 2.10, swing_direction: "left", door_type: "single" },
        { id: "door_master", floor_id: "floor_0", wall_id: "w_int_v1", position: { x: 5.5, z: 2.0 }, width: 0.9, height: 2.10, swing_direction: "left", door_type: "single" },
        { id: "door_bed2", floor_id: "floor_0", wall_id: "w_int_v1", position: { x: 5.5, z: 6.0 }, width: 0.9, height: 2.10, swing_direction: "right", door_type: "single" },
        { id: "door_bath", floor_id: "floor_0", wall_id: "w_int_bath", position: { x: 2.0, z: 5.2 }, width: 0.8, height: 2.10, swing_direction: "left", door_type: "single" },
      ],
      windows: [
        { id: "win_living", floor_id: "floor_0", wall_id: "w_ext_left", position: { x: 0.0, z: 2.5 }, width: 1.8, height: 1.5, sill_height: 0.8, window_type: "casement" },
        { id: "win_master", floor_id: "floor_0", wall_id: "w_ext_top", position: { x: 7.8, z: 0.0 }, width: 1.6, height: 1.4, sill_height: 0.9, window_type: "casement" },
        { id: "win_bed2", floor_id: "floor_0", wall_id: "w_ext_right", position: { x: 10.0, z: 6.0 }, width: 1.5, height: 1.4, sill_height: 0.9, window_type: "casement" },
      ],
      stairs: [
        {
          id: "stair_1",
          floor_id: "floor_0",
          start: { x: 0.4, z: 0.4 },
          end: { x: 2.4, z: 0.4 },
          width: 0.9,
          height: 2.8,
          risers_count: 14,
          stair_type: "straight"
        }
      ],
      columns: [
        {
          id: "col_porch_1",
          floor_id: "floor_0",
          position: { x: -0.8, z: 8.0 },
          radius_or_size: 0.3,
          height: 2.8,
          shape: "square"
        },
        {
          id: "col_porch_2",
          floor_id: "floor_0",
          position: { x: 4.0, z: 9.0 },
          radius_or_size: 0.3,
          height: 2.8,
          shape: "round"
        }
      ],
      rooms: [
        {
          id: "rm_living",
          floor_id: "floor_0",
          name: "Open Living & Dining",
          room_type: "living_room",
          area_sqm: 27.5,
          area_sqft: 296.0,
          floor_material: "hardwood_oak",
          wall_color: "#F8FAFC",
          polygon: [
            { x: 0, z: 0 },
            { x: 5.5, z: 0 },
            { x: 5.5, z: 5.2 },
            { x: 3.2, z: 5.2 },
            { x: 3.2, z: 8.0 },
            { x: 0, z: 8.0 },
          ]
        },
        {
          id: "rm_master",
          floor_id: "floor_0",
          name: "Master Suite",
          room_type: "bedroom",
          area_sqm: 18.0,
          area_sqft: 193.7,
          floor_material: "parquet_herringbone",
          wall_color: "#F1F5F9",
          polygon: [
            { x: 5.5, z: 0 },
            { x: 10, z: 0 },
            { x: 10, z: 4 },
            { x: 5.5, z: 4 },
          ]
        },
        {
          id: "rm_bed2",
          floor_id: "floor_0",
          name: "Guest Bedroom",
          room_type: "bedroom",
          area_sqm: 18.0,
          area_sqft: 193.7,
          floor_material: "hardwood_oak",
          wall_color: "#F8FAFC",
          polygon: [
            { x: 5.5, z: 4 },
            { x: 10, z: 4 },
            { x: 10, z: 8 },
            { x: 5.5, z: 8 },
          ]
        },
        {
          id: "rm_bath",
          floor_id: "floor_0",
          name: "En-suite Bathroom",
          room_type: "bathroom",
          area_sqm: 9.0,
          area_sqft: 96.9,
          floor_material: "tile_marble",
          wall_color: "#E2E8F0",
          polygon: [
            { x: 0, z: 5.2 },
            { x: 3.2, z: 5.2 },
            { x: 3.2, z: 8.0 },
            { x: 0, z: 8.0 },
          ]
        }
      ],
      furniture: [
        {
          id: "furn_sofa",
          floor_id: "floor_0",
          room_id: "rm_living",
          asset_id: "sofa_3seater",
          name: "Modern 3-Seater Sofa",
          category: "living",
          position: { x: 2.2, y: 0.45, z: 2.8 },
          rotation_y: 0,
          dimensions: { x: 2.1, y: 0.85, z: 0.95 },
          color: "#334155"
        },
        {
          id: "furn_coffee_table",
          floor_id: "floor_0",
          room_id: "rm_living",
          asset_id: "coffee_table",
          name: "Walnut Coffee Table",
          category: "living",
          position: { x: 2.2, y: 0.22, z: 1.8 },
          rotation_y: 0,
          dimensions: { x: 1.2, y: 0.45, z: 0.65 },
          color: "#78350F"
        },
        {
          id: "furn_bed_master",
          floor_id: "floor_0",
          room_id: "rm_master",
          asset_id: "bed_queen",
          name: "Queen Platform Bed",
          category: "bedroom",
          position: { x: 7.8, y: 0.5, z: 2.0 },
          rotation_y: 0,
          dimensions: { x: 1.8, y: 1.0, z: 2.1 },
          color: "#0284C7"
        },
        {
          id: "furn_bed2",
          floor_id: "floor_0",
          room_id: "rm_bed2",
          asset_id: "bed_single",
          name: "Twin Bed",
          category: "bedroom",
          position: { x: 7.8, y: 0.5, z: 6.0 },
          rotation_y: 0,
          dimensions: { x: 1.4, y: 0.9, z: 2.0 },
          color: "#475569"
        }
      ]
    }
  ]
};

interface FloorPlanState {
  model: ArchitecturalModel;
  viewMode: ViewMode;
  activeTool: CADTool;
  selectedEntity: SelectedEntity;
  activeFloorIndex: number;
  underlayImage: string | null;
  history: ArchitecturalModel[];
  historyIndex: number;
  showDetectionOverlay: boolean;
  isDollhouseView: boolean;
  isFirstPerson: boolean;
  dayNightMode: 'day' | 'night';
  unitSystem: UnitSystem;

  // Walkthrough navigation
  walkthroughEyeHeight: number;
  walkthroughSpeed: number;

  // AI Generator Candidate Layouts
  candidateLayouts: ArchitecturalModel[];

  // Actions
  setModel: (model: ArchitecturalModel) => void;
  setViewMode: (mode: ViewMode) => void;
  setActiveTool: (tool: CADTool) => void;
  setSelectedEntity: (entity: SelectedEntity) => void;
  setActiveFloorIndex: (idx: number) => void;
  setUnderlayImage: (url: string | null) => void;
  toggleDetectionOverlay: () => void;
  toggleDollhouseView: () => void;
  toggleFirstPerson: () => void;
  toggleDayNight: () => void;
  setUnitSystem: (system: UnitSystem) => void;
  toggleUnitSystem: () => void;
  setWalkthroughEyeHeight: (h: number) => void;
  setWalkthroughSpeed: (s: number) => void;

  // Multi-floor management
  addFloor: (name?: string, height?: number) => void;
  duplicateFloor: (floorIndex: number) => void;
  deleteFloor: (floorIndex: number) => void;

  // Geometry editing actions (operates on active floor)
  updateWall: (wall: Wall) => void;
  addWall: (wall: Wall) => void;
  deleteWall: (wallId: string) => void;

  updateDoor: (door: Door) => void;
  addDoor: (door: Door) => void;
  deleteDoor: (doorId: string) => void;

  updateWindow: (window: Window) => void;
  addWindow: (window: Window) => void;
  deleteWindow: (windowId: string) => void;

  addStair: (stair: Stair) => void;
  updateStair: (stair: Stair) => void;
  deleteStair: (stairId: string) => void;

  addColumn: (column: Column) => void;
  updateColumn: (column: Column) => void;
  deleteColumn: (columnId: string) => void;

  updateRoom: (room: Room) => void;
  addRoom: (room: Room) => void;
  deleteRoom: (roomId: string) => void;

  addFurniture: (item: FurnitureItem) => void;
  updateFurniture: (item: FurnitureItem) => void;
  deleteFurniture: (itemId: string) => void;

  // Roof & Site
  updateRoof: (roof: Partial<Roof>) => void;
  toggleRoofVisibility: () => void;
  updateSite: (site: Partial<Site>) => void;

  // Checkpoints
  createCheckpoint: (name: string, summary?: string) => void;
  restoreCheckpoint: (checkpointId: string) => void;

  // AI Layout Candidates
  setCandidateLayouts: (candidates: ArchitecturalModel[]) => void;
  selectCandidateLayout: (index: number) => void;

  setCalibration: (pixelDist: number, realMeters: number) => void;
  undo: () => void;
  redo: () => void;
  loadSamplePlan: (sampleType: 'villa' | 'duplex' | 'studio') => void;
}

export const useFloorPlanStore = create<FloorPlanState>((set, get) => ({
  model: INITIAL_MODEL,
  viewMode: 'split',
  activeTool: 'select',
  selectedEntity: { type: null, id: null },
  activeFloorIndex: 0,
  underlayImage: null,
  history: [INITIAL_MODEL],
  historyIndex: 0,
  showDetectionOverlay: false,
  isDollhouseView: false,
  isFirstPerson: false,
  dayNightMode: 'day',
  unitSystem: 'metric',
  walkthroughEyeHeight: 1.65,
  walkthroughSpeed: 3.5,
  candidateLayouts: [],

  setModel: (newModel) => {
    set((state) => ({
      model: newModel,
      unitSystem: newModel.unit_system || state.unitSystem,
      history: [...state.history.slice(0, state.historyIndex + 1), newModel],
      historyIndex: state.historyIndex + 1
    }));
  },

  setViewMode: (mode) => set({ viewMode: mode, isFirstPerson: mode === 'walkthrough' }),
  setActiveTool: (tool) => set({ activeTool: tool }),
  setSelectedEntity: (entity) => set({ selectedEntity: entity }),
  setActiveFloorIndex: (idx) => {
    const { model } = get();
    if (idx >= 0 && idx < model.floors.length) {
      set({ activeFloorIndex: idx });
    }
  },
  setUnderlayImage: (url) => set({ underlayImage: url }),
  toggleDetectionOverlay: () => set((s) => ({ showDetectionOverlay: !s.showDetectionOverlay })),
  toggleDollhouseView: () => set((s) => ({ isDollhouseView: !s.isDollhouseView })),
  toggleFirstPerson: () => set((s) => ({
    isFirstPerson: !s.isFirstPerson,
    viewMode: !s.isFirstPerson ? 'walkthrough' : (s.viewMode === 'walkthrough' ? '3d' : s.viewMode)
  })),
  toggleDayNight: () => set((s) => ({ dayNightMode: s.dayNightMode === 'day' ? 'night' : 'day' })),
  setUnitSystem: (system) => {
    set((state) => ({
      unitSystem: system,
      model: { ...state.model, unit_system: system }
    }));
  },
  toggleUnitSystem: () => {
    const next = get().unitSystem === 'metric' ? 'imperial' : 'metric';
    get().setUnitSystem(next);
  },
  setWalkthroughEyeHeight: (h) => set({ walkthroughEyeHeight: h }),
  setWalkthroughSpeed: (s) => set({ walkthroughSpeed: s }),

  // Multi-floor management
  addFloor: (name, height = 2.80) => {
    const { model } = get();
    const newLevel = model.floors.length;
    const prevElevation = model.floors[newLevel - 1]
      ? model.floors[newLevel - 1].elevation + model.floors[newLevel - 1].height
      : 0.0;

    const newFloor: Floor = {
      id: `floor_${newLevel}`,
      name: name || `Level ${newLevel}`,
      level: newLevel,
      elevation: prevElevation,
      height: height,
      walls: [],
      doors: [],
      windows: [],
      stairs: [],
      columns: [],
      rooms: [],
      furniture: []
    };

    const newFloors = [...model.floors, newFloor];
    const newModel: ArchitecturalModel = {
      ...model,
      building: {
        ...model.building,
        total_floors: newFloors.length
      },
      floors: newFloors
    };
    get().setModel(newModel);
    set({ activeFloorIndex: newFloors.length - 1 });
  },

  duplicateFloor: (floorIndex) => {
    const { model } = get();
    if (floorIndex < 0 || floorIndex >= model.floors.length) return;
    const srcFloor = model.floors[floorIndex];
    const newLevel = model.floors.length;
    const prevFloor = model.floors[newLevel - 1];
    const newElevation = prevFloor ? prevFloor.elevation + prevFloor.height : 0.0;
    const newFloorId = `floor_${newLevel}`;

    const duplicatedFloor: Floor = {
      ...srcFloor,
      id: newFloorId,
      name: `${srcFloor.name} (Copy)`,
      level: newLevel,
      elevation: newElevation,
      walls: (srcFloor.walls || []).map((w, idx) => ({ ...w, id: `w_${newLevel}_${idx}`, floor_id: newFloorId })),
      doors: (srcFloor.doors || []).map((d, idx) => ({ ...d, id: `d_${newLevel}_${idx}`, floor_id: newFloorId })),
      windows: (srcFloor.windows || []).map((wn, idx) => ({ ...wn, id: `wn_${newLevel}_${idx}`, floor_id: newFloorId })),
      stairs: (srcFloor.stairs || []).map((st, idx) => ({ ...st, id: `st_${newLevel}_${idx}`, floor_id: newFloorId })),
      columns: (srcFloor.columns || []).map((c, idx) => ({ ...c, id: `col_${newLevel}_${idx}`, floor_id: newFloorId })),
      rooms: (srcFloor.rooms || []).map((r, idx) => ({ ...r, id: `rm_${newLevel}_${idx}`, floor_id: newFloorId })),
      furniture: (srcFloor.furniture || []).map((f, idx) => ({ ...f, id: `fn_${newLevel}_${idx}`, floor_id: newFloorId }))
    };

    const newFloors = [...model.floors, duplicatedFloor];
    get().setModel({
      ...model,
      building: { ...model.building, total_floors: newFloors.length },
      floors: newFloors
    });
    set({ activeFloorIndex: newFloors.length - 1 });
  },

  deleteFloor: (floorIndex) => {
    const { model, activeFloorIndex } = get();
    if (model.floors.length <= 1) return; // Keep at least one floor
    const newFloors = model.floors.filter((_, idx) => idx !== floorIndex);
    get().setModel({
      ...model,
      building: { ...model.building, total_floors: newFloors.length },
      floors: newFloors
    });
    set({ activeFloorIndex: Math.min(activeFloorIndex, newFloors.length - 1) });
  },

  // Active Floor mutating helper
  updateWall: (updatedWall) => {
    const { model, activeFloorIndex } = get();
    const safeIdx = Math.min(activeFloorIndex, model.floors.length - 1);
    const floors = [...model.floors];
    const floor = { ...floors[safeIdx] };
    floor.walls = floor.walls.map((w) => (w.id === updatedWall.id ? updatedWall : w));
    floors[safeIdx] = floor;
    get().setModel({ ...model, floors });
  },

  addWall: (newWall) => {
    const { model, activeFloorIndex } = get();
    const safeIdx = Math.min(activeFloorIndex, model.floors.length - 1);
    const floors = [...model.floors];
    const floor = { ...floors[safeIdx] };
    floor.walls = [...floor.walls, newWall];
    floors[safeIdx] = floor;
    get().setModel({ ...model, floors });
  },

  deleteWall: (wallId) => {
    const { model, activeFloorIndex } = get();
    const safeIdx = Math.min(activeFloorIndex, model.floors.length - 1);
    const floors = [...model.floors];
    const floor = { ...floors[safeIdx] };
    floor.walls = floor.walls.filter((w) => w.id !== wallId);
    floor.doors = floor.doors.filter((d) => d.wall_id !== wallId);
    floor.windows = floor.windows.filter((win) => win.wall_id !== wallId);
    floors[safeIdx] = floor;
    get().setModel({ ...model, floors });
    set({ selectedEntity: { type: null, id: null } });
  },

  updateDoor: (updatedDoor) => {
    const { model, activeFloorIndex } = get();
    const safeIdx = Math.min(activeFloorIndex, model.floors.length - 1);
    const floors = [...model.floors];
    const floor = { ...floors[safeIdx] };
    floor.doors = floor.doors.map((d) => (d.id === updatedDoor.id ? updatedDoor : d));
    floors[safeIdx] = floor;
    get().setModel({ ...model, floors });
  },

  addDoor: (door) => {
    const { model, activeFloorIndex } = get();
    const safeIdx = Math.min(activeFloorIndex, model.floors.length - 1);
    const floors = [...model.floors];
    const floor = { ...floors[safeIdx] };
    floor.doors = [...floor.doors, door];
    floors[safeIdx] = floor;
    get().setModel({ ...model, floors });
  },

  deleteDoor: (doorId) => {
    const { model, activeFloorIndex } = get();
    const safeIdx = Math.min(activeFloorIndex, model.floors.length - 1);
    const floors = [...model.floors];
    const floor = { ...floors[safeIdx] };
    floor.doors = floor.doors.filter((d) => d.id !== doorId);
    floors[safeIdx] = floor;
    get().setModel({ ...model, floors });
    set({ selectedEntity: { type: null, id: null } });
  },

  updateWindow: (updatedWin) => {
    const { model, activeFloorIndex } = get();
    const safeIdx = Math.min(activeFloorIndex, model.floors.length - 1);
    const floors = [...model.floors];
    const floor = { ...floors[safeIdx] };
    floor.windows = floor.windows.map((w) => (w.id === updatedWin.id ? updatedWin : w));
    floors[safeIdx] = floor;
    get().setModel({ ...model, floors });
  },

  addWindow: (win) => {
    const { model, activeFloorIndex } = get();
    const safeIdx = Math.min(activeFloorIndex, model.floors.length - 1);
    const floors = [...model.floors];
    const floor = { ...floors[safeIdx] };
    floor.windows = [...floor.windows, win];
    floors[safeIdx] = floor;
    get().setModel({ ...model, floors });
  },

  deleteWindow: (winId) => {
    const { model, activeFloorIndex } = get();
    const safeIdx = Math.min(activeFloorIndex, model.floors.length - 1);
    const floors = [...model.floors];
    const floor = { ...floors[safeIdx] };
    floor.windows = floor.windows.filter((w) => w.id !== winId);
    floors[safeIdx] = floor;
    get().setModel({ ...model, floors });
    set({ selectedEntity: { type: null, id: null } });
  },

  addStair: (stair) => {
    const { model, activeFloorIndex } = get();
    const safeIdx = Math.min(activeFloorIndex, model.floors.length - 1);
    const floors = [...model.floors];
    const floor = { ...floors[safeIdx] };
    floor.stairs = [...(floor.stairs || []), stair];
    floors[safeIdx] = floor;
    get().setModel({ ...model, floors });
  },

  updateStair: (updatedStair) => {
    const { model, activeFloorIndex } = get();
    const safeIdx = Math.min(activeFloorIndex, model.floors.length - 1);
    const floors = [...model.floors];
    const floor = { ...floors[safeIdx] };
    floor.stairs = (floor.stairs || []).map((s) => (s.id === updatedStair.id ? updatedStair : s));
    floors[safeIdx] = floor;
    get().setModel({ ...model, floors });
  },

  deleteStair: (stairId) => {
    const { model, activeFloorIndex } = get();
    const safeIdx = Math.min(activeFloorIndex, model.floors.length - 1);
    const floors = [...model.floors];
    const floor = { ...floors[safeIdx] };
    floor.stairs = (floor.stairs || []).filter((s) => s.id !== stairId);
    floors[safeIdx] = floor;
    get().setModel({ ...model, floors });
    set({ selectedEntity: { type: null, id: null } });
  },

  addColumn: (column) => {
    const { model, activeFloorIndex } = get();
    const safeIdx = Math.min(activeFloorIndex, model.floors.length - 1);
    const floors = [...model.floors];
    const floor = { ...floors[safeIdx] };
    floor.columns = [...(floor.columns || []), column];
    floors[safeIdx] = floor;
    get().setModel({ ...model, floors });
  },

  updateColumn: (updatedColumn) => {
    const { model, activeFloorIndex } = get();
    const safeIdx = Math.min(activeFloorIndex, model.floors.length - 1);
    const floors = [...model.floors];
    const floor = { ...floors[safeIdx] };
    floor.columns = (floor.columns || []).map((c) => (c.id === updatedColumn.id ? updatedColumn : c));
    floors[safeIdx] = floor;
    get().setModel({ ...model, floors });
  },

  deleteColumn: (columnId) => {
    const { model, activeFloorIndex } = get();
    const safeIdx = Math.min(activeFloorIndex, model.floors.length - 1);
    const floors = [...model.floors];
    const floor = { ...floors[safeIdx] };
    floor.columns = (floor.columns || []).filter((c) => c.id !== columnId);
    floors[safeIdx] = floor;
    get().setModel({ ...model, floors });
    set({ selectedEntity: { type: null, id: null } });
  },

  updateRoom: (updatedRoom) => {
    const { model, activeFloorIndex } = get();
    const safeIdx = Math.min(activeFloorIndex, model.floors.length - 1);
    const floors = [...model.floors];
    const floor = { ...floors[safeIdx] };
    floor.rooms = floor.rooms.map((r) => (r.id === updatedRoom.id ? updatedRoom : r));
    floors[safeIdx] = floor;
    get().setModel({ ...model, floors });
  },

  addRoom: (room) => {
    const { model, activeFloorIndex } = get();
    const safeIdx = Math.min(activeFloorIndex, model.floors.length - 1);
    const floors = [...model.floors];
    const floor = { ...floors[safeIdx] };
    floor.rooms = [...floor.rooms, room];
    floors[safeIdx] = floor;
    get().setModel({ ...model, floors });
  },

  deleteRoom: (roomId) => {
    const { model, activeFloorIndex } = get();
    const safeIdx = Math.min(activeFloorIndex, model.floors.length - 1);
    const floors = [...model.floors];
    const floor = { ...floors[safeIdx] };
    floor.rooms = floor.rooms.filter((r) => r.id !== roomId);
    floors[safeIdx] = floor;
    get().setModel({ ...model, floors });
    set({ selectedEntity: { type: null, id: null } });
  },

  addFurniture: (item) => {
    const { model, activeFloorIndex } = get();
    const safeIdx = Math.min(activeFloorIndex, model.floors.length - 1);
    const floors = [...model.floors];
    const floor = { ...floors[safeIdx] };
    floor.furniture = [...floor.furniture, item];
    floors[safeIdx] = floor;
    get().setModel({ ...model, floors });
  },

  updateFurniture: (item) => {
    const { model, activeFloorIndex } = get();
    const safeIdx = Math.min(activeFloorIndex, model.floors.length - 1);
    const floors = [...model.floors];
    const floor = { ...floors[safeIdx] };
    floor.furniture = floor.furniture.map((f) => (f.id === item.id ? item : f));
    floors[safeIdx] = floor;
    get().setModel({ ...model, floors });
  },

  deleteFurniture: (itemId) => {
    const { model, activeFloorIndex } = get();
    const safeIdx = Math.min(activeFloorIndex, model.floors.length - 1);
    const floors = [...model.floors];
    const floor = { ...floors[safeIdx] };
    floor.furniture = floor.furniture.filter((f) => f.id !== itemId);
    floors[safeIdx] = floor;
    get().setModel({ ...model, floors });
    set({ selectedEntity: { type: null, id: null } });
  },

  // Roof & Site
  updateRoof: (roofPartial) => {
    const { model } = get();
    const currentRoof: Roof = model.building.roof || {
      roof_type: 'gable',
      pitch: 22,
      overhang: 0.45,
      thickness: 0.15,
      material: 'zinc_standing_seam',
      visible: true
    };
    get().setModel({
      ...model,
      building: {
        ...model.building,
        roof: { ...currentRoof, ...roofPartial }
      }
    });
  },

  toggleRoofVisibility: () => {
    const { model } = get();
    const isVisible = model.building.roof?.visible ?? false;
    get().updateRoof({ visible: !isVisible });
  },

  updateSite: (sitePartial) => {
    const { model } = get();
    const currentSite: Site = model.building.site || {
      plot_width: 20,
      plot_depth: 25,
      setback_front: 5,
      setback_rear: 4,
      setback_sides: 3,
      has_driveway: true,
      has_garden: true,
      has_boundary_wall: true
    };
    get().setModel({
      ...model,
      building: {
        ...model.building,
        site: { ...currentSite, ...sitePartial }
      }
    });
  },

  // Checkpoints
  createCheckpoint: (name, summary = "Manual checkpoint") => {
    const { model } = get();
    const newCheckpoint: VersionCheckpoint = {
      id: `cp_${Date.now()}`,
      name,
      timestamp: Date.now(),
      change_summary: summary
    };
    const checkpoints = [...(model.checkpoints || []), newCheckpoint];
    get().setModel({ ...model, checkpoints });
  },

  restoreCheckpoint: (checkpointId) => {
    // In our local state, checkpoints preserve history
    console.log(`Restoring to checkpoint ${checkpointId}`);
  },

  // AI Layout Candidates
  setCandidateLayouts: (candidates) => set({ candidateLayouts: candidates }),
  selectCandidateLayout: (index) => {
    const { candidateLayouts } = get();
    if (index >= 0 && index < candidateLayouts.length) {
      get().setModel(candidateLayouts[index]);
    }
  },

  setCalibration: (pixelDist, realMeters) => {
    const { model, activeFloorIndex } = get();
    if (pixelDist <= 0 || realMeters <= 0) return;
    const newScale = realMeters / pixelDist;
    const oldScale = model.calibration.meters_per_pixel;
    const ratio = oldScale > 0 ? newScale / oldScale : 1.0;

    const safeIdx = Math.min(activeFloorIndex, model.floors.length - 1);
    const floors = [...model.floors];
    const floor = { ...floors[safeIdx] };

    floor.walls = floor.walls.map((w) => ({
      ...w,
      start: { x: Math.round(w.start.x * ratio * 1000) / 1000, z: Math.round(w.start.z * ratio * 1000) / 1000 },
      end: { x: Math.round(w.end.x * ratio * 1000) / 1000, z: Math.round(w.end.z * ratio * 1000) / 1000 }
    }));
    floor.doors = floor.doors.map((d) => ({
      ...d,
      position: { x: Math.round(d.position.x * ratio * 1000) / 1000, z: Math.round(d.position.z * ratio * 1000) / 1000 }
    }));
    floor.windows = floor.windows.map((win) => ({
      ...win,
      position: { x: Math.round(win.position.x * ratio * 1000) / 1000, z: Math.round(win.position.z * ratio * 1000) / 1000 }
    }));
    floor.rooms = floor.rooms.map((rm) => ({
      ...rm,
      polygon: rm.polygon.map((pt) => ({
        x: Math.round(pt.x * ratio * 1000) / 1000,
        z: Math.round(pt.z * ratio * 1000) / 1000
      })),
      area_sqm: Math.round(rm.area_sqm * ratio * ratio * 10) / 10,
      area_sqft: Math.round(rm.area_sqm * ratio * ratio * 10.7639 * 10) / 10
    }));

    floors[safeIdx] = floor;

    const newModel: ArchitecturalModel = {
      ...model,
      calibration: {
        pixel_distance: pixelDist,
        real_meters: realMeters,
        meters_per_pixel: newScale,
        is_calibrated: true
      },
      floors
    };
    get().setModel(newModel);
  },

  undo: () => {
    const { history, historyIndex } = get();
    if (historyIndex > 0) {
      set({
        historyIndex: historyIndex - 1,
        model: history[historyIndex - 1]
      });
    }
  },

  redo: () => {
    const { history, historyIndex } = get();
    if (historyIndex < history.length - 1) {
      set({
        historyIndex: historyIndex + 1,
        model: history[historyIndex + 1]
      });
    }
  },

  loadSamplePlan: (sampleType) => {
    if (sampleType === 'villa') {
      get().setModel(INITIAL_MODEL);
    } else if (sampleType === 'duplex') {
      const duplexModel: ArchitecturalModel = {
        ...INITIAL_MODEL,
        project_id: "demo_duplex",
        name: "Modern 2-Storey Duplex Residence",
        building: {
          ...INITIAL_MODEL.building,
          total_floors: 2
        },
        floors: [
          INITIAL_MODEL.floors[0],
          {
            id: "floor_1",
            name: "Upper Level",
            level: 1,
            elevation: 2.80,
            height: 2.80,
            walls: [
              { id: "w1_1", floor_id: "floor_1", start: { x: 0, z: 0 }, end: { x: 10, z: 0 }, thickness: 0.25, height: 2.80, wall_type: "exterior" },
              { id: "w1_2", floor_id: "floor_1", start: { x: 10, z: 0 }, end: { x: 10, z: 8 }, thickness: 0.25, height: 2.80, wall_type: "exterior" },
              { id: "w1_3", floor_id: "floor_1", start: { x: 10, z: 8 }, end: { x: 0, z: 8 }, thickness: 0.25, height: 2.80, wall_type: "exterior" },
              { id: "w1_4", floor_id: "floor_1", start: { x: 0, z: 8 }, end: { x: 0, z: 0 }, thickness: 0.25, height: 2.80, wall_type: "exterior" },
              { id: "w1_mid", floor_id: "floor_1", start: { x: 5.0, z: 0 }, end: { x: 5.0, z: 8 }, thickness: 0.15, height: 2.80, wall_type: "interior" },
            ],
            doors: [
              { id: "d1_1", floor_id: "floor_1", position: { x: 5.0, z: 3.5 }, width: 0.9, height: 2.1, swing_direction: "left", door_type: "single" }
            ],
            windows: [
              { id: "wn1_1", floor_id: "floor_1", position: { x: 2.5, z: 0 }, width: 1.8, height: 1.4, sill_height: 0.9, window_type: "casement" },
              { id: "wn1_2", floor_id: "floor_1", position: { x: 7.5, z: 0 }, width: 1.8, height: 1.4, sill_height: 0.9, window_type: "casement" },
            ],
            stairs: [
              {
                id: "stair_1_up",
                floor_id: "floor_1",
                start: { x: 0.4, z: 0.4 },
                end: { x: 2.4, z: 0.4 },
                width: 0.9,
                height: 2.8,
                risers_count: 14,
                stair_type: "straight"
              }
            ],
            columns: [],
            rooms: [
              {
                id: "rm1_loft",
                floor_id: "floor_1",
                name: "Upper Lounge & Office",
                room_type: "office",
                area_sqm: 38.0,
                area_sqft: 409.0,
                floor_material: "hardwood_oak",
                wall_color: "#F8FAFC",
                polygon: [{ x: 0, z: 0 }, { x: 5, z: 0 }, { x: 5, z: 8 }, { x: 0, z: 8 }]
              },
              {
                id: "rm1_suite",
                floor_id: "floor_1",
                name: "Upper Penthouse Suite",
                room_type: "bedroom",
                area_sqm: 38.0,
                area_sqft: 409.0,
                floor_material: "parquet_herringbone",
                wall_color: "#F1F5F9",
                polygon: [{ x: 5, z: 0 }, { x: 10, z: 0 }, { x: 10, z: 8 }, { x: 5, z: 8 }]
              }
            ],
            furniture: [
              {
                id: "fn1_desk",
                floor_id: "floor_1",
                asset_id: "desk_executive",
                name: "Architectural Workstation",
                category: "office",
                position: { x: 2.5, y: 0.4, z: 4.0 },
                rotation_y: 0,
                dimensions: { x: 1.8, y: 0.75, z: 0.9 },
                color: "#1E293B"
              }
            ]
          }
        ]
      };
      get().setModel(duplexModel);
    } else if (sampleType === 'studio') {
      const studioModel: ArchitecturalModel = {
        schema_version: "1.0",
        project_id: "demo_studio",
        name: "Minimalist Studio Apartment",
        units: "meters",
        unit_system: "metric",
        building: {
          total_floors: 1,
          default_height: 2.70,
          units: "meters",
          roof: {
            roof_type: 'flat',
            pitch: 0,
            overhang: 0.3,
            thickness: 0.15,
            material: 'slate_shingle',
            visible: false
          },
          site: {
            plot_width: 14,
            plot_depth: 16,
            setback_front: 3,
            setback_rear: 3,
            setback_sides: 2,
            has_driveway: false,
            has_garden: true,
            has_boundary_wall: true
          }
        },
        calibration: { pixel_distance: 100, real_meters: 2.0, meters_per_pixel: 0.02, is_calibrated: true },
        floors: [{
          id: "floor_0",
          name: "Ground Floor",
          level: 0,
          elevation: 0.0,
          height: 2.70,
          walls: [
            { id: "sw_1", floor_id: "floor_0", start: { x: 0, z: 0 }, end: { x: 6, z: 0 }, thickness: 0.20, height: 2.70, wall_type: "exterior" },
            { id: "sw_2", floor_id: "floor_0", start: { x: 6, z: 0 }, end: { x: 6, z: 7 }, thickness: 0.20, height: 2.70, wall_type: "exterior" },
            { id: "sw_3", floor_id: "floor_0", start: { x: 6, z: 7 }, end: { x: 0, z: 7 }, thickness: 0.20, height: 2.70, wall_type: "exterior" },
            { id: "sw_4", floor_id: "floor_0", start: { x: 0, z: 7 }, end: { x: 0, z: 0 }, thickness: 0.20, height: 2.70, wall_type: "exterior" },
            { id: "sw_bath", floor_id: "floor_0", start: { x: 0, z: 4.5 }, end: { x: 2.5, z: 4.5 }, thickness: 0.15, height: 2.70, wall_type: "interior" },
            { id: "sw_bath2", floor_id: "floor_0", start: { x: 2.5, z: 4.5 }, end: { x: 2.5, z: 7 }, thickness: 0.15, height: 2.70, wall_type: "interior" },
          ],
          doors: [
            { id: "sd_main", floor_id: "floor_0", wall_id: "sw_3", position: { x: 4.5, z: 7.0 }, width: 0.9, height: 2.1, swing_direction: "left", door_type: "single" },
            { id: "sd_bath", floor_id: "floor_0", wall_id: "sw_bath", position: { x: 1.2, z: 4.5 }, width: 0.75, height: 2.1, swing_direction: "left", door_type: "single" },
          ],
          windows: [
            { id: "swin_main", floor_id: "floor_0", wall_id: "sw_1", position: { x: 3.0, z: 0.0 }, width: 2.2, height: 1.5, sill_height: 0.8, window_type: "casement" }
          ],
          stairs: [],
          columns: [],
          rooms: [
            {
              id: "srm_main",
              floor_id: "floor_0",
              name: "Living & Sleeping Area",
              room_type: "living_room",
              area_sqm: 35.75,
              area_sqft: 384.8,
              floor_material: "concrete_polished",
              wall_color: "#F8FAFC",
              polygon: [
                { x: 0, z: 0 },
                { x: 6, z: 0 },
                { x: 6, z: 7 },
                { x: 2.5, z: 7 },
                { x: 2.5, z: 4.5 },
                { x: 0, z: 4.5 }
              ]
            },
            {
              id: "srm_bath",
              floor_id: "floor_0",
              name: "Bathroom",
              room_type: "bathroom",
              area_sqm: 6.25,
              area_sqft: 67.2,
              floor_material: "tile_slate",
              wall_color: "#E2E8F0",
              polygon: [
                { x: 0, z: 4.5 },
                { x: 2.5, z: 4.5 },
                { x: 2.5, z: 7.0 },
                { x: 0, z: 7.0 }
              ]
            }
          ],
          furniture: [
            {
              id: "sfurn_bed",
              floor_id: "floor_0",
              room_id: "srm_main",
              asset_id: "bed_queen",
              name: "Platform Bed",
              category: "bedroom",
              position: { x: 4.5, y: 0.45, z: 2.0 },
              rotation_y: 0,
              dimensions: { x: 1.8, y: 0.9, z: 2.0 },
              color: "#334155"
            }
          ]
        }]
      };
      get().setModel(studioModel);
    }
  }
}));
