export const FREE_ROAM_BOUNDS = {
  minX: -280,
  maxX: 280,
  minZ: -280,
  maxZ: 280,
  width: 560,
  depth: 560,
  centerX: 0,
  centerZ: 0,
} as const;

export type BeaconType = 'garage' | 'car_lot' | 'race';

export interface FreeRoamBeacon {
  id: string;
  type: BeaconType;
  title: string;
  subtitle: string;
  x: number;
  z: number;
  radius: number;
  color: string;
  trackId?: string;
  isBoss?: boolean;
  act?: number;
  reward?: number;
}

export const FREE_ROAM_BEACONS: readonly FreeRoamBeacon[] = [
  // 1. Central Garage (Center of Map x ≈ 0, z ≈ 0)
  {
    id: 'central-garage',
    type: 'garage',
    title: 'CENTRAL GARAGE',
    subtitle: 'WORKSHOP & TUNING FACILITY',
    x: 0,
    z: 0,
    radius: 9.0,
    color: '#FF9900',
  },
  // 2. Car Lot / Dealership (Major Avenue x ≈ 80, z ≈ -40)
  {
    id: 'car-lot',
    type: 'car_lot',
    title: 'APEX MOTOR DEALERSHIP',
    subtitle: 'CAR LOT & EXOTIC VEHICLES',
    x: 80,
    z: -40,
    radius: 9.0,
    color: '#00B0FF',
  },
  // 3. Act 1 Street Races
  {
    id: 'beacon-act1-r1',
    type: 'race',
    trackId: 'act1-r1',
    title: 'DOWNTOWN SPRINT',
    subtitle: 'ACT I // HIGH SPEED GRID',
    x: -80,
    z: 70,
    radius: 8.0,
    color: '#FF9900',
    act: 1,
    reward: 1200,
    isBoss: false,
  },
  {
    id: 'beacon-act1-r2',
    type: 'race',
    trackId: 'act1-r2',
    title: 'INDUSTRIAL DOCKS DRAG',
    subtitle: 'ACT I // HARBOR INDUSTRIAL SWEEP',
    x: 160,
    z: 120,
    radius: 8.0,
    color: '#FF9900',
    act: 1,
    reward: 1800,
    isBoss: false,
  },
  {
    id: 'beacon-act1-r3',
    type: 'race',
    trackId: 'act1-r3',
    title: 'WATERFRONT CANAL CIRCUIT',
    subtitle: 'ACT I // 2-LAP TECHNICAL CIRCUIT',
    x: -160,
    z: -110,
    radius: 8.0,
    color: '#FF9900',
    act: 1,
    reward: 2500,
    isBoss: false,
  },
  {
    id: 'beacon-act1-boss',
    type: 'race',
    trackId: 'act1-boss',
    title: 'RAZOR CLASH (BOSS 1)',
    subtitle: 'ACT I FINALE // HIGH ROLLER PLAZA',
    x: -90,
    z: -170,
    radius: 8.5,
    color: '#DC2626',
    act: 1,
    reward: 5000,
    isBoss: true,
  },
  // 4. Act 2 Street Races
  {
    id: 'beacon-act2-r1',
    type: 'race',
    trackId: 'act2-r1',
    title: 'NEON STRIP BOULEVARD',
    subtitle: 'ACT II // MIDNIGHT HIGHWAY',
    x: 0,
    z: 170,
    radius: 8.0,
    color: '#FACC15',
    act: 2,
    reward: 4000,
    isBoss: false,
  },
  {
    id: 'beacon-act2-r2',
    type: 'race',
    trackId: 'act2-r2',
    title: 'HIGHLAND RIDGE DASH',
    subtitle: 'ACT II // ELEVATED EXPRESSWAY',
    x: 170,
    z: -150,
    radius: 8.0,
    color: '#FACC15',
    act: 2,
    reward: 6000,
    isBoss: false,
  },
  {
    id: 'beacon-act2-r3',
    type: 'race',
    trackId: 'act2-r3',
    title: 'MIDNIGHT PERIMETER RUN',
    subtitle: 'ACT II // OUTER RING ENDURANCE',
    x: -190,
    z: 40,
    radius: 8.0,
    color: '#FACC15',
    act: 2,
    reward: 8500,
    isBoss: false,
  },
  {
    id: 'beacon-act2-boss',
    type: 'race',
    trackId: 'act2-boss',
    title: 'BULL TITAN DUEL (FINAL BOSS)',
    subtitle: 'CAREER CLIMAX // APEX CITADEL',
    x: 0,
    z: -220,
    radius: 9.0,
    color: '#DC2626',
    act: 2,
    reward: 20000,
    isBoss: true,
  },
] as const;

export interface CityBuilding {
  id: string;
  x: number;
  z: number;
  w: number;
  d: number;
  h: number;
  type: 'skyscraper' | 'office' | 'residential' | 'warehouse' | 'garage_hq' | 'dealership_hq';
  color: string;
  accentColor: string;
  roofColor: string;
}

// Interconnected City Blocks (avenues at x = 0, ±80, ±160, ±230; z = 0, ±80, ±160, ±230)
// Buildings sit safely inside blocks between streets so streets remain wide and driveable
export const CITY_BUILDINGS: CityBuilding[] = [
  // Landmark 1: Central Garage Building (x ≈ 0, z ≈ 0, sits behind the front trigger zone)
  {
    id: 'bld-garage-hq',
    x: 0,
    z: -16,
    w: 26,
    d: 18,
    h: 8.5,
    type: 'garage_hq',
    color: '#1a1d24',
    accentColor: '#FF9900',
    roofColor: '#121418',
  },

  // Landmark 2: Car Lot Dealership Showroom & Glass Pavilion
  {
    id: 'bld-dealership-hq',
    x: 80,
    z: -56,
    w: 28,
    d: 20,
    h: 9.0,
    type: 'dealership_hq',
    color: '#18202e',
    accentColor: '#00B0FF',
    roofColor: '#0f141c',
  },

  // District 1: Downtown Financial Core (North-West: x in [-140, -20], z in [20, 140])
  { id: 'bld-dt-1', x: -42, z: 42, w: 22, d: 20, h: 48, type: 'skyscraper', color: '#181b22', accentColor: '#38bdf8', roofColor: '#0f1115' },
  { id: 'bld-dt-2', x: -42, z: 120, w: 24, d: 22, h: 56, type: 'skyscraper', color: '#161920', accentColor: '#FF9900', roofColor: '#0d0f13' },
  { id: 'bld-dt-3', x: -120, z: 42, w: 26, d: 24, h: 42, type: 'skyscraper', color: '#1c1e26', accentColor: '#a855f7', roofColor: '#111318' },
  { id: 'bld-dt-4', x: -120, z: 120, w: 22, d: 24, h: 64, type: 'skyscraper', color: '#14171e', accentColor: '#38bdf8', roofColor: '#0a0c10' },
  { id: 'bld-dt-5', x: -75, z: 120, w: 18, d: 22, h: 36, type: 'office', color: '#222630', accentColor: '#fbbf24', roofColor: '#161820' },
  { id: 'bld-dt-6', x: -120, z: 80, w: 22, d: 18, h: 32, type: 'office', color: '#1f232c', accentColor: '#38bdf8', roofColor: '#13151b' },

  // District 2: Commercial & Plaza District (South-West: x in [-140, -20], z in [-140, -20])
  { id: 'bld-cw-1', x: -42, z: -45, w: 22, d: 24, h: 28, type: 'office', color: '#20242e', accentColor: '#34d399', roofColor: '#14171d' },
  { id: 'bld-cw-2', x: -42, z: -120, w: 26, d: 22, h: 34, type: 'office', color: '#1d212b', accentColor: '#FF9900', roofColor: '#12151c' },
  { id: 'bld-cw-3', x: -120, z: -45, w: 24, d: 24, h: 38, type: 'skyscraper', color: '#1a1d26', accentColor: '#f43f5e', roofColor: '#101218' },
  { id: 'bld-cw-4', x: -120, z: -120, w: 26, d: 26, h: 44, type: 'skyscraper', color: '#171a22', accentColor: '#00B0FF', roofColor: '#0e1015' },
  { id: 'bld-cw-5', x: -75, z: -45, w: 20, d: 20, h: 22, type: 'office', color: '#242834', accentColor: '#fbbf24', roofColor: '#171a22' },

  // District 3: Industrial Warehouses & Logistics (North-East: x in [20, 140], z in [20, 140])
  { id: 'bld-ind-1', x: 42, z: 45, w: 26, d: 24, h: 12, type: 'warehouse', color: '#262930', accentColor: '#f97316', roofColor: '#191b20' },
  { id: 'bld-ind-2', x: 42, z: 120, w: 24, d: 26, h: 14, type: 'warehouse', color: '#282b33', accentColor: '#eab308', roofColor: '#1b1d22' },
  { id: 'bld-ind-3', x: 120, z: 45, w: 28, d: 26, h: 11, type: 'warehouse', color: '#24272e', accentColor: '#3b82f6', roofColor: '#181a1f' },
  { id: 'bld-ind-4', x: 120, z: 120, w: 30, d: 28, h: 15, type: 'warehouse', color: '#22252c', accentColor: '#ef4444', roofColor: '#16181e' },
  { id: 'bld-ind-5', x: 80, z: 120, w: 22, d: 22, h: 13, type: 'warehouse', color: '#272a32', accentColor: '#f97316', roofColor: '#1a1c21' },
  { id: 'bld-ind-6', x: 120, z: 80, w: 26, d: 20, h: 12, type: 'warehouse', color: '#252830', accentColor: '#10b981', roofColor: '#181a1f' },

  // District 4: Residential Townhomes & Suburbs (South-East: x in [20, 140], z in [-140, -20])
  { id: 'bld-res-1', x: 42, z: -45, w: 18, d: 18, h: 8.5, type: 'residential', color: '#32363f', accentColor: '#38bdf8', roofColor: '#1f2228' },
  { id: 'bld-res-2', x: 42, z: -120, w: 18, d: 18, h: 8.5, type: 'residential', color: '#353a44', accentColor: '#facc15', roofColor: '#21242b' },
  { id: 'bld-res-3', x: 120, z: -45, w: 18, d: 18, h: 8.5, type: 'residential', color: '#2e323b', accentColor: '#f43f5e', roofColor: '#1d2025' },
  { id: 'bld-res-4', x: 120, z: -120, w: 20, d: 20, h: 9.0, type: 'residential', color: '#333842', accentColor: '#10b981', roofColor: '#20232a' },
  { id: 'bld-res-5', x: 80, z: -120, w: 22, d: 18, h: 8.5, type: 'residential', color: '#363b46', accentColor: '#a855f7', roofColor: '#22262d' },

  // Outer Perimeter Highway Towers & Facilities (x ≈ ±200, z ≈ ±200)
  { id: 'bld-perim-1', x: -200, z: -200, w: 32, d: 32, h: 52, type: 'skyscraper', color: '#151820', accentColor: '#FF9900', roofColor: '#0d0f14' },
  { id: 'bld-perim-2', x: 200, z: -200, w: 30, d: 30, h: 46, type: 'skyscraper', color: '#161921', accentColor: '#00B0FF', roofColor: '#0e1015' },
  { id: 'bld-perim-3', x: -200, z: 200, w: 32, d: 30, h: 42, type: 'skyscraper', color: '#171a22', accentColor: '#f43f5e', roofColor: '#0f1116' },
  { id: 'bld-perim-4', x: 200, z: 200, w: 34, d: 34, h: 16, type: 'warehouse', color: '#262931', accentColor: '#eab308', roofColor: '#191b21' },

  { id: 'bld-perim-5', x: 0, z: -250, w: 36, d: 24, h: 62, type: 'skyscraper', color: '#12141a', accentColor: '#dc2626', roofColor: '#090a0d' },
  { id: 'bld-perim-6', x: 0, z: 240, w: 32, d: 22, h: 36, type: 'office', color: '#1e212a', accentColor: '#facc15', roofColor: '#13151b' },
  { id: 'bld-perim-7', x: -240, z: 0, w: 24, d: 32, h: 40, type: 'office', color: '#1c1f27', accentColor: '#38bdf8', roofColor: '#12141a' },
  { id: 'bld-perim-8', x: 240, z: 0, w: 24, d: 32, h: 38, type: 'office', color: '#1d2028', accentColor: '#FF9900', roofColor: '#12141a' },

  // Mid-outer infill blocks
  { id: 'bld-perim-9', x: -200, z: -90, w: 26, d: 24, h: 26, type: 'office', color: '#20242e', accentColor: '#34d399', roofColor: '#14171d' },
  { id: 'bld-perim-10', x: -200, z: 90, w: 26, d: 24, h: 30, type: 'office', color: '#1e222b', accentColor: '#a855f7', roofColor: '#13151b' },
  { id: 'bld-perim-11', x: 200, z: -90, w: 26, d: 24, h: 14, type: 'warehouse', color: '#272a32', accentColor: '#f97316', roofColor: '#1a1c21' },
  { id: 'bld-perim-12', x: 200, z: 90, w: 26, d: 24, h: 15, type: 'warehouse', color: '#252830', accentColor: '#3b82f6', roofColor: '#181a1f' },
];

export interface StreetLight {
  x: number;
  z: number;
  yaw: number;
}

// Street lights along avenues
export const STREET_LIGHTS: StreetLight[] = [
  // North-South Central Spine (x = ±9 along Broadway)
  ...[-220, -180, -140, -100, -60, -20, 20, 60, 100, 140, 180, 220].flatMap((z) => [
    { x: -9, z, yaw: Math.PI / 2 },
    { x: 9, z, yaw: -Math.PI / 2 },
  ]),
  // East-West Cross Boulevard (z = ±9 along Cross Blvd)
  ...[-220, -180, -140, -100, -60, -20, 20, 60, 100, 140, 180, 220].flatMap((x) => [
    { x, z: -9, yaw: 0 },
    { x, z: 9, yaw: Math.PI },
  ]),
  // Outer Highway lights
  ...[-220, -140, -60, 20, 100, 180].flatMap((coord) => [
    { x: -230, z: coord, yaw: Math.PI / 2 },
    { x: 230, z: coord, yaw: -Math.PI / 2 },
    { x: coord, z: -230, yaw: 0 },
    { x: coord, z: 230, yaw: Math.PI },
  ]),
];

// Display vehicles parked at the Car Lot showroom
export interface DisplayCar {
  modelId: 'tuner' | 'supercar';
  name: string;
  price: number;
  x: number;
  z: number;
  yaw: number;
  color: string;
  wheelsColor: string;
}

export const SHOWROOM_DISPLAY_CARS: readonly DisplayCar[] = [
  {
    modelId: 'tuner',
    name: 'Shinobi R-Spec',
    price: 7500,
    x: 74,
    z: -32,
    yaw: 0.35,
    color: '#00B0FF',
    wheelsColor: '#f4f4f5',
  },
  {
    modelId: 'supercar',
    name: 'Dominator Venom V10',
    price: 16000,
    x: 86,
    z: -32,
    yaw: -0.35,
    color: '#FF9900',
    wheelsColor: '#18181b',
  },
] as const;

// Legacy obstacle & pylon compatibility for telemetry/freeRoam
export interface WorldObstacle {
  x: number;
  z: number;
  size: [number, number, number];
  color: string;
}

export const FREE_ROAM_OBSTACLES: WorldObstacle[] = Array.from({ length: 24 }).map((_, i) => {
  const angle = i * 2.39996;
  const dist = 32 + (i % 6) * 22;
  const x = Math.cos(angle) * dist;
  const z = Math.sin(angle) * dist - 30;
  const w = 3.5 + (i % 3) * 1.5;
  return {
    x,
    z,
    size: [w, 3 + (i % 2) * 2, w],
    color: i % 3 === 0 ? '#f97316' : i % 3 === 1 ? '#00B0FF' : '#64748b',
  };
});

export interface SlalomPylon {
  x: number;
  z: number;
}

export const FREE_ROAM_PYLONS: SlalomPylon[] = Array.from({ length: 12 }).map((_, i) => ({
  x: i % 2 === 0 ? -5 : 5,
  z: -20 - i * 18,
}));

export interface CarTelemetry {
  x: number;
  y: number;
  z: number;
  fx: number;
  fz: number;
  headingRad: number;
  speedKph: number;
  forwardSpeed: number;
  isBraking: boolean;
  isDrifting: boolean;
  gear: string;
  rpmRatio: number;
  zeroToSixtySplitSec: number | null;
}

export const carTelemetry: CarTelemetry = {
  x: 0,
  y: 0,
  z: 0,
  fx: 0,
  fz: -1,
  headingRad: 0,
  speedKph: 0,
  forwardSpeed: 0,
  isBraking: false,
  isDrifting: false,
  gear: 'N',
  rpmRatio: 0.12,
  zeroToSixtySplitSec: null,
};

export function resetCarTelemetry() {
  carTelemetry.x = 0;
  carTelemetry.y = 0;
  carTelemetry.z = 0;
  carTelemetry.fx = 0;
  carTelemetry.fz = -1;
  carTelemetry.headingRad = 0;
  carTelemetry.speedKph = 0;
  carTelemetry.forwardSpeed = 0;
  carTelemetry.isBraking = false;
  carTelemetry.isDrifting = false;
  carTelemetry.gear = 'N';
  carTelemetry.rpmRatio = 0.12;
  carTelemetry.zeroToSixtySplitSec = null;
}

export interface BotLiveTelemetry {
  id: string;
  name: string;
  color: string;
  x: number;
  z: number;
  headingRad: number;
  speedKph: number;
  vx: number;
  vz: number;
  bumpOffset: number;
  bumpVel: number;
  speedRecoil: number;
  lap: number;
  progressMeters: number;
  finished: boolean;
}

export interface RaceLiveTelemetry {
  playerLap: number;
  totalLaps: number;
  playerProgressMeters: number;
  totalRaceMeters: number;
  placement: number;
  activeBotCount: number;
  bots: [BotLiveTelemetry, BotLiveTelemetry];
}

export const raceTelemetry: RaceLiveTelemetry = {
  playerLap: 1,
  totalLaps: 1,
  playerProgressMeters: 0,
  totalRaceMeters: 500,
  placement: 3,
  activeBotCount: 2,
  bots: [
    {
      id: 'ai-1',
      name: 'Cobalt Apex',
      color: '#2563eb',
      x: -2.8,
      z: -6,
      headingRad: 0,
      speedKph: 0,
      vx: 0,
      vz: 0,
      bumpOffset: 0,
      bumpVel: 0,
      speedRecoil: 0,
      lap: 1,
      progressMeters: 6,
      finished: false,
    },
    {
      id: 'ai-2',
      name: 'Emerald GT',
      color: '#059669',
      x: 2.8,
      z: -11,
      headingRad: 0,
      speedKph: 0,
      vx: 0,
      vz: 0,
      bumpOffset: 0,
      bumpVel: 0,
      speedRecoil: 0,
      lap: 1,
      progressMeters: 11,
      finished: false,
    },
  ],
};

export function resetRaceTelemetry(
  totalLaps = 1,
  totalRaceMeters = 500,
  isBoss = false,
  bossName = 'Boss Rival',
  bossColor = '#ef4444',
) {
  raceTelemetry.playerLap = 1;
  raceTelemetry.totalLaps = totalLaps;
  raceTelemetry.playerProgressMeters = 0;
  raceTelemetry.totalRaceMeters = totalRaceMeters;
  raceTelemetry.activeBotCount = isBoss ? 1 : 2;
  raceTelemetry.placement = isBoss ? 2 : 3;

  raceTelemetry.bots[0].name = isBoss ? bossName : 'Cobalt Apex';
  raceTelemetry.bots[0].color = isBoss ? bossColor : '#2563eb';
  raceTelemetry.bots[0].x = -2.8;
  raceTelemetry.bots[0].z = -6;
  raceTelemetry.bots[0].headingRad = 0;
  raceTelemetry.bots[0].speedKph = 0;
  raceTelemetry.bots[0].vx = 0;
  raceTelemetry.bots[0].vz = 0;
  raceTelemetry.bots[0].bumpOffset = 0;
  raceTelemetry.bots[0].bumpVel = 0;
  raceTelemetry.bots[0].speedRecoil = 0;
  raceTelemetry.bots[0].lap = 1;
  raceTelemetry.bots[0].progressMeters = 6.5;
  raceTelemetry.bots[0].finished = false;

  raceTelemetry.bots[1].name = 'Emerald GT';
  raceTelemetry.bots[1].color = '#059669';
  raceTelemetry.bots[1].x = 2.8;
  raceTelemetry.bots[1].z = -11;
  raceTelemetry.bots[1].headingRad = 0;
  raceTelemetry.bots[1].speedKph = 0;
  raceTelemetry.bots[1].vx = 0;
  raceTelemetry.bots[1].vz = 0;
  raceTelemetry.bots[1].bumpOffset = 0;
  raceTelemetry.bots[1].bumpVel = 0;
  raceTelemetry.bots[1].speedRecoil = 0;
  raceTelemetry.bots[1].lap = 1;
  raceTelemetry.bots[1].progressMeters = isBoss ? -9999 : 12;
  raceTelemetry.bots[1].finished = isBoss;
}
