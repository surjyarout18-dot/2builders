export interface PointXZ {
  x: number;
  z: number;
}

export interface Point3D {
  x: number;
  y: number;
  z: number;
}

export interface Wall {
  id: string;
  floor_id: string;
  start: PointXZ;
  end: PointXZ;
  thickness: number; // in meters (e.g. 0.20 for exterior, 0.15 for interior)
  height: number;    // in meters (e.g. 2.80)
  wall_type: 'exterior' | 'interior' | 'partition';
  color?: string;
}

export interface Door {
  id: string;
  floor_id: string;
  wall_id?: string;
  position: PointXZ;
  width: number;
  height: number;
  swing_direction: 'left' | 'right' | 'sliding' | 'double';
  door_type: string;
}

export interface Window {
  id: string;
  floor_id: string;
  wall_id?: string;
  position: PointXZ;
  width: number;
  height: number;
  sill_height: number;
  window_type: 'casement' | 'sliding' | 'fixed';
}

export interface Stair {
  id: string;
  floor_id: string;
  start: PointXZ;
  end: PointXZ;
  width: number;       // meters
  height: number;      // rise in meters
  risers_count: number;
  stair_type: 'straight' | 'l_shape' | 'u_shape';
}

export interface Column {
  id: string;
  floor_id: string;
  position: PointXZ;
  radius_or_size: number; // meters width / diameter
  height: number;         // meters
  shape: 'square' | 'round';
}

export interface Room {
  id: string;
  floor_id: string;
  name: string;
  room_type: string;
  area_sqm: number;
  area_sqft: number;
  polygon: PointXZ[];
  floor_material: string;
  wall_color: string;
  ceiling_visible?: boolean;
}

export interface FurnitureItem {
  id: string;
  floor_id: string;
  room_id?: string;
  asset_id: string;
  name: string;
  category: string;
  position: Point3D;
  rotation_y: number;
  dimensions: Point3D;
  color?: string;
}

export interface Roof {
  roof_type: 'gable' | 'hip' | 'shed' | 'flat';
  pitch: number;       // degrees slope
  overhang: number;    // meters
  thickness: number;   // meters
  material: string;    // 'zinc_standing_seam' | 'terracotta_tile' | 'slate_shingle'
  visible: boolean;
}

export interface Site {
  plot_width: number;
  plot_depth: number;
  setback_front: number;
  setback_rear: number;
  setback_sides: number;
  has_driveway: boolean;
  has_garden: boolean;
  has_boundary_wall: boolean;
}

export interface Floor {
  id: string;
  name: string;
  level: number;
  elevation: number;
  height: number;
  walls: Wall[];
  doors: Door[];
  windows: Window[];
  stairs?: Stair[];
  columns?: Column[];
  rooms: Room[];
  furniture: FurnitureItem[];
}

export interface ScaleCalibration {
  pixel_distance: number;
  real_meters: number;
  meters_per_pixel: number;
  is_calibrated: boolean;
}

export interface VersionCheckpoint {
  id: string;
  name: string;
  timestamp: number;
  change_summary: string;
}

export type UnitSystem = 'metric' | 'imperial';

export interface ArchitecturalModel {
  schema_version: string;
  project_id: string;
  name: string;
  units: string;
  unit_system?: UnitSystem;
  building: {
    total_floors: number;
    default_height: number;
    units: string;
    roof?: Roof;
    site?: Site;
  };
  floors: Floor[];
  calibration: ScaleCalibration;
  checkpoints?: VersionCheckpoint[];
  metadata?: Record<string, any>;
}

export type ViewMode = 'split' | '2d' | '3d' | 'walkthrough';
export type CADTool =
  | 'select'
  | 'wall'
  | 'door'
  | 'window'
  | 'room'
  | 'rect_room'
  | 'stair'
  | 'column'
  | 'dimension'
  | 'calibrate'
  | 'measure'
  | 'furniture';

export interface SelectedEntity {
  type: 'wall' | 'door' | 'window' | 'room' | 'furniture' | 'stair' | 'column' | null;
  id: string | null;
}
