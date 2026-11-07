export type Point2D = [number, number];

export type UnitType = 'meters' | 'millimeters' | 'centimeters' | 'feet' | 'inches';

export interface Opening {
  id: string;
  wallId: string;
  type: 'door' | 'window';
  offset: number; // distance along wall start
  width: number;
  height: number;
  sillHeight: number; // 0 for doors, e.g. 0.9 for windows
}

export interface Wall {
  id: string;
  start: Point2D;
  end: Point2D;
  thickness: number;
  height: number;
  type: 'external' | 'internal' | 'partition';
  layer?: string;
  material?: string;
  openings: Opening[];
}

export interface Room {
  id: string;
  name: string;
  boundary: Point2D[];
  area: number;
}

export interface StructuralObject {
  id: string;
  type: 'column' | 'beam' | 'stair';
  geometry: Record<string, any>;
  properties: Record<string, any>;
}

export interface Floor {
  id: string;
  name: string;
  elevation: number;
  wallHeight: number;
  order_index: number;
  walls: Wall[];
  rooms: Room[];
  structuralObjects: StructuralObject[];
}

export interface SourceFile {
  id: string;
  filename: string;
  format: string;
  file_path: string;
  file_size: number;
  metadata_json: Record<string, any>;
  created_at?: string;
}

export interface Project {
  id: string;
  name: string;
  unit: UnitType;
  scale: number; // world units per pixel
  settings: Record<string, any>;
  floors: Floor[];
  sourceFiles: SourceFile[];
  created_at?: string;
  updated_at?: string;
}

export interface ValidationIssue {
  type: 'error' | 'warning';
  objectId?: string;
  description: string;
  suggestion: string;
}

export interface ValidationReport {
  isValid: boolean;
  issues: ValidationIssue[];
  summary: string;
}

export type EditorTool = 'select' | 'pan' | 'wall' | 'room' | 'door' | 'window' | 'column' | 'measure' | 'delete';

export type ViewMode = 'split' | '2d' | '3d';

export type RenderMode = 'engineering' | 'realistic';

export type CameraPreset = 'orbit' | 'top' | 'front' | 'side' | 'isometric';

export interface FurnitureItem {
  id: string;
  name: string;
  type: 'bed' | 'sofa' | 'dining' | 'table' | 'chair' | 'kitchen' | 'toilet' | 'tv_unit';
  position: [number, number, number];
  rotation: number;
}


