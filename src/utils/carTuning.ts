export const TARGET_ZERO_TO_SIXTY_KPH = 60;
export const TARGET_ZERO_TO_SIXTY_MS = TARGET_ZERO_TO_SIXTY_KPH / 3.6; // ~16.6667 m/s

export type CarModelId = 'starter' | 'tuner' | 'supercar';

export interface VehicleDefinition {
  id: CarModelId;
  name: string;
  tagline: string;
  category: string;
  price: number;
  description: string;
  defaultColor: string;
  defaultWheelsColor: string;
  defaultVinyl: 'none' | 'stripes' | 'flames';
  speedMult: number;
  accelMult: number;
  handlingMult: number;
  drivetrain: string;
  weightKg: number;
}

export const VEHICLE_CATALOG: readonly VehicleDefinition[] = [
  {
    id: 'starter',
    name: 'Apex Horizon GT',
    tagline: 'STREET REAR-DRIVE COUPE',
    category: 'Balanced Street Coupe',
    price: 0,
    description:
      'Balanced rear-wheel drive sports coupe. Versatile chassis, agile drift transitions, and the quintessential platform for street racers.',
    defaultColor: '#dc2626',
    defaultWheelsColor: '#27272a',
    defaultVinyl: 'none',
    speedMult: 1.0,
    accelMult: 1.0,
    handlingMult: 1.0,
    drivetrain: 'RWD / 6-Speed',
    weightKg: 1380,
  },
  {
    id: 'tuner',
    name: 'Shinobi R-Spec',
    tagline: 'HIGH-HANDLING TUNER COUPE',
    category: 'High-Handling Tuner',
    price: 7500,
    description:
      'Twin-turbo lightweight tuner engineered for razor-sharp apex carving. Outstanding lateral grip, tighter turn radius, and rapid boost spooling.',
    defaultColor: '#00B0FF',
    defaultWheelsColor: '#f4f4f5',
    defaultVinyl: 'stripes',
    speedMult: 0.98,
    accelMult: 0.85,
    handlingMult: 1.25,
    drivetrain: 'AWD / Sequential',
    weightKg: 1190,
  },
  {
    id: 'supercar',
    name: 'Dominator Venom V10',
    tagline: 'EXOTIC HIGH-SPEED SUPERCAR',
    category: 'High-Top-Speed Exotic',
    price: 16000,
    description:
      'Mid-engine V10 exotic monster built for pure high-speed intimidation. Massive straight-line thrust and towering top speed to dominate the perimeter highways.',
    defaultColor: '#FF9900',
    defaultWheelsColor: '#18181b',
    defaultVinyl: 'flames',
    speedMult: 1.22,
    accelMult: 0.82,
    handlingMult: 1.06,
    drivetrain: 'AWD / Dual-Clutch',
    weightKg: 1460,
  },
] as const;

export function getVehicleDefinition(id: string): VehicleDefinition {
  const found = VEHICLE_CATALOG.find((v) => v.id === id);
  return found || VEHICLE_CATALOG[0];
}

export interface EngineTierSpec {
  level: number;
  label: string;
  topSpeedKph: number;
}

export interface AccelTierSpec {
  level: number;
  label: string;
  zeroToSixtySec: number;
}

export interface HandlingTierSpec {
  level: number;
  label: string;
  maxTurnRate: number;
  lateralGrip: number;
  gripScore: number;
}

export const ENGINE_TIERS: readonly EngineTierSpec[] = [
  { level: 1, label: 'Street Spec', topSpeedKph: 100 },
  { level: 2, label: 'Sport Tune', topSpeedKph: 121 },
  { level: 3, label: 'Track Spec', topSpeedKph: 154 },
  { level: 4, label: 'Supercharged', topSpeedKph: 190 },
  { level: 5, label: 'Apex Hyper', topSpeedKph: 250 },
] as const;

export const ACCEL_TIERS: readonly AccelTierSpec[] = [
  { level: 1, label: '5-Speed Street', zeroToSixtySec: 2.0 },
  { level: 2, label: 'Close-Ratio Sport', zeroToSixtySec: 1.65 },
  { level: 3, label: 'Sequential Track', zeroToSixtySec: 1.3 },
  { level: 4, label: 'Dual-Clutch Pro', zeroToSixtySec: 1.05 },
  { level: 5, label: 'Launch-Control Spec', zeroToSixtySec: 0.8 },
] as const;

export const HANDLING_TIERS: readonly HandlingTierSpec[] = [
  { level: 1, label: 'Street Dampers', maxTurnRate: 2.35, lateralGrip: 10.4, gripScore: 60 },
  { level: 2, label: 'Sport Springs', maxTurnRate: 2.6, lateralGrip: 11.8, gripScore: 70 },
  { level: 3, label: 'Coilover Track', maxTurnRate: 2.85, lateralGrip: 13.2, gripScore: 80 },
  { level: 4, label: 'Aero Downforce', maxTurnRate: 3.1, lateralGrip: 14.6, gripScore: 90 },
  { level: 5, label: 'Active GT Chassis', maxTurnRate: 3.35, lateralGrip: 16.0, gripScore: 100 },
] as const;

function clampTierIndex(level: number): number {
  return Math.max(0, Math.min(4, Math.round(level) - 1));
}

export interface CarPerformanceSpecs {
  vehicleDef: VehicleDefinition;
  engineTier: EngineTierSpec;
  accelTier: AccelTierSpec;
  handlingTier: HandlingTierSpec;
  topSpeedKph: number;
  maxForwardSpeedMs: number;
  maxReverseSpeedMs: number;
  zeroToSixtySec: number;
  terminalSpeedMs: number;
  engineAccelMs2: number;
  throttleDragPerSec: number;
  maxTurnRate: number;
  lateralGrip: number;
  gripScore: number;
}

/**
 * Computes exact, framerate-independent physics constants from Garage upgrade tiers and vehicle definition.
 * Solving dv/dt = engineAccelMs2 - throttleDragPerSec * v from v(0)=0 gives
 * v(t) = terminalSpeedMs * (1 - exp(-throttleDragPerSec * t)), which hits
 * 60 km/h (16.6667 m/s) at precisely zeroToSixtySec and climbs smoothly to maxForwardSpeedMs.
 */
export function getCarPerformanceSpecs(
  car: {
    speedLevel: number;
    accelLevel: number;
    handlingLevel: number;
    modelId?: string;
  },
  modelIdOverride?: string,
): CarPerformanceSpecs {
  const modelId = modelIdOverride || car.modelId || 'starter';
  const vehicleDef = getVehicleDefinition(modelId);

  const engineTier = ENGINE_TIERS[clampTierIndex(car.speedLevel)];
  const accelTier = ACCEL_TIERS[clampTierIndex(car.accelLevel)];
  const handlingTier = HANDLING_TIERS[clampTierIndex(car.handlingLevel)];

  const topSpeedKph = Math.round(engineTier.topSpeedKph * vehicleDef.speedMult);
  const maxForwardSpeedMs = topSpeedKph / 3.6;
  const terminalSpeedMs = maxForwardSpeedMs * 1.15;
  const zeroToSixtySec = Number(
    Math.max(0.5, accelTier.zeroToSixtySec * vehicleDef.accelMult).toFixed(2),
  );

  const engineAccelMs2 =
    -(terminalSpeedMs / zeroToSixtySec) *
    Math.log(1 - TARGET_ZERO_TO_SIXTY_MS / terminalSpeedMs);
  const throttleDragPerSec = engineAccelMs2 / terminalSpeedMs;

  const maxTurnRate = Number((handlingTier.maxTurnRate * vehicleDef.handlingMult).toFixed(2));
  const lateralGrip = Number((handlingTier.lateralGrip * vehicleDef.handlingMult).toFixed(2));
  const gripScore = Math.min(100, Math.round(handlingTier.gripScore * vehicleDef.handlingMult));

  return {
    vehicleDef,
    engineTier,
    accelTier,
    handlingTier,
    topSpeedKph,
    maxForwardSpeedMs,
    maxReverseSpeedMs: 14,
    zeroToSixtySec,
    terminalSpeedMs,
    engineAccelMs2,
    throttleDragPerSec,
    maxTurnRate,
    lateralGrip,
    gripScore,
  };
}
