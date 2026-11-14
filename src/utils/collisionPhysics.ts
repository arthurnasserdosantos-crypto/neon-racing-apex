import { CITY_BUILDINGS, FREE_ROAM_BOUNDS, FREE_ROAM_OBSTACLES } from './freeRoamWorld';
import { BuiltRaceTrack } from './raceTracks';

export interface OBB2D {
  cx: number;
  cz: number;
  /** Local +X (right) unit axis in XZ plane */
  ux: number;
  uz: number;
  /** Local -Z (forward) unit axis in XZ plane */
  fx: number;
  fz: number;
  halfW: number;
  halfL: number;
}

export interface ObbHitResult {
  hit: boolean;
  /** Minimum Translation Vector normal pushing OBB A out of OBB B */
  nx: number;
  nz: number;
  depth: number;
  /** Exact 2D hull contact point in XZ plane */
  contactX: number;
  contactZ: number;
}

const _hitOut: ObbHitResult = {
  hit: false,
  nx: 0,
  nz: 0,
  depth: 0,
  contactX: 0,
  contactZ: 0,
};

function testAxis(
  ax: number,
  az: number,
  dx: number,
  dz: number,
  a: OBB2D,
  b: OBB2D,
  best: { depth: number; nx: number; nz: number },
): boolean {
  const dist = dx * ax + dz * az;
  const rA =
    a.halfW * Math.abs(a.ux * ax + a.uz * az) + a.halfL * Math.abs(a.fx * ax + a.fz * az);
  const rB =
    b.halfW * Math.abs(b.ux * ax + b.uz * az) + b.halfL * Math.abs(b.fx * ax + b.fz * az);

  const overlap = rA + rB - Math.abs(dist);
  if (overlap <= 0) return false;

  if (overlap < best.depth) {
    best.depth = overlap;
    const sign = dist >= 0 ? 1 : -1;
    best.nx = ax * sign;
    best.nz = az * sign;
  }
  return true;
}

const _best = { depth: Infinity, nx: 0, nz: 0 };

/**
 * Exact 2D Oriented Bounding Box SAT intersection test (zero heap allocations).
 * Returns shared scratch result `_hitOut`; consume values immediately before next call.
 */
export function testObbOverlap(a: OBB2D, b: OBB2D): ObbHitResult {
  const dx = a.cx - b.cx;
  const dz = a.cz - b.cz;

  // Quick bounding circle reject
  const maxR =
    Math.hypot(a.halfW, a.halfL) + Math.hypot(b.halfW, b.halfL) + 0.05;
  if (dx * dx + dz * dz > maxR * maxR) {
    _hitOut.hit = false;
    return _hitOut;
  }

  _best.depth = Infinity;
  _best.nx = 0;
  _best.nz = 0;

  if (!testAxis(a.ux, a.uz, dx, dz, a, b, _best)) {
    _hitOut.hit = false;
    return _hitOut;
  }
  if (!testAxis(a.fx, a.fz, dx, dz, a, b, _best)) {
    _hitOut.hit = false;
    return _hitOut;
  }
  if (!testAxis(b.ux, b.uz, dx, dz, a, b, _best)) {
    _hitOut.hit = false;
    return _hitOut;
  }
  if (!testAxis(b.fx, b.fz, dx, dz, a, b, _best)) {
    _hitOut.hit = false;
    return _hitOut;
  }

  // Exact contact point on the overlapping hull boundary between A and B:
  // Project A's center clamped onto B's hull + project B's center clamped onto A's hull, then average.
  const bLocalU = Math.max(-b.halfW, Math.min(b.halfW, dx * b.ux + dz * b.uz));
  const bLocalF = Math.max(-b.halfL, Math.min(b.halfL, dx * b.fx + dz * b.fz));
  const pOnBx = b.cx + b.ux * bLocalU + b.fx * bLocalF;
  const pOnBz = b.cz + b.uz * bLocalU + b.fz * bLocalF;

  const aLocalU = Math.max(-a.halfW, Math.min(a.halfW, -dx * a.ux - dz * a.uz));
  const aLocalF = Math.max(-a.halfL, Math.min(a.halfL, -dx * a.fx - dz * a.fz));
  const pOnAx = a.cx + a.ux * aLocalU + a.fx * aLocalF;
  const pOnAz = a.cz + a.uz * aLocalU + a.fz * aLocalF;

  _hitOut.hit = true;
  _hitOut.nx = _best.nx;
  _hitOut.nz = _best.nz;
  _hitOut.depth = _best.depth;
  _hitOut.contactX = (pOnAx + pOnBx) * 0.5;
  _hitOut.contactZ = (pOnAz + pOnBz) * 0.5;
  return _hitOut;
}

export function buildVehicleObb(
  cx: number,
  cz: number,
  fx: number,
  fz: number,
  out: OBB2D,
  halfW = 0.98,
  halfL = 2.22,
) {
  const len = Math.hypot(fx, fz) || 1;
  const nfx = fx / len;
  const nfz = fz / len;
  // Local +X right vector for forward = (fx, fz): (-fz, fx)
  out.cx = cx;
  out.cz = cz;
  out.fx = nfx;
  out.fz = nfz;
  out.ux = -nfz;
  out.uz = nfx;
  out.halfW = halfW;
  out.halfL = halfL;
}

// --- Cached Static Wall / Barrier / Obstacle OBBs ---

export interface TrackBarrierCache {
  segments: OBB2D[];
  segCount: number;
}

const TRACK_BARRIER_CACHE = new Map<string, TrackBarrierCache>();

export function getTrackBarrierObbs(track: BuiltRaceTrack): TrackBarrierCache {
  const cached = TRACK_BARRIER_CACHE.get(track.id);
  if (cached) return cached;

  const segCount = 80;
  const step = track.samples.length / segCount;
  const wallOffset = track.roadWidth / 2 + 1.05;
  const segLen = (track.totalLength / segCount) * 1.04;
  const segments: OBB2D[] = [];

  for (let i = 0; i < segCount; i++) {
    const idxA = Math.floor(i * step) % track.samples.length;
    const idxB = Math.floor((i + 1) * step) % track.samples.length;
    const sA = track.samples[idxA];
    const sB = track.samples[idxB];

    const midX = (sA.pos.x + sB.pos.x) / 2;
    const midZ = (sA.pos.z + sB.pos.z) / 2;
    const dx = sB.pos.x - sA.pos.x;
    const dz = sB.pos.z - sA.pos.z;
    const yaw = Math.atan2(-dx, -dz);

    const fx = -Math.sin(yaw);
    const fz = -Math.cos(yaw);
    const ux = -fz;
    const uz = fx;

    const rx = (sA.right.x + sB.right.x) / 2;
    const rz = (sA.right.z + sB.right.z) / 2;
    const rLen = Math.hypot(rx, rz) || 1;
    const nrx = rx / rLen;
    const nrz = rz / rLen;

    segments.push({
      cx: midX - nrx * wallOffset,
      cz: midZ - nrz * wallOffset,
      ux,
      uz,
      fx,
      fz,
      halfW: 0.375,
      halfL: segLen * 0.5,
    });
    segments.push({
      cx: midX + nrx * wallOffset,
      cz: midZ + nrz * wallOffset,
      ux,
      uz,
      fx,
      fz,
      halfW: 0.375,
      halfL: segLen * 0.5,
    });
  }

  const cache: TrackBarrierCache = { segments, segCount };
  TRACK_BARRIER_CACHE.set(track.id, cache);
  return cache;
}

let FREE_ROAM_OBB_CACHE: OBB2D[] | null = null;

export function getFreeRoamObstacleObbs(): OBB2D[] {
  if (FREE_ROAM_OBB_CACHE) return FREE_ROAM_OBB_CACHE;

  const list: OBB2D[] = [];

  // 1. City Buildings and Landmarks
  for (const bld of CITY_BUILDINGS) {
    list.push({
      cx: bld.x,
      cz: bld.z,
      ux: 1,
      uz: 0,
      fx: 0,
      fz: -1,
      halfW: bld.w * 0.5,
      halfL: bld.d * 0.5,
    });
  }

  // 2. Secondary Plaza obstacles
  for (const obs of FREE_ROAM_OBSTACLES) {
    list.push({
      cx: obs.x,
      cz: obs.z,
      ux: 1,
      uz: 0,
      fx: 0,
      fz: -1,
      halfW: obs.size[0] * 0.5,
      halfL: obs.size[2] * 0.5,
    });
  }

  // 3. Outer 2x perimeter highway walls (width=560, depth=560)
  list.push(
    {
      cx: FREE_ROAM_BOUNDS.centerX,
      cz: FREE_ROAM_BOUNDS.minZ,
      ux: 1,
      uz: 0,
      fx: 0,
      fz: -1,
      halfW: FREE_ROAM_BOUNDS.width * 0.5,
      halfL: 2.0,
    },
    {
      cx: FREE_ROAM_BOUNDS.centerX,
      cz: FREE_ROAM_BOUNDS.maxZ,
      ux: 1,
      uz: 0,
      fx: 0,
      fz: -1,
      halfW: FREE_ROAM_BOUNDS.width * 0.5,
      halfL: 2.0,
    },
    {
      cx: FREE_ROAM_BOUNDS.minX,
      cz: FREE_ROAM_BOUNDS.centerZ,
      ux: 1,
      uz: 0,
      fx: 0,
      fz: -1,
      halfW: 2.0,
      halfL: FREE_ROAM_BOUNDS.depth * 0.5,
    },
    {
      cx: FREE_ROAM_BOUNDS.maxX,
      cz: FREE_ROAM_BOUNDS.centerZ,
      ux: 1,
      uz: 0,
      fx: 0,
      fz: -1,
      halfW: 2.0,
      halfL: FREE_ROAM_BOUNDS.depth * 0.5,
    },
  );

  FREE_ROAM_OBB_CACHE = list;
  return list;
}

/**
 * Slides velocity smoothly along a wall surface normal `(nx, nz)` and reduces
 * tangential momentum proportionally to impact angle (hard head-on slows down;
 * shallow scrapes preserve almost all speed).
 */
export function applyWallSlideVelocity(
  vx: number,
  vz: number,
  nx: number,
  nz: number,
  out: { vx: number; vz: number },
) {
  const vn = vx * nx + vz * nz;
  if (vn >= 0) {
    out.vx = vx;
    out.vz = vz;
    return;
  }

  // Wall tangent perpendicular to surface normal
  const tx = -nz;
  const tz = nx;
  const vt = vx * tx + vz * tz;

  const speed = Math.hypot(vx, vz);
  const impactSin = speed > 0.4 ? Math.min(1, Math.abs(vn) / speed) : 1;

  // Head-on impact (impactSin ~ 1) slows strongly; shallow scrape (impactSin ~ 0.1) keeps momentum
  const tangentRetention = Math.max(0.28, 1 - 0.62 * impactSin);
  const bounceOut = Math.min(2.6, -vn * 0.2);

  const newVt = vt * tangentRetention;
  out.vx = tx * newVt + nx * bounceOut;
  out.vz = tz * newVt + nz * bounceOut;
}
