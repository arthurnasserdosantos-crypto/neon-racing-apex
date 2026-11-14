import * as THREE from 'three';

export interface TrackSample {
  index: number;
  s: number;
  pos: THREE.Vector3;
  tangent: THREE.Vector3;
  right: THREE.Vector3;
  curvature: number;
}

export interface BossProfile {
  name: string;
  title: string;
  bodyColor: string;
  accentColor: string;
  wheelsColor: string;
  underglowColor: string;
}

export interface RaceTrackDefinition {
  id: string;
  act: 1 | 2;
  raceNumber: number; // 1..4 for Act 1 standard, 5 for Boss 1; 5..9 for Act 2 standard, 10 for Final Boss
  order: number; // 1..11
  isBoss: boolean;
  isFinalBoss?: boolean;
  title: string;
  difficulty: 'Easy' | 'Medium' | 'Hard' | 'Pro' | 'Boss';
  laps: number;
  roadWidth: number;
  reward: number;
  aiSpeedsKph: [number, number]; // [Primary/Boss AI, Secondary AI]
  cornerSeverityLabel: string;
  description: string;
  bossProfile?: BossProfile;
  controlPoints: [number, number][];
}

export interface BuiltRaceTrack extends RaceTrackDefinition {
  samples: TrackSample[];
  totalLength: number;
  sampleStep: number;
  bounds: {
    minX: number;
    maxX: number;
    minZ: number;
    maxZ: number;
    width: number;
    depth: number;
    centerX: number;
    centerZ: number;
  };
}

export const ACT1_BOSS_ID = 'act1-boss';
export const FINAL_BOSS_ID = 'act2-boss';

export const RACE_TRACK_DEFINITIONS: readonly RaceTrackDefinition[] = [
  // ==================== ACT 1: RACES 1-4 + BOSS 1 ====================
  {
    id: 'act1-r1',
    act: 1,
    raceNumber: 1,
    order: 1,
    isBoss: false,
    title: 'Neon Oval Sprint',
    difficulty: 'Easy',
    laps: 1,
    roadWidth: 18,
    reward: 600,
    aiSpeedsKph: [88, 82],
    cornerSeverityLabel: 'Sweeping Bends',
    description: 'Opening Act 1 qualifier with wide sweeping turns and a flowing backstraight.',
    controlPoints: [
      [0, 22],
      [0, -48],
      [28, -96],
      [82, -96],
      [108, -50],
      [96, 6],
      [108, 56],
      [68, 92],
      [20, 78],
      [0, 50],
    ],
  },
  {
    id: 'act1-r2',
    act: 1,
    raceNumber: 2,
    order: 2,
    isBoss: false,
    title: 'Harbor S-Curves',
    difficulty: 'Easy',
    laps: 1,
    roadWidth: 18,
    reward: 950,
    aiSpeedsKph: [104, 97],
    cornerSeverityLabel: 'Flowing S-Bends',
    description: 'Coastal waterfront circuit featuring rhythmic left-right S-curves.',
    controlPoints: [
      [0, 22],
      [0, -48],
      [-36, -98],
      [-8, -150],
      [58, -158],
      [108, -112],
      [76, -54],
      [118, -2],
      [92, 68],
      [32, 84],
      [0, 54],
    ],
  },
  {
    id: 'act1-r3',
    act: 1,
    raceNumber: 3,
    order: 3,
    isBoss: false,
    title: 'Metro Twin-Apex',
    difficulty: 'Medium',
    laps: 2,
    roadWidth: 17,
    reward: 1400,
    aiSpeedsKph: [122, 114],
    cornerSeverityLabel: 'Double-Apex Corners',
    description: 'Two-lap downtown loop built around a sweeping northern double-apex sector.',
    controlPoints: [
      [0, 22],
      [0, -56],
      [-45, -104],
      [-30, -162],
      [42, -172],
      [104, -135],
      [96, -72],
      [135, -18],
      [100, 56],
      [38, 76],
      [0, 52],
    ],
  },
  {
    id: 'act1-r4',
    act: 1,
    raceNumber: 4,
    order: 4,
    isBoss: false,
    title: 'Canyon Switchbacks',
    difficulty: 'Medium',
    laps: 2,
    roadWidth: 16.5,
    reward: 2000,
    aiSpeedsKph: [142, 132],
    cornerSeverityLabel: 'Sharp Hairpins',
    description: 'Heavy braking into canyon switchbacks before returning down the main straight.',
    controlPoints: [
      [0, 22],
      [0, -52],
      [42, -88],
      [12, -138],
      [76, -172],
      [130, -136],
      [84, -80],
      [140, -42],
      [118, 28],
      [66, 8],
      [58, 78],
      [18, 88],
      [0, 52],
    ],
  },
  {
    id: ACT1_BOSS_ID,
    act: 1,
    raceNumber: 5,
    order: 5,
    isBoss: true,
    title: 'Obsidian Phantom Duel',
    difficulty: 'Boss',
    laps: 2,
    roadWidth: 16,
    reward: 3500,
    aiSpeedsKph: [168, 168],
    cornerSeverityLabel: 'Boss Technical Loop',
    description: '1v1 Act 1 Showdown against The Obsidian Phantom. Victory unlocks Act 2.',
    bossProfile: {
      name: 'Obsidian Phantom',
      title: 'Act 1 Syndicate Boss',
      bodyColor: '#09090b',
      accentColor: '#ef4444',
      wheelsColor: '#dc2626',
      underglowColor: '#ef4444',
    },
    controlPoints: [
      [0, 22],
      [0, -64],
      [-50, -108],
      [-92, -84],
      [-108, -144],
      [-48, -186],
      [36, -168],
      [98, -124],
      [68, -68],
      [114, -12],
      [88, 66],
      [30, 82],
      [0, 52],
    ],
  },

  // ==================== ACT 2: RACES 5-9 + FINAL BOSS ====================
  {
    id: 'act2-r5',
    act: 2,
    raceNumber: 5,
    order: 6,
    isBoss: false,
    title: 'Skyline Expressway',
    difficulty: 'Medium',
    laps: 2,
    roadWidth: 17,
    reward: 4200,
    aiSpeedsKph: [174, 164],
    cornerSeverityLabel: 'High-Speed Esses',
    description: 'Act 2 opener on wide elevated expressways with rapid high-speed directional changes.',
    controlPoints: [
      [0, 22],
      [0, -78],
      [48, -122],
      [120, -110],
      [148, -50],
      [98, 4],
      [144, 58],
      [92, 106],
      [30, 86],
      [0, 54],
    ],
  },
  {
    id: 'act2-r6',
    act: 2,
    raceNumber: 6,
    order: 7,
    isBoss: false,
    title: 'Industrial Hairpins',
    difficulty: 'Hard',
    laps: 2,
    roadWidth: 16,
    reward: 5200,
    aiSpeedsKph: [188, 178],
    cornerSeverityLabel: 'Twin 180° Hairpins',
    description: 'Tight industrial dock circuit punctuated by two heavy-braking 180-degree hairpins.',
    controlPoints: [
      [0, 22],
      [0, -60],
      [-46, -98],
      [-92, -62],
      [-126, -118],
      [-74, -178],
      [16, -162],
      [78, -116],
      [130, -142],
      [152, -76],
      [102, -16],
      [126, 48],
      [62, 88],
      [14, 68],
      [0, 50],
    ],
  },
  {
    id: 'act2-r7',
    act: 2,
    raceNumber: 7,
    order: 8,
    isBoss: false,
    title: 'Coastal Chicane Run',
    difficulty: 'Hard',
    laps: 2,
    roadWidth: 16,
    reward: 6500,
    aiSpeedsKph: [202, 190],
    cornerSeverityLabel: 'Fast Chicanes',
    description: 'High-commitment coastal highway broken by quick sequential braking chicanes.',
    controlPoints: [
      [0, 22],
      [0, -72],
      [-48, -124],
      [6, -172],
      [74, -142],
      [136, -174],
      [168, -108],
      [112, -58],
      [152, 14],
      [96, 76],
      [42, 42],
      [18, 88],
      [0, 54],
    ],
  },
  {
    id: 'act2-r8',
    act: 2,
    raceNumber: 8,
    order: 9,
    isBoss: false,
    title: 'Foundry Technical',
    difficulty: 'Pro',
    laps: 3,
    roadWidth: 15.5,
    reward: 8200,
    aiSpeedsKph: [214, 202],
    cornerSeverityLabel: 'Technical Complex',
    description: 'Three-lap endurance test through narrow curbs and relentless corner sequences.',
    controlPoints: [
      [0, 22],
      [0, -64],
      [48, -96],
      [20, -150],
      [-44, -140],
      [-78, -196],
      [14, -214],
      [98, -176],
      [142, -112],
      [92, -56],
      [144, 10],
      [112, 74],
      [50, 52],
      [26, 94],
      [0, 54],
    ],
  },
  {
    id: 'act2-r9',
    act: 2,
    raceNumber: 9,
    order: 10,
    isBoss: false,
    title: 'Apex Grand Prix',
    difficulty: 'Pro',
    laps: 3,
    roadWidth: 16,
    reward: 10500,
    aiSpeedsKph: [224, 212],
    cornerSeverityLabel: 'GP Esses + Hairpins',
    description: 'Final Act 2 qualifier before the title bout. Master every apex at 220+ KPH.',
    controlPoints: [
      [0, 22],
      [0, -68],
      [-48, -112],
      [-88, -86],
      [-114, -148],
      [-60, -198],
      [34, -192],
      [118, -152],
      [134, -84],
      [76, -52],
      [128, -2],
      [108, 70],
      [48, 48],
      [32, 92],
      [0, 54],
    ],
  },
  {
    id: FINAL_BOSS_ID,
    act: 2,
    raceNumber: 10,
    order: 11,
    isBoss: true,
    isFinalBoss: true,
    title: 'Sovereign Championship Finale',
    difficulty: 'Boss',
    laps: 3,
    roadWidth: 15.5,
    reward: 15000,
    aiSpeedsKph: [238, 238],
    cornerSeverityLabel: 'Final Boss Circuit',
    description: '1v1 Grand Finale against the Apex Sovereign for the Horizon Championship Crown.',
    bossProfile: {
      name: 'Apex Sovereign',
      title: 'Grand Champion Final Boss',
      bodyColor: '#eab308',
      accentColor: '#ffffff',
      wheelsColor: '#f8fafc',
      underglowColor: '#facc15',
    },
    controlPoints: [
      [0, 22],
      [0, -80],
      [-52, -124],
      [-104, -92],
      [-136, -156],
      [-72, -214],
      [24, -192],
      [96, -216],
      [158, -154],
      [112, -88],
      [156, -22],
      [122, 62],
      [62, 40],
      [34, 96],
      [0, 56],
    ],
  },
] as const;

export const ACT1_STANDARD_IDS = RACE_TRACK_DEFINITIONS.filter(
  (t) => t.act === 1 && !t.isBoss,
).map((t) => t.id);

export const ACT2_STANDARD_IDS = RACE_TRACK_DEFINITIONS.filter(
  (t) => t.act === 2 && !t.isBoss,
).map((t) => t.id);

export interface RaceCompletionRecord {
  bestTimeMs: number;
  bestPosition: number;
}

export interface ProgressionStatus {
  act1Wins: number;
  act1Total: number;
  boss1Unlocked: boolean;
  boss1Defeated: boolean;
  act2Unlocked: boolean;
  act2Wins: number;
  act2Total: number;
  finalBossUnlocked: boolean;
  finalBossDefeated: boolean;
}

export function getProgressionStatus(
  completedRaces: Record<string, RaceCompletionRecord>,
): ProgressionStatus {
  const isWon = (id: string) => completedRaces[id]?.bestPosition === 1;

  const act1Wins = ACT1_STANDARD_IDS.filter(isWon).length;
  const boss1Unlocked = act1Wins === ACT1_STANDARD_IDS.length;
  const boss1Defeated = isWon(ACT1_BOSS_ID);

  const act2Unlocked = boss1Defeated;
  const act2Wins = ACT2_STANDARD_IDS.filter(isWon).length;
  const finalBossUnlocked = act2Unlocked && act2Wins === ACT2_STANDARD_IDS.length;
  const finalBossDefeated = isWon(FINAL_BOSS_ID);

  return {
    act1Wins,
    act1Total: ACT1_STANDARD_IDS.length,
    boss1Unlocked,
    boss1Defeated,
    act2Unlocked,
    act2Wins,
    act2Total: ACT2_STANDARD_IDS.length,
    finalBossUnlocked,
    finalBossDefeated,
  };
}

export function isTrackUnlocked(
  trackId: string,
  completedRaces: Record<string, RaceCompletionRecord>,
): { unlocked: boolean; reason?: string } {
  const def = RACE_TRACK_DEFINITIONS.find((t) => t.id === trackId);
  if (!def) return { unlocked: false, reason: 'Unknown event' };

  const status = getProgressionStatus(completedRaces);

  if (def.act === 1) {
    if (!def.isBoss) return { unlocked: true };
    return status.boss1Unlocked
      ? { unlocked: true }
      : {
          unlocked: false,
          reason: `Win all ${status.act1Total} Act 1 races (${status.act1Wins}/${status.act1Total})`,
        };
  }

  // Act 2
  if (!status.act2Unlocked) {
    return { unlocked: false, reason: 'Defeat Boss 1 (Obsidian Phantom) to unlock Act 2' };
  }

  if (!def.isBoss) return { unlocked: true };

  return status.finalBossUnlocked
    ? { unlocked: true }
    : {
        unlocked: false,
        reason: `Win all ${status.act2Total} Act 2 races (${status.act2Wins}/${status.act2Total})`,
      };
}

const BUILT_TRACK_CACHE = new Map<string, BuiltRaceTrack>();

export function getBuiltRaceTrack(trackId: string): BuiltRaceTrack {
  const cached = BUILT_TRACK_CACHE.get(trackId);
  if (cached) return cached;

  const def =
    RACE_TRACK_DEFINITIONS.find((t) => t.id === trackId) ?? RACE_TRACK_DEFINITIONS[0];

  const vecPoints = def.controlPoints.map(([x, z]) => new THREE.Vector3(x, 0, z));
  const curve = new THREE.CatmullRomCurve3(vecPoints, true, 'centripetal', 0.5);

  const sampleCount = 240;
  const totalLength = curve.getLength();
  const sampleStep = totalLength / sampleCount;

  // Find parameter u closest to origin (0, 0, 0) so sample[0] aligns cleanly with car spawn
  let bestU = 0;
  let bestDistSq = Infinity;
  const probeSteps = 720;
  const tmp = new THREE.Vector3();
  for (let i = 0; i < probeSteps; i++) {
    const u = i / probeSteps;
    curve.getPointAt(u, tmp);
    const dSq = tmp.x * tmp.x + tmp.z * tmp.z;
    if (dSq < bestDistSq) {
      bestDistSq = dSq;
      bestU = u;
    }
  }

  const samples: TrackSample[] = [];
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;

  for (let i = 0; i < sampleCount; i++) {
    const u = (bestU + i / sampleCount) % 1;
    const pos = curve.getPointAt(u);
    pos.y = 0;
    const tangent = curve.getTangentAt(u);
    tangent.y = 0;
    if (tangent.lengthSq() > 1e-6) tangent.normalize();
    else tangent.set(0, 0, -1);

    const right = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();

    minX = Math.min(minX, pos.x);
    maxX = Math.max(maxX, pos.x);
    minZ = Math.min(minZ, pos.z);
    maxZ = Math.max(maxZ, pos.z);

    samples.push({
      index: i,
      s: i * sampleStep,
      pos,
      tangent,
      right,
      curvature: 0,
    });
  }

  // Compute smoothed local curvature (rad/m) across +/- 3 samples for AI braking accuracy
  for (let i = 0; i < sampleCount; i++) {
    const prev = samples[(i - 3 + sampleCount) % sampleCount];
    const next = samples[(i + 3) % sampleCount];
    const dot = THREE.MathUtils.clamp(prev.tangent.dot(next.tangent), -1, 1);
    const angle = Math.acos(dot);
    samples[i].curvature = angle / (6 * sampleStep);
  }

  const pad = def.roadWidth * 0.8;
  minX -= pad;
  maxX += pad;
  minZ -= pad;
  maxZ += pad;

  const built: BuiltRaceTrack = {
    ...def,
    samples,
    totalLength,
    sampleStep,
    bounds: {
      minX,
      maxX,
      minZ,
      maxZ,
      width: maxX - minX,
      depth: maxZ - minZ,
      centerX: (minX + maxX) / 2,
      centerZ: (minZ + maxZ) / 2,
    },
  };

  BUILT_TRACK_CACHE.set(trackId, built);
  return built;
}

export function findNearestTrackSample(
  track: BuiltRaceTrack,
  x: number,
  z: number,
  hintIndex?: number,
): number {
  const { samples } = track;
  const n = samples.length;

  if (hintIndex !== undefined && hintIndex >= 0 && hintIndex < n) {
    let bestIdx = hintIndex;
    let bestDistSq = Infinity;
    for (let offset = -18; offset <= 18; offset++) {
      const idx = (hintIndex + offset + n) % n;
      const dx = x - samples[idx].pos.x;
      const dz = z - samples[idx].pos.z;
      const dSq = dx * dx + dz * dz;
      if (dSq < bestDistSq) {
        bestDistSq = dSq;
        bestIdx = idx;
      }
    }
    if (bestDistSq < 900) return bestIdx;
  }

  let bestIdx = 0;
  let bestDistSq = Infinity;
  for (let i = 0; i < n; i++) {
    const dx = x - samples[i].pos.x;
    const dz = z - samples[i].pos.z;
    const dSq = dx * dx + dz * dz;
    if (dSq < bestDistSq) {
      bestDistSq = dSq;
      bestIdx = i;
    }
  }
  return bestIdx;
}

export function getScaledPayout(baseReward: number, placement: number): number {
  if (placement <= 1) return baseReward;
  if (placement === 2) return Math.round(baseReward * 0.7);
  return Math.round(baseReward * 0.5);
}

export function getQuickRaceTrackId(
  completedRaces: Record<string, RaceCompletionRecord>,
): string {
  const unlocked = RACE_TRACK_DEFINITIONS.filter(
    (t) => isTrackUnlocked(t.id, completedRaces).unlocked,
  );
  const nextUnwon = unlocked.find((t) => completedRaces[t.id]?.bestPosition !== 1);
  if (nextUnwon) return nextUnwon.id;
  return unlocked.length > 0 ? unlocked[unlocked.length - 1].id : RACE_TRACK_DEFINITIONS[0].id;
}

export function getBlacklistRankSummary(
  completedRaces: Record<string, RaceCompletionRecord>,
): {
  rankNumber: number;
  rankLabel: string;
  actLabel: string;
  totalWins: number;
  totalEvents: number;
} {
  const status = getProgressionStatus(completedRaces);
  const totalEvents = RACE_TRACK_DEFINITIONS.length;
  const totalWins = Object.values(completedRaces).filter((r) => r.bestPosition === 1).length;
  const rankNumber = Math.max(1, 12 - totalWins);

  const actLabel = status.finalBossDefeated
    ? 'CHAMPION'
    : status.act2Unlocked
    ? 'ACT II'
    : 'ACT I';

  const rankLabel = `RANK #${String(rankNumber).padStart(2, '0')} — ${actLabel}`;
  return {
    rankNumber,
    rankLabel,
    actLabel,
    totalWins,
    totalEvents,
  };
}

