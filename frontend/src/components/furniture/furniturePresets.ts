import { Point3D } from '../../types/architectural';

export interface FurniturePreset {
  assetId: string;
  name: string;
  category: 'living' | 'bedroom' | 'dining' | 'kitchen' | 'bathroom' | 'office' | 'decor';
  dimensions: Point3D;
  defaultColor: string;
  iconName: string;
}

export const FURNITURE_PRESETS: FurniturePreset[] = [
  // Living Room
  {
    assetId: 'sofa_3seater',
    name: 'Modern 3-Seater Sofa',
    category: 'living',
    dimensions: { x: 2.10, y: 0.85, z: 0.95 },
    defaultColor: '#334155',
    iconName: 'Armchair'
  },
  {
    assetId: 'sofa_sectional',
    name: 'L-Shaped Sectional Sofa',
    category: 'living',
    dimensions: { x: 2.60, y: 0.85, z: 1.80 },
    defaultColor: '#475569',
    iconName: 'Armchair'
  },
  {
    assetId: 'coffee_table',
    name: 'Walnut Coffee Table',
    category: 'living',
    dimensions: { x: 1.20, y: 0.42, z: 0.65 },
    defaultColor: '#78350F',
    iconName: 'Table'
  },
  {
    assetId: 'tv_console',
    name: 'Media Console & TV',
    category: 'living',
    dimensions: { x: 1.80, y: 0.55, z: 0.45 },
    defaultColor: '#1E293B',
    iconName: 'Tv'
  },
  {
    assetId: 'lounge_chair',
    name: 'Scandinavian Lounge Chair',
    category: 'living',
    dimensions: { x: 0.85, y: 0.80, z: 0.85 },
    defaultColor: '#0284C7',
    iconName: 'Armchair'
  },

  // Bedroom
  {
    assetId: 'bed_queen',
    name: 'Queen Platform Bed',
    category: 'bedroom',
    dimensions: { x: 1.80, y: 1.05, z: 2.15 },
    defaultColor: '#0284C7',
    iconName: 'Bed'
  },
  {
    assetId: 'bed_king',
    name: 'King Luxury Bed',
    category: 'bedroom',
    dimensions: { x: 2.10, y: 1.15, z: 2.20 },
    defaultColor: '#4338CA',
    iconName: 'Bed'
  },
  {
    assetId: 'nightstand',
    name: 'Bedside Nightstand',
    category: 'bedroom',
    dimensions: { x: 0.50, y: 0.55, z: 0.45 },
    defaultColor: '#64748B',
    iconName: 'Box'
  },
  {
    assetId: 'wardrobe_3door',
    name: '3-Door Wardrobe Closet',
    category: 'bedroom',
    dimensions: { x: 1.80, y: 2.20, z: 0.60 },
    defaultColor: '#F8FAFC',
    iconName: 'Columns'
  },

  // Dining
  {
    assetId: 'dining_table_6',
    name: '6-Seater Oak Dining Table',
    category: 'dining',
    dimensions: { x: 1.80, y: 0.75, z: 0.90 },
    defaultColor: '#B45309',
    iconName: 'Table'
  },

  // Kitchen
  {
    assetId: 'kitchen_island',
    name: 'Kitchen Island Counter',
    category: 'kitchen',
    dimensions: { x: 2.20, y: 0.90, z: 1.00 },
    defaultColor: '#F1F5F9',
    iconName: 'Layers'
  },
  {
    assetId: 'refrigerator',
    name: 'Double-Door Refrigerator',
    category: 'kitchen',
    dimensions: { x: 0.90, y: 1.85, z: 0.75 },
    defaultColor: '#94A3B8',
    iconName: 'Box'
  },

  // Bathroom
  {
    assetId: 'vanity_sink',
    name: 'Floating Vanity & Mirror',
    category: 'bathroom',
    dimensions: { x: 1.00, y: 0.85, z: 0.55 },
    defaultColor: '#E2E8F0',
    iconName: 'Bath'
  },
  {
    assetId: 'toilet_wall_hung',
    name: 'Wall-Hung Toilet',
    category: 'bathroom',
    dimensions: { x: 0.42, y: 0.45, z: 0.60 },
    defaultColor: '#FFFFFF',
    iconName: 'Bath'
  },
  {
    assetId: 'bathtub_freestanding',
    name: 'Freestanding Bathtub',
    category: 'bathroom',
    dimensions: { x: 1.70, y: 0.60, z: 0.80 },
    defaultColor: '#FFFFFF',
    iconName: 'Bath'
  },

  // Office & Decor
  {
    assetId: 'office_desk',
    name: 'Executive Work Desk',
    category: 'office',
    dimensions: { x: 1.50, y: 0.75, z: 0.75 },
    defaultColor: '#334155',
    iconName: 'Laptop'
  },
  {
    assetId: 'plant_fiddle',
    name: 'Fiddle Leaf Fig Plant',
    category: 'decor',
    dimensions: { x: 0.50, y: 1.40, z: 0.50 },
    defaultColor: '#15803D',
    iconName: 'Flower2'
  }
];
