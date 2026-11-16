export interface Inhabitant {
  id: string;
  name: string;
  role: 'ScaleFigure' | 'Occupant' | 'Zone' | 'Sensor' | 'Device' | 'Owner' | 'Family' | 'Guest' | 'Pet';
  roomId: string;
  status: 'home' | 'away' | 'motion_active';
  color: string;
  avatarIcon: string;
  device?: string; // e.g. "iPhone 15 Pro", "Apple Watch", "AirTag"
  beaconId?: string;
  lastSeen: string;
  positionOffset?: [number, number]; // [dx, dz] from room centroid in meters
}

export interface RoomClimate {
  roomId: string;
  temperature: number; // e.g. 21.5 C
  humidity: number;    // e.g. 52%
  airQuality?: 'Optimal' | 'Good' | 'Moderate';
  motionDetected: boolean;
  lux?: number;        // e.g. 320 lux
}

export const DEFAULT_INHABITANTS: Inhabitant[] = [
  {
    id: 'inh_living',
    name: 'Scale Figure',
    role: 'ScaleFigure',
    roomId: 'rm_living',
    status: 'home',
    color: '#00F0FF',
    avatarIcon: '👤',
    device: 'Zone Active',
    beaconId: 'beacon_living_proxy',
    lastSeen: 'Just now',
    positionOffset: [-0.6, 0.4]
  },
  {
    id: 'inh_master',
    name: 'Scale Figure',
    role: 'ScaleFigure',
    roomId: 'rm_master',
    status: 'home',
    color: '#F59E0B',
    avatarIcon: '👤',
    device: 'Zone Active',
    beaconId: 'beacon_master_proxy',
    lastSeen: '1m ago',
    positionOffset: [0.5, -0.3]
  },
  {
    id: 'inh_bath',
    name: 'Scale Figure',
    role: 'ScaleFigure',
    roomId: 'rm_bath',
    status: 'motion_active',
    color: '#10B981',
    avatarIcon: '👤',
    device: 'Zone Active',
    beaconId: 'beacon_bath_proxy',
    lastSeen: 'Just now',
    positionOffset: [0.0, 0.0]
  },
  {
    id: 'inh_beacon',
    name: 'Sensor Beacon',
    role: 'Sensor',
    roomId: 'rm_bed2',
    status: 'home',
    color: '#8B5CF6',
    avatarIcon: '🏷️',
    device: 'Proxy Online',
    beaconId: 'beacon_bed2_proxy',
    lastSeen: 'Just now',
    positionOffset: [0.3, 0.5]
  }
];

export const DEFAULT_ROOM_CLIMATES: Record<string, RoomClimate> = {
  rm_living: {
    roomId: 'rm_living',
    temperature: 22.4,
    humidity: 48,
    airQuality: 'Optimal',
    motionDetected: true,
    lux: 380
  },
  rm_master: {
    roomId: 'rm_master',
    temperature: 21.0,
    humidity: 52,
    airQuality: 'Optimal',
    motionDetected: true,
    lux: 210
  },
  rm_bed2: {
    roomId: 'rm_bed2',
    temperature: 20.8,
    humidity: 50,
    airQuality: 'Good',
    motionDetected: false,
    lux: 150
  },
  rm_bath: {
    roomId: 'rm_bath',
    temperature: 23.5,
    humidity: 65,
    airQuality: 'Good',
    motionDetected: true,
    lux: 420
  },
  rm1_loft: {
    roomId: 'rm1_loft',
    temperature: 21.8,
    humidity: 46,
    airQuality: 'Optimal',
    motionDetected: false,
    lux: 340
  },
  rm1_suite: {
    roomId: 'rm1_suite',
    temperature: 22.0,
    humidity: 49,
    airQuality: 'Optimal',
    motionDetected: false,
    lux: 180
  }
};
