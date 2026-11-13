import { create } from 'zustand';
import {
  ArchitecturalModel,
  Floor,
  Wall,
  Door,
  Window,
  Room,
  FurnitureItem,
  ViewMode,
  CADTool,
  SelectedEntity,
  PointXZ
} from '../types/architectural';

const INITIAL_MODEL: ArchitecturalModel = {
  schema_version: "1.0",
  project_id: "demo_villa",
  name: "Contemporary 2-Bedroom Villa",
  units: "meters",
  building: {
    total_floors: 1,
    default_height: 2.80,
    units: "meters"
  },
  calibration: {
    pixel_distance: 100,
    real_meters: 2.5,
    meters_per_pixel: 0.025,
    is_calibrated: true
  },
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
        // Main entrance door
        { id: "door_main", floor_id: "floor_0", wall_id: "w_ext_bottom", position: { x: 2.5, z: 8.0 }, width: 1.0, height: 2.10, swing_direction: "left", door_type: "single" },
        // Master bed door
        { id: "door_master", floor_id: "floor_0", wall_id: "w_int_v1", position: { x: 5.5, z: 2.0 }, width: 0.9, height: 2.10, swing_direction: "left", door_type: "single" },
        // Bedroom 2 door
        { id: "door_bed2", floor_id: "floor_0", wall_id: "w_int_v1", position: { x: 5.5, z: 6.0 }, width: 0.9, height: 2.10, swing_direction: "right", door_type: "single" },
        // Bath door
        { id: "door_bath", floor_id: "floor_0", wall_id: "w_int_bath", position: { x: 2.0, z: 5.2 }, width: 0.8, height: 2.10, swing_direction: "left", door_type: "single" },
      ],
      windows: [
        { id: "win_living", floor_id: "floor_0", wall_id: "w_ext_left", position: { x: 0.0, z: 2.5 }, width: 1.8, height: 1.5, sill_height: 0.8, window_type: "casement" },
        { id: "win_master", floor_id: "floor_0", wall_id: "w_ext_top", position: { x: 7.8, z: 0.0 }, width: 1.6, height: 1.4, sill_height: 0.9, window_type: "casement" },
        { id: "win_bed2", floor_id: "floor_0", wall_id: "w_ext_right", position: { x: 10.0, z: 6.0 }, width: 1.5, height: 1.4, sill_height: 0.9, window_type: "casement" },
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
        // Living room sofa
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
        // Coffee table
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
        // Master Bed
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
        // Bed 2
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

  // Actions
  setModel: (model: ArchitecturalModel) => void;
  setViewMode: (mode: ViewMode) => void;
  setActiveTool: (tool: CADTool) => void;
  setSelectedEntity: (entity: SelectedEntity) => void;
  setUnderlayImage: (url: string | null) => void;
  toggleDetectionOverlay: () => void;
  toggleDollhouseView: () => void;
  toggleFirstPerson: () => void;
  toggleDayNight: () => void;

  // Geometry editing actions
  updateWall: (wall: Wall) => void;
  addWall: (wall: Wall) => void;
  deleteWall: (wallId: string) => void;

  updateDoor: (door: Door) => void;
  addDoor: (door: Door) => void;
  deleteDoor: (doorId: string) => void;

  updateWindow: (window: Window) => void;
  addWindow: (window: Window) => void;
  deleteWindow: (windowId: string) => void;

  updateRoom: (room: Room) => void;
  addRoom: (room: Room) => void;
  deleteRoom: (roomId: string) => void;

  addFurniture: (item: FurnitureItem) => void;
  updateFurniture: (item: FurnitureItem) => void;
  deleteFurniture: (itemId: string) => void;

  setCalibration: (pixelDist: number, realMeters: number) => void;
  undo: () => void;
  redo: () => void;
  loadSamplePlan: (sampleType: 'villa' | '2bhk' | 'studio') => void;
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

  setModel: (newModel) => {
    set((state) => ({
      model: newModel,
      history: [...state.history.slice(0, state.historyIndex + 1), newModel],
      historyIndex: state.historyIndex + 1
    }));
  },

  setViewMode: (mode) => set({ viewMode: mode }),
  setActiveTool: (tool) => set({ activeTool: tool }),
  setSelectedEntity: (entity) => set({ selectedEntity: entity }),
  setUnderlayImage: (url) => set({ underlayImage: url }),
  toggleDetectionOverlay: () => set((s) => ({ showDetectionOverlay: !s.showDetectionOverlay })),
  toggleDollhouseView: () => set((s) => ({ isDollhouseView: !s.isDollhouseView })),
  toggleFirstPerson: () => set((s) => ({ isFirstPerson: !s.isFirstPerson })),
  toggleDayNight: () => set((s) => ({ dayNightMode: s.dayNightMode === 'day' ? 'night' : 'day' })),

  updateWall: (updatedWall) => {
    const { model } = get();
    const floor = { ...model.floors[0] };
    floor.walls = floor.walls.map((w) => (w.id === updatedWall.id ? updatedWall : w));
    const newModel = { ...model, floors: [floor] };
    get().setModel(newModel);
  },

  addWall: (newWall) => {
    const { model } = get();
    const floor = { ...model.floors[0] };
    floor.walls = [...floor.walls, newWall];
    const newModel = { ...model, floors: [floor] };
    get().setModel(newModel);
  },

  deleteWall: (wallId) => {
    const { model } = get();
    const floor = { ...model.floors[0] };
    floor.walls = floor.walls.filter((w) => w.id !== wallId);
    floor.doors = floor.doors.filter((d) => d.wall_id !== wallId);
    floor.windows = floor.windows.filter((win) => win.wall_id !== wallId);
    const newModel = { ...model, floors: [floor] };
    get().setModel(newModel);
    set({ selectedEntity: { type: null, id: null } });
  },

  updateDoor: (updatedDoor) => {
    const { model } = get();
    const floor = { ...model.floors[0] };
    floor.doors = floor.doors.map((d) => (d.id === updatedDoor.id ? updatedDoor : d));
    get().setModel({ ...model, floors: [floor] });
  },

  addDoor: (door) => {
    const { model } = get();
    const floor = { ...model.floors[0] };
    floor.doors = [...floor.doors, door];
    get().setModel({ ...model, floors: [floor] });
  },

  deleteDoor: (doorId) => {
    const { model } = get();
    const floor = { ...model.floors[0] };
    floor.doors = floor.doors.filter((d) => d.id !== doorId);
    get().setModel({ ...model, floors: [floor] });
    set({ selectedEntity: { type: null, id: null } });
  },

  updateWindow: (updatedWin) => {
    const { model } = get();
    const floor = { ...model.floors[0] };
    floor.windows = floor.windows.map((w) => (w.id === updatedWin.id ? updatedWin : w));
    get().setModel({ ...model, floors: [floor] });
  },

  addWindow: (win) => {
    const { model } = get();
    const floor = { ...model.floors[0] };
    floor.windows = [...floor.windows, win];
    get().setModel({ ...model, floors: [floor] });
  },

  deleteWindow: (winId) => {
    const { model } = get();
    const floor = { ...model.floors[0] };
    floor.windows = floor.windows.filter((w) => w.id !== winId);
    get().setModel({ ...model, floors: [floor] });
    set({ selectedEntity: { type: null, id: null } });
  },

  updateRoom: (updatedRoom) => {
    const { model } = get();
    const floor = { ...model.floors[0] };
    floor.rooms = floor.rooms.map((r) => (r.id === updatedRoom.id ? updatedRoom : r));
    get().setModel({ ...model, floors: [floor] });
  },

  addRoom: (room) => {
    const { model } = get();
    const floor = { ...model.floors[0] };
    floor.rooms = [...floor.rooms, room];
    get().setModel({ ...model, floors: [floor] });
  },

  deleteRoom: (roomId) => {
    const { model } = get();
    const floor = { ...model.floors[0] };
    floor.rooms = floor.rooms.filter((r) => r.id !== roomId);
    get().setModel({ ...model, floors: [floor] });
    set({ selectedEntity: { type: null, id: null } });
  },

  addFurniture: (item) => {
    const { model } = get();
    const floor = { ...model.floors[0] };
    floor.furniture = [...floor.furniture, item];
    get().setModel({ ...model, floors: [floor] });
  },

  updateFurniture: (item) => {
    const { model } = get();
    const floor = { ...model.floors[0] };
    floor.furniture = floor.furniture.map((f) => (f.id === item.id ? item : f));
    get().setModel({ ...model, floors: [floor] });
  },

  deleteFurniture: (itemId) => {
    const { model } = get();
    const floor = { ...model.floors[0] };
    floor.furniture = floor.furniture.filter((f) => f.id !== itemId);
    get().setModel({ ...model, floors: [floor] });
    set({ selectedEntity: { type: null, id: null } });
  },

  setCalibration: (pixelDist, realMeters) => {
    const { model } = get();
    if (pixelDist <= 0 || realMeters <= 0) return;
    const newScale = realMeters / pixelDist;
    const oldScale = model.calibration.meters_per_pixel;
    const ratio = oldScale > 0 ? newScale / oldScale : 1.0;

    const floor = { ...model.floors[0] };
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

    const newModel = {
      ...model,
      calibration: {
        pixel_distance: pixelDist,
        real_meters: realMeters,
        meters_per_pixel: newScale,
        is_calibrated: true
      },
      floors: [floor]
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
    } else if (sampleType === 'studio') {
      const studioModel: ArchitecturalModel = {
        schema_version: "1.0",
        project_id: "demo_studio",
        name: "Minimalist Studio Apartment",
        units: "meters",
        building: { total_floors: 1, default_height: 2.70, units: "meters" },
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
