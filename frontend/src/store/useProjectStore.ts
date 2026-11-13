import { create } from 'zustand';
import { Project, Floor, Wall, Opening, Room, StructuralObject, EditorTool, ViewMode, CameraPreset, Point2D, ValidationReport } from '../types';
import { GeometryValidator } from '../geometry/GeometryValidator';
import { toast } from '../components/Toast';

interface HistorySnapshot {
  floors: Floor[];
}

interface ProjectState {
  project: Project | null;
  activeFloorId: string | null;
  selectedEntity: { type: 'wall' | 'opening' | 'room' | 'floor'; id: string } | null;
  activeTool: EditorTool;
  viewMode: ViewMode;
  renderMode: 'engineering' | 'realistic';
  showFurniture: boolean;
  showDimensions: boolean;
  isWalkthroughActive: boolean;
  cameraPreset: CameraPreset;
  wireframe: boolean;
  showWalls: boolean;
  showFloors: boolean;
  showOpenings: boolean;
  gridSnap: boolean;
  gridSize: number;
  drawingPoints: Point2D[];
  hoveredPoint: Point2D | null;
  measurePoints: Point2D[];

  // Background blueprint tracing underlay
  showBackground: boolean;
  backgroundOpacity: number;
  backgroundImageUrl: string | null;

  // 3D section cut & isolation
  sectionCutHeight: number | null;
  isolateActiveFloor: boolean;
  
  // History
  undoStack: HistorySnapshot[];
  redoStack: HistorySnapshot[];

  // Modals & Panels
  isImportModalOpen: boolean;
  isCalibrateModalOpen: boolean;
  isValidationModalOpen: boolean;
  isExportModalOpen: boolean;
  isPropertiesPanelOpen: boolean;
  setIsPropertiesPanelOpen: (open: boolean) => void;
  showVastuZones: boolean;
  setShowVastuZones: (val: boolean) => void;
  wallCutaway: boolean;
  setWallCutaway: (val: boolean) => void;
  interiorStyle: string;
  setInteriorStyle: (style: string) => void;
  twoBuildersPlan: any | null;
  setTwoBuildersPlan: (plan: any) => void;
  isReviewModalOpen: boolean;
  setReviewModalOpen: (open: boolean) => void;
  isAnalyzing: boolean;
  setIsAnalyzing: (analyzing: boolean) => void;
  analyzingStep: string;
  setAnalyzingStep: (step: string) => void;
  analyzingPercent: number;
  setAnalyzingPercent: (percent: number) => void;
  isShareModalOpen: boolean;
  setShareModalOpen: (open: boolean) => void;
  isViewerGuideOpen: boolean;
  setViewerGuideOpen: (open: boolean) => void;
  viewerGuideFormat: string;
  setViewerGuideFormat: (fmt: string) => void;
  validationReport: ValidationReport | null;
  isLoading: boolean;
  statusMessage: string;

  // Floor-Plan.AI Mega Suite & Layers
  isMegaMenuOpen: boolean;
  setMegaMenuOpen: (open: boolean) => void;
  isGeneratorModalOpen: boolean;
  setGeneratorModalOpen: (open: boolean) => void;
  isCadStudioOpen: boolean;
  setCadStudioOpen: (open: boolean) => void;
  activeSpecialLayer: 'none' | 'electrical' | 'plumbing' | 'lighting' | 'landscape';
  setActiveSpecialLayer: (layer: 'none' | 'electrical' | 'plumbing' | 'lighting' | 'landscape') => void;
  isCinematicTourActive: boolean;
  setCinematicTourActive: (active: boolean) => void;
  dxfBannerDismissed: boolean;
  setDxfBannerDismissed: (dismissed: boolean) => void;
  isPremiumModalOpen: boolean;
  setPremiumModalOpen: (open: boolean) => void;
  userTier: 'free' | 'pro' | 'enterprise';
  setUserTier: (tier: 'free' | 'pro' | 'enterprise') => void;
  generateAILayout: (config: {
    type: 'room' | 'house' | 'custom';
    preset: string;
    prompt?: string;
    furnished?: boolean;
    unit?: 'meters' | 'feet';
    aspect?: string;
  }) => void;

  // Actions
  setProject: (project: Project) => void;
  setActiveFloorId: (floorId: string) => void;
  setSelectedEntity: (entity: { type: 'wall' | 'opening' | 'room' | 'floor'; id: string } | null) => void;
  setActiveTool: (tool: EditorTool) => void;
  setViewMode: (mode: ViewMode) => void;
  setRenderMode: (mode: 'engineering' | 'realistic') => void;
  setShowFurniture: (val: boolean) => void;
  setShowDimensions: (val: boolean) => void;
  setIsWalkthroughActive: (val: boolean) => void;
  setCameraPreset: (preset: CameraPreset) => void;
  setWireframe: (val: boolean) => void;
  setShowWalls: (val: boolean) => void;
  setShowFloors: (val: boolean) => void;
  setShowOpenings: (val: boolean) => void;
  setGridSnap: (val: boolean) => void;
  setGridSize: (val: number) => void;
  setDrawingPoints: (pts: Point2D[]) => void;
  addDrawingPoint: (pt: Point2D) => void;
  clearDrawing: () => void;
  setMeasurePoints: (pts: Point2D[]) => void;
  setStatusMessage: (msg: string) => void;

  setShowBackground: (val: boolean) => void;
  setBackgroundOpacity: (val: number) => void;
  setBackgroundImageUrl: (url: string | null) => void;
  setSectionCutHeight: (height: number | null) => void;
  setIsolateActiveFloor: (val: boolean) => void;

  // Modal controls
  setImportModalOpen: (open: boolean) => void;
  setCalibrateModalOpen: (open: boolean) => void;
  setValidationModalOpen: (open: boolean) => void;
  setExportModalOpen: (open: boolean) => void;

  // Geometry Mutations (with Undo/Redo tracking)
  pushHistory: () => void;
  undo: () => void;
  redo: () => void;
  addWall: (wall: Omit<Wall, 'id'>) => Wall;
  updateWall: (wallId: string, updates: Partial<Wall>) => void;
  deleteWall: (wallId: string) => void;
  splitWall: (wallId: string, splitPoint: Point2D) => void;
  addColumn: (pos: Point2D, size?: number) => void;
  deleteStructuralObject: (id: string) => void;
  addOpening: (wallId: string, opening: Omit<Opening, 'id' | 'wallId'>) => Opening;
  updateOpening: (openingId: string, updates: Partial<Opening>) => void;
  deleteOpening: (openingId: string) => void;
  addRoom: (room: Omit<Room, 'id'>) => Room;
  updateRoom: (roomId: string, updates: Partial<Room>) => void;
  deleteRoom: (roomId: string) => void;
  addFloor: (name?: string, elevation?: number) => void;
  updateFloor: (floorId: string, updates: Partial<Floor>) => void;
  deleteFloor: (floorId: string) => void;
  validateCurrentGeometry: () => ValidationReport;

  // API sync
  loadProject: (projectId: string) => Promise<void>;
  saveToBackend: () => Promise<void>;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  project: null,
  activeFloorId: null,
  selectedEntity: null,
  activeTool: 'select',
  viewMode: 'split',
  renderMode: 'realistic',
  showFurniture: true,
  showDimensions: false,
  isWalkthroughActive: false,
  cameraPreset: 'isometric',
  wireframe: false,
  showWalls: true,
  showFloors: true,
  showOpenings: true,
  gridSnap: true,
  gridSize: 0.5,
  drawingPoints: [],
  hoveredPoint: null,
  measurePoints: [],

  showBackground: true,
  backgroundOpacity: 0.35,
  backgroundImageUrl: null,

  sectionCutHeight: null,
  isolateActiveFloor: false,

  undoStack: [],
  redoStack: [],

  isImportModalOpen: false,
  isCalibrateModalOpen: false,
  isValidationModalOpen: false,
  isExportModalOpen: false,
  isPropertiesPanelOpen: false,
  setIsPropertiesPanelOpen: (open: boolean) => set({ isPropertiesPanelOpen: open }),
  isViewerGuideOpen: false,
  viewerGuideFormat: 'glb',
  setViewerGuideOpen: (open: boolean) => set({ isViewerGuideOpen: open }),
  setViewerGuideFormat: (fmt: string) => set({ viewerGuideFormat: fmt }),
  validationReport: null,
  isLoading: false,
  statusMessage: 'Ready',

  setProject: (project) => {
    const activeFloorId = project.floors.length > 0 ? project.floors[0].id : null;
    const bgUrl = project.sourceFiles && project.sourceFiles.length > 0
      ? `/api/files/${project.sourceFiles[0].id}/download`
      : null;
    set({ project, activeFloorId, backgroundImageUrl: bgUrl, undoStack: [], redoStack: [] });
  },

  setActiveFloorId: (activeFloorId) => set({ activeFloorId, selectedEntity: null }),
  setSelectedEntity: (selectedEntity) => set({ 
    selectedEntity, 
    ...(selectedEntity ? { isPropertiesPanelOpen: true } : {}) 
  }),
  setActiveTool: (activeTool) => set({ activeTool, drawingPoints: [], measurePoints: [] }),
  setViewMode: (viewMode) => set({ viewMode }),
  setRenderMode: (renderMode) => set({ renderMode }),
  setShowFurniture: (showFurniture) => set({ showFurniture }),
  setShowDimensions: (showDimensions) => set({ showDimensions }),
  setIsWalkthroughActive: (isWalkthroughActive) => set({ isWalkthroughActive }),
  setCameraPreset: (cameraPreset) => set({ cameraPreset }),
  setWireframe: (wireframe) => set({ wireframe }),
  setShowWalls: (showWalls) => set({ showWalls }),
  setShowFloors: (showFloors) => set({ showFloors }),
  setShowOpenings: (showOpenings) => set({ showOpenings }),
  setGridSnap: (gridSnap) => set({ gridSnap }),
  setGridSize: (gridSize) => set({ gridSize }),
  setDrawingPoints: (drawingPoints) => set({ drawingPoints }),
  addDrawingPoint: (pt) => set((s) => ({ drawingPoints: [...s.drawingPoints, pt] })),
  clearDrawing: () => set({ drawingPoints: [], measurePoints: [] }),
  setMeasurePoints: (measurePoints) => set({ measurePoints }),
  setStatusMessage: (statusMessage) => set({ statusMessage }),

  setShowBackground: (showBackground) => set({ showBackground }),
  setBackgroundOpacity: (backgroundOpacity) => set({ backgroundOpacity }),
  setBackgroundImageUrl: (backgroundImageUrl) => set({ backgroundImageUrl }),
  setSectionCutHeight: (sectionCutHeight) => set({ sectionCutHeight }),
  setIsolateActiveFloor: (isolateActiveFloor) => set({ isolateActiveFloor }),

  setImportModalOpen: (isImportModalOpen) => set({ isImportModalOpen }),
  setCalibrateModalOpen: (isCalibrateModalOpen) => set({ isCalibrateModalOpen }),
  setValidationModalOpen: (isValidationModalOpen) => set({ isValidationModalOpen }),
  showVastuZones: false,
  setShowVastuZones: (showVastuZones) => set({ showVastuZones }),
  wallCutaway: true,
  setWallCutaway: (wallCutaway) => set({ wallCutaway }),
  interiorStyle: 'Modern',
  setInteriorStyle: (interiorStyle) => set({ interiorStyle }),
  twoBuildersPlan: null,
  setTwoBuildersPlan: (twoBuildersPlan) => set({ twoBuildersPlan }),
  isReviewModalOpen: false,
  setReviewModalOpen: (isReviewModalOpen) => set({ isReviewModalOpen }),
  isAnalyzing: false,
  setIsAnalyzing: (isAnalyzing) => set({ isAnalyzing }),
  analyzingStep: 'queued',
  setAnalyzingStep: (analyzingStep) => set({ analyzingStep }),
  analyzingPercent: 0,
  setAnalyzingPercent: (analyzingPercent) => set({ analyzingPercent }),
  isShareModalOpen: false,
  setShareModalOpen: (isShareModalOpen) => set({ isShareModalOpen }),
  setExportModalOpen: (isExportModalOpen) => set({ isExportModalOpen }),

  // Floor-Plan.AI Mega Suite & Layers State
  isMegaMenuOpen: false,
  setMegaMenuOpen: (isMegaMenuOpen) => set({ isMegaMenuOpen }),
  isGeneratorModalOpen: false,
  setGeneratorModalOpen: (isGeneratorModalOpen) => set({ isGeneratorModalOpen }),
  isCadStudioOpen: false,
  setCadStudioOpen: (isCadStudioOpen) => set({ isCadStudioOpen }),
  activeSpecialLayer: 'none',
  setActiveSpecialLayer: (activeSpecialLayer) => set({ activeSpecialLayer }),
  isCinematicTourActive: false,
  setCinematicTourActive: (isCinematicTourActive) => set({ isCinematicTourActive }),
  dxfBannerDismissed: false,
  setDxfBannerDismissed: (dxfBannerDismissed) => set({ dxfBannerDismissed }),
  isPremiumModalOpen: false,
  setPremiumModalOpen: (isPremiumModalOpen) => set({ isPremiumModalOpen }),
  userTier: 'free',
  setUserTier: (userTier) => set({ userTier }),

  generateAILayout: (config) => {
    const { preset, furnished = true, unit = 'meters' } = config;
    const projId = `pl_gen_${Date.now().toString(36)}`;
    const floorId = `fl_${Date.now().toString(36)}`;

    let title = 'AI Generated Floor Plan';
    let rawWalls: any[] = [];
    let rawRooms: any[] = [];

    const isStudio = preset.toLowerCase().includes('1bhk') || preset.toLowerCase().includes('studio');
    const isVilla = preset.toLowerCase().includes('villa');
    const isRoomOnly = config.type === 'room';

    if (isRoomOnly) {
      title = 'Master Suite Architectural Plan';
      rawWalls = [
        { start: [0, 0], end: [6.0, 0], thickness: 0.25, type: 'external', openings: [{ type: 'window', offset: 2.0, width: 2.0, height: 1.4, sill_height: 0.9 }] },
        { start: [6.0, 0], end: [6.0, 5.0], thickness: 0.25, type: 'external', openings: [{ type: 'window', offset: 1.5, width: 1.5, height: 1.4, sill_height: 0.9 }] },
        { start: [6.0, 5.0], end: [0, 5.0], thickness: 0.25, type: 'external', openings: [{ type: 'door', offset: 1.0, width: 0.9, height: 2.1, sill_height: 0 }] },
        { start: [0, 5.0], end: [0, 0], thickness: 0.25, type: 'external', openings: [] },
        { start: [3.8, 0], end: [3.8, 2.5], thickness: 0.15, type: 'internal', openings: [{ type: 'door', offset: 0.8, width: 0.8, height: 2.1, sill_height: 0 }] },
        { start: [3.8, 2.5], end: [6.0, 2.5], thickness: 0.15, type: 'internal', openings: [] },
      ];
      rawRooms = [
        { name: 'Master Bedroom', boundary: [[0, 0], [3.8, 0], [3.8, 5.0], [0, 5.0]], area: 19.0 },
        { name: 'En-Suite Bathroom', boundary: [[3.8, 0], [6.0, 0], [6.0, 2.5], [3.8, 2.5]], area: 5.5 },
        { name: 'Walk-in Closet', boundary: [[3.8, 2.5], [6.0, 2.5], [6.0, 5.0], [3.8, 5.0]], area: 5.5 },
      ];
    } else if (isStudio) {
      title = 'Modern 1BHK Urban Suite';
      rawWalls = [
        { start: [0, 0], end: [7.5, 0], thickness: 0.25, type: 'external', openings: [{ type: 'window', offset: 2.5, width: 2.0, height: 1.4, sill_height: 0.9 }] },
        { start: [7.5, 0], end: [7.5, 6.0], thickness: 0.25, type: 'external', openings: [{ type: 'window', offset: 2.0, width: 1.8, height: 1.4, sill_height: 0.9 }] },
        { start: [7.5, 6.0], end: [0, 6.0], thickness: 0.25, type: 'external', openings: [{ type: 'door', offset: 0.8, width: 0.95, height: 2.1, sill_height: 0 }] },
        { start: [0, 6.0], end: [0, 0], thickness: 0.25, type: 'external', openings: [] },
        { start: [4.2, 0], end: [4.2, 6.0], thickness: 0.15, type: 'internal', openings: [{ type: 'door', offset: 1.2, width: 0.9, height: 2.1, sill_height: 0 }] },
        { start: [4.2, 3.8], end: [7.5, 3.8], thickness: 0.15, type: 'internal', openings: [{ type: 'door', offset: 0.6, width: 0.8, height: 2.1, sill_height: 0 }] },
      ];
      rawRooms = [
        { name: 'Great Room / Living', boundary: [[0, 0], [4.2, 0], [4.2, 6.0], [0, 6.0]], area: 25.2 },
        { name: 'Master Bedroom', boundary: [[4.2, 0], [7.5, 0], [7.5, 3.8], [4.2, 3.8]], area: 12.5 },
        { name: 'Bathroom', boundary: [[4.2, 3.8], [7.5, 3.8], [7.5, 6.0], [4.2, 6.0]], area: 7.2 },
      ];
    } else if (isVilla) {
      title = 'Luxury 2-Story Villa';
      rawWalls = [
        { start: [0, 0], end: [12.0, 0], thickness: 0.25, type: 'external', openings: [{ type: 'window', offset: 4.0, width: 3.0, height: 1.5, sill_height: 0.8 }] },
        { start: [12.0, 0], end: [12.0, 9.0], thickness: 0.25, type: 'external', openings: [{ type: 'window', offset: 3.0, width: 2.2, height: 1.5, sill_height: 0.8 }] },
        { start: [12.0, 9.0], end: [0, 9.0], thickness: 0.25, type: 'external', openings: [{ type: 'door', offset: 1.5, width: 1.1, height: 2.1, sill_height: 0 }] },
        { start: [0, 9.0], end: [0, 0], thickness: 0.25, type: 'external', openings: [{ type: 'window', offset: 2.5, width: 2.0, height: 1.4, sill_height: 0.9 }] },
        { start: [0, 5.0], end: [7.0, 5.0], thickness: 0.15, type: 'internal', openings: [{ type: 'door', offset: 2.0, width: 1.0, height: 2.1, sill_height: 0 }] },
        { start: [7.0, 0], end: [7.0, 9.0], thickness: 0.15, type: 'internal', openings: [{ type: 'door', offset: 6.5, width: 0.9, height: 2.1, sill_height: 0 }] },
        { start: [7.0, 4.5], end: [12.0, 4.5], thickness: 0.15, type: 'internal', openings: [{ type: 'door', offset: 1.0, width: 0.9, height: 2.1, sill_height: 0 }] },
        { start: [4.0, 5.0], end: [4.0, 9.0], thickness: 0.15, type: 'internal', openings: [{ type: 'door', offset: 1.2, width: 0.85, height: 2.1, sill_height: 0 }] },
      ];
      rawRooms = [
        { name: 'Great Room / Living', boundary: [[0, 0], [7.0, 0], [7.0, 5.0], [0, 5.0]], area: 35.0 },
        { name: 'Dining Area', boundary: [[0, 5.0], [4.0, 5.0], [4.0, 9.0], [0, 9.0]], area: 16.0 },
        { name: 'Kitchen', boundary: [[4.0, 5.0], [7.0, 5.0], [7.0, 9.0], [4.0, 9.0]], area: 12.0 },
        { name: 'Master Bedroom', boundary: [[7.0, 0], [12.0, 0], [12.0, 4.5], [7.0, 4.5]], area: 22.5 },
        { name: 'Guest Bedroom', boundary: [[7.0, 4.5], [12.0, 4.5], [12.0, 9.0], [7.0, 9.0]], area: 22.5 },
      ];
    } else {
      // Default Modern 3BHK
      title = 'Modern 3BHK Residence';
      rawWalls = [
        { start: [0, 0], end: [10.5, 0], thickness: 0.25, type: 'external', openings: [{ type: 'window', offset: 3.5, width: 2.5, height: 1.4, sill_height: 0.9 }] },
        { start: [10.5, 0], end: [10.5, 8.0], thickness: 0.25, type: 'external', openings: [{ type: 'window', offset: 2.5, width: 2.0, height: 1.4, sill_height: 0.9 }] },
        { start: [10.5, 8.0], end: [0, 8.0], thickness: 0.25, type: 'external', openings: [{ type: 'door', offset: 1.2, width: 1.0, height: 2.1, sill_height: 0 }] },
        { start: [0, 8.0], end: [0, 0], thickness: 0.25, type: 'external', openings: [{ type: 'window', offset: 2.0, width: 1.8, height: 1.4, sill_height: 0.9 }] },
        { start: [0, 4.5], end: [6.0, 4.5], thickness: 0.15, type: 'internal', openings: [{ type: 'door', offset: 1.8, width: 0.9, height: 2.1, sill_height: 0 }] },
        { start: [6.0, 0], end: [6.0, 8.0], thickness: 0.15, type: 'internal', openings: [{ type: 'door', offset: 5.5, width: 0.9, height: 2.1, sill_height: 0 }] },
        { start: [6.0, 4.0], end: [10.5, 4.0], thickness: 0.15, type: 'internal', openings: [{ type: 'door', offset: 1.0, width: 0.9, height: 2.1, sill_height: 0 }] },
        { start: [3.5, 4.5], end: [3.5, 8.0], thickness: 0.15, type: 'internal', openings: [{ type: 'door', offset: 0.8, width: 0.8, height: 2.1, sill_height: 0 }] },
      ];
      rawRooms = [
        { name: 'Great Room / Living', boundary: [[0, 0], [6.0, 0], [6.0, 4.5], [0, 4.5]], area: 27.0 },
        { name: 'Kitchen', boundary: [[0, 4.5], [3.5, 4.5], [3.5, 8.0], [0, 8.0]], area: 12.25 },
        { name: 'Dining Area', boundary: [[3.5, 4.5], [6.0, 4.5], [6.0, 8.0], [3.5, 8.0]], area: 8.75 },
        { name: 'Master Bedroom', boundary: [[6.0, 0], [10.5, 0], [10.5, 4.0], [6.0, 4.0]], area: 18.0 },
        { name: 'Bedroom 2', boundary: [[6.0, 4.0], [10.5, 4.0], [10.5, 8.0], [6.0, 8.0]], area: 18.0 },
      ];
    }

    const walls: any[] = rawWalls.map((w, idx) => ({
      id: `w_gen_${idx + 1}`,
      floorId,
      start: w.start,
      end: w.end,
      thickness: w.thickness,
      height: 3.05,
      type: w.type,
      layer: 'WALLS',
      openings: (w.openings || []).map((op: any, oidx: number) => ({
        id: `op_gen_${idx}_${oidx}`,
        wallId: `w_gen_${idx + 1}`,
        type: op.type,
        offset: op.offset,
        width: op.width,
        height: op.height,
        sillHeight: op.sill_height
      }))
    }));

    const rooms: any[] = rawRooms.map((r, idx) => ({
      id: `rm_gen_${idx + 1}`,
      floorId,
      name: r.name,
      boundary: r.boundary,
      area: r.area,
      color: idx % 4 === 0 ? '#38bdf8' : idx % 4 === 1 ? '#a855f7' : idx % 4 === 2 ? '#10b981' : '#f59e0b'
    }));

    const newProject: any = {
      id: projId,
      name: title,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      unit,
      scale: 0.0125,
      settings: {
        twobuilders_plan: {
          schema: '2builders.plan/1',
          walls: walls.map(w => ({ id: w.id, nodes: [`n1`, `n2`], thicknessMm: w.thickness * 1000, isExterior: w.type === 'external' })),
          rooms: rooms.map(r => ({ id: r.id, name: r.name, areaSqM: r.area })),
          vastuSummary: { score: 96, grade: 'A+', remedies: ['Ideal master suite in South-West', 'Auspicious cooking energy in South-East'] }
        }
      },
      floors: [
        {
          id: floorId,
          projectId: projId,
          name: 'Ground Floor',
          elevation: 0.0,
          wallHeight: 3.05,
          orderIndex: 0,
          walls,
          rooms
        }
      ]
    };

    set({
      project: newProject,
      activeFloorId: floorId,
      twoBuildersPlan: newProject.settings.twobuilders_plan,
      isGeneratorModalOpen: false,
      statusMessage: `Generated "${title}" with ${walls.length} walls & ${rooms.length} rooms`
    });
  },

  pushHistory: () => {
    const { project, undoStack } = get();
    if (!project) return;
    const snapshot: HistorySnapshot = {
      floors: JSON.parse(JSON.stringify(project.floors))
    };
    set({
      undoStack: [...undoStack.slice(-30), snapshot],
      redoStack: []
    });
  },

  undo: () => {
    const { project, undoStack, redoStack } = get();
    if (!project || undoStack.length === 0) return;
    const currentSnapshot: HistorySnapshot = {
      floors: JSON.parse(JSON.stringify(project.floors))
    };
    const prev = undoStack[undoStack.length - 1];
    set({
      project: { ...project, floors: prev.floors },
      undoStack: undoStack.slice(0, -1),
      redoStack: [...redoStack, currentSnapshot],
      statusMessage: 'Undo action'
    });
  },

  redo: () => {
    const { project, undoStack, redoStack } = get();
    if (!project || redoStack.length === 0) return;
    const currentSnapshot: HistorySnapshot = {
      floors: JSON.parse(JSON.stringify(project.floors))
    };
    const next = redoStack[redoStack.length - 1];
    set({
      project: { ...project, floors: next.floors },
      redoStack: redoStack.slice(0, -1),
      undoStack: [...undoStack, currentSnapshot],
      statusMessage: 'Redo action'
    });
  },

  addWall: (wallData) => {
    get().pushHistory();
    const { project, activeFloorId } = get();
    if (!project) throw new Error("No active project");
    const targetFloor = project.floors.find(f => f.id === activeFloorId) || project.floors[0];
    const newWall: Wall = {
      ...wallData,
      id: `wall-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 4)}`,
      openings: wallData.openings || []
    };
    const updatedFloors = project.floors.map(f => {
      if (f.id === targetFloor.id) {
        return { ...f, walls: [...f.walls, newWall] };
      }
      return f;
    });
    set({
      project: { ...project, floors: updatedFloors },
      selectedEntity: { type: 'wall', id: newWall.id },
      statusMessage: `Added wall (${newWall.thickness}m thick, ${newWall.height}m high)`
    });
    return newWall;
  },

  updateWall: (wallId, updates) => {
    get().pushHistory();
    const { project } = get();
    if (!project) return;
    const updatedFloors = project.floors.map(f => ({
      ...f,
      walls: f.walls.map(w => w.id === wallId ? { ...w, ...updates } : w)
    }));
    set({
      project: { ...project, floors: updatedFloors },
      statusMessage: `Updated wall properties`
    });
  },

  deleteWall: (wallId) => {
    get().pushHistory();
    const { project } = get();
    if (!project) return;
    const updatedFloors = project.floors.map(f => ({
      ...f,
      walls: f.walls.filter(w => w.id !== wallId)
    }));
    set({
      project: { ...project, floors: updatedFloors },
      selectedEntity: null,
      statusMessage: `Deleted wall`
    });
  },

  splitWall: (wallId, splitPoint) => {
    get().pushHistory();
    const { project } = get();
    if (!project) return;
    const updatedFloors = project.floors.map(f => {
      const wall = f.walls.find(w => w.id === wallId);
      if (!wall) return f;
      const wall1: Wall = {
        ...wall,
        id: `wall-${Date.now().toString(36)}-1`,
        end: splitPoint,
        openings: []
      };
      const wall2: Wall = {
        ...wall,
        id: `wall-${Date.now().toString(36)}-2`,
        start: splitPoint,
        openings: []
      };
      return {
        ...f,
        walls: [...f.walls.filter(w => w.id !== wallId), wall1, wall2]
      };
    });
    set({
      project: { ...project, floors: updatedFloors },
      selectedEntity: null,
      statusMessage: `Split wall into two segments`
    });
  },

  addColumn: (pos, size = 0.35) => {
    get().pushHistory();
    const { project, activeFloorId } = get();
    if (!project) return;
    const targetFloor = project.floors.find(f => f.id === activeFloorId) || project.floors[0];
    const newCol: StructuralObject = {
      id: `col-${Date.now().toString(36)}`,
      type: 'column',
      geometry: { x: pos[0], y: pos[1], width: size, depth: size, height: targetFloor.wallHeight || 3.0 },
      properties: { shape: 'square', material: 'concrete' }
    };
    const updatedFloors = project.floors.map(f => {
      if (f.id === targetFloor.id) {
        return {
          ...f,
          structuralObjects: [...(f.structuralObjects || []), newCol]
        };
      }
      return f;
    });
    set({
      project: { ...project, floors: updatedFloors },
      statusMessage: `Placed structural column (${size}m x ${size}m)`
    });
  },

  deleteStructuralObject: (id) => {
    get().pushHistory();
    const { project } = get();
    if (!project) return;
    const updatedFloors = project.floors.map(f => ({
      ...f,
      structuralObjects: (f.structuralObjects || []).filter(s => s.id !== id)
    }));
    set({
      project: { ...project, floors: updatedFloors },
      selectedEntity: null,
      statusMessage: `Deleted structural object`
    });
  },

  addOpening: (wallId, openingData) => {
    get().pushHistory();
    const { project } = get();
    if (!project) throw new Error("No active project");
    const newOp: Opening = {
      ...openingData,
      id: `${openingData.type}-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 4)}`,
      wallId
    };
    const updatedFloors = project.floors.map(f => ({
      ...f,
      walls: f.walls.map(w => {
        if (w.id === wallId) {
          return { ...w, openings: [...w.openings, newOp] };
        }
        return w;
      })
    }));
    set({
      project: { ...project, floors: updatedFloors },
      selectedEntity: { type: 'opening', id: newOp.id },
      statusMessage: `Added ${newOp.type} (offset: ${newOp.offset}m, width: ${newOp.width}m)`
    });
    return newOp;
  },

  updateOpening: (openingId, updates) => {
    get().pushHistory();
    const { project } = get();
    if (!project) return;
    const updatedFloors = project.floors.map(f => ({
      ...f,
      walls: f.walls.map(w => ({
        ...w,
        openings: w.openings.map(op => op.id === openingId ? { ...op, ...updates } : op)
      }))
    }));
    set({
      project: { ...project, floors: updatedFloors },
      statusMessage: `Updated opening properties`
    });
  },

  deleteOpening: (openingId) => {
    get().pushHistory();
    const { project } = get();
    if (!project) return;
    const updatedFloors = project.floors.map(f => ({
      ...f,
      walls: f.walls.map(w => ({
        ...w,
        openings: w.openings.filter(op => op.id !== openingId)
      }))
    }));
    set({
      project: { ...project, floors: updatedFloors },
      selectedEntity: null,
      statusMessage: `Deleted opening`
    });
  },

  addRoom: (roomData) => {
    get().pushHistory();
    const { project, activeFloorId } = get();
    if (!project) throw new Error("No active project");
    const targetFloor = project.floors.find(f => f.id === activeFloorId) || project.floors[0];
    const newRoom: Room = {
      ...roomData,
      id: `room-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 4)}`
    };
    const updatedFloors = project.floors.map(f => {
      if (f.id === targetFloor.id) {
        return { ...f, rooms: [...f.rooms, newRoom] };
      }
      return f;
    });
    set({
      project: { ...project, floors: updatedFloors },
      selectedEntity: { type: 'room', id: newRoom.id },
      statusMessage: `Added ${newRoom.name} (${newRoom.area.toFixed(1)} m²)`
    });
    return newRoom;
  },

  updateRoom: (roomId, updates) => {
    get().pushHistory();
    const { project } = get();
    if (!project) return;
    const updatedFloors = project.floors.map(f => ({
      ...f,
      rooms: f.rooms.map(r => r.id === roomId ? { ...r, ...updates } : r)
    }));
    set({ project: { ...project, floors: updatedFloors } });
  },

  deleteRoom: (roomId) => {
    get().pushHistory();
    const { project } = get();
    if (!project) return;
    const updatedFloors = project.floors.map(f => ({
      ...f,
      rooms: f.rooms.filter(r => r.id !== roomId)
    }));
    set({
      project: { ...project, floors: updatedFloors },
      selectedEntity: null,
      statusMessage: `Deleted room`
    });
  },

  addFloor: (name, elevation) => {
    get().pushHistory();
    const { project } = get();
    if (!project) return;
    const orderIndex = project.floors.length;
    const lastFloor = project.floors[project.floors.length - 1];
    const elev = elevation !== undefined ? elevation : (lastFloor ? lastFloor.elevation + lastFloor.wallHeight : 0);
    const newFloor: Floor = {
      id: `floor-${Date.now().toString(36)}`,
      name: name || `Floor ${orderIndex + 1}`,
      elevation: elev,
      wallHeight: 3.0,
      order_index: orderIndex,
      walls: [],
      rooms: [],
      structuralObjects: []
    };
    set({
      project: { ...project, floors: [...project.floors, newFloor] },
      activeFloorId: newFloor.id,
      statusMessage: `Added new floor: ${newFloor.name}`
    });
  },

  updateFloor: (floorId, updates) => {
    get().pushHistory();
    const { project } = get();
    if (!project) return;
    const updatedFloors = project.floors.map(f => f.id === floorId ? { ...f, ...updates } : f);
    set({ project: { ...project, floors: updatedFloors } });
  },

  deleteFloor: (floorId) => {
    get().pushHistory();
    const { project } = get();
    if (!project || project.floors.length <= 1) return;
    const updatedFloors = project.floors.filter(f => f.id !== floorId);
    set({
      project: { ...project, floors: updatedFloors },
      activeFloorId: updatedFloors[0].id,
      selectedEntity: null,
      statusMessage: `Deleted floor`
    });
  },

  validateCurrentGeometry: () => {
    const { project } = get();
    if (!project) {
      return { isValid: false, issues: [], summary: "No active project" };
    }
    const report = GeometryValidator.validate(project.floors);
    set({ validationReport: report, isValidationModalOpen: true });
    return report;
  },

  loadProject: async (projectId: string) => {
    set({ isLoading: true, statusMessage: 'Loading project...' });
    try {
      const res = await fetch(`/api/projects/${projectId}`);
      if (!res.ok) throw new Error("Failed to load project");
      const data: Project = await res.json();
      const bgUrl = data.sourceFiles && data.sourceFiles.length > 0
        ? `/api/files/${data.sourceFiles[0].id}/download`
        : null;

      set({
        project: data,
        activeFloorId: data.floors.length > 0 ? data.floors[0].id : null,
        backgroundImageUrl: bgUrl,
        isLoading: false,
        statusMessage: `Project '${data.name}' loaded`
      });
    } catch (err: any) {
      set({ isLoading: false, statusMessage: `Error loading project: ${err.message}` });
    }
  },

  saveToBackend: async () => {
    const { project } = get();
    if (!project) return;
    set({ isLoading: true, statusMessage: 'Saving project to server...' });
    try {
      const res = await fetch(`/api/projects/${project.id}/geometry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ floors: project.floors })
      });
      if (!res.ok) throw new Error("Failed to save geometry");
      const data = await res.json();
      set({
        isLoading: false,
        statusMessage: 'Project saved successfully',
        validationReport: data.validation
      });
      toast.success('Project saved successfully!');
    } catch (err: any) {
      set({ isLoading: false, statusMessage: `Save error: ${err.message}` });
      toast.error(`Save error: ${err.message}`);
    }
  }
}));

