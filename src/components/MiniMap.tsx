import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Compass, Maximize2, Minimize2 } from 'lucide-react';
import { useGameStore } from '../store';
import {
  CITY_BUILDINGS,
  FREE_ROAM_BEACONS,
  FREE_ROAM_BOUNDS,
  carTelemetry,
  raceTelemetry,
} from '../utils/freeRoamWorld';
import { getBuiltRaceTrack, isTrackUnlocked } from '../utils/raceTracks';

const MAP_SIZE = 196;

function getCompassCardinal(rad: number): string {
  const deg = (((rad * 180) / Math.PI) % 360 + 360) % 360;
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return dirs[Math.round(deg / 45) % 8];
}

export function MiniMap() {
  const view = useGameStore((s) => s.view);
  const activeTrackId = useGameStore((s) => s.activeTrackId);
  const carColor = useGameStore((s) => s.car.color);
  const completedRaces = useGameStore((s) => s.completedRaces);

  const [zoomMode, setZoomMode] = useState<'follow' | 'full'>(
    view === 'RACE' ? 'full' : 'follow',
  );
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const coordsRef = useRef<HTMLSpanElement | null>(null);
  const headingRef = useRef<HTMLSpanElement | null>(null);
  const trailRef = useRef<Array<{ x: number; z: number }>>([]);
  const carColorRef = useRef(carColor);

  const activeTrack = useMemo(
    () => (view === 'RACE' ? getBuiltRaceTrack(activeTrackId) : null),
    [view, activeTrackId],
  );

  useEffect(() => {
    carColorRef.current = carColor;
  }, [carColor]);

  // Default to full circuit view in RACE, follow radar in FREE_ROAM
  useEffect(() => {
    trailRef.current = [];
    setZoomMode(view === 'RACE' ? 'full' : 'follow');
  }, [view, activeTrackId]);

  // Press M to toggle Follow / Full overview
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'm' || e.key === 'M') {
        setZoomMode((prev) => (prev === 'follow' ? 'full' : 'follow'));
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = MAP_SIZE * dpr;
    canvas.height = MAP_SIZE * dpr;

    let rafId = 0;
    let lastTrailSampleTime = 0;
    let lastDomSync = 0;

    const renderFrame = (now: number) => {
      rafId = requestAnimationFrame(renderFrame);

      const { x, z, headingRad } = carTelemetry;

      if (view === 'FREE_ROAM' && now - lastTrailSampleTime > 80) {
        const trail = trailRef.current;
        const last = trail[trail.length - 1];
        if (!last || Math.hypot(x - last.x, z - last.z) >= 2.5) {
          trail.push({ x, z });
          if (trail.length > 90) trail.shift();
        }
        lastTrailSampleTime = now;
      }

      if (now - lastDomSync > 80) {
        if (coordsRef.current) {
          coordsRef.current.textContent = `${Math.round(x)}m, ${Math.round(-z)}m`;
        }
        if (headingRef.current) {
          headingRef.current.textContent = getCompassCardinal(headingRad);
        }
        lastDomSync = now;
      }

      ctx.save();
      ctx.scale(dpr, dpr);

      // Background
      ctx.fillStyle = '#090c12';
      ctx.fillRect(0, 0, MAP_SIZE, MAP_SIZE);

      const padding = 12;
      const drawSpan = MAP_SIZE - padding * 2;
      const activeBounds = activeTrack ? activeTrack.bounds : FREE_ROAM_BOUNDS;
      const fullWorldSpan = Math.max(activeBounds.width, activeBounds.depth);
      const worldSpan = zoomMode === 'full' ? fullWorldSpan : 160;
      const scale = drawSpan / worldSpan;

      const viewCenterX = zoomMode === 'full' ? activeBounds.centerX : x;
      const viewCenterZ = zoomMode === 'full' ? activeBounds.centerZ : z;

      const toPxX = (wx: number) => MAP_SIZE / 2 + (wx - viewCenterX) * scale;
      const toPxY = (wz: number) => MAP_SIZE / 2 + (wz - viewCenterZ) * scale;

      if (view === 'RACE' && activeTrack) {
        // Custom closed-circuit track ribbon outline
        const { samples } = activeTrack;
        ctx.beginPath();
        for (let i = 0; i < samples.length; i++) {
          const px = toPxX(samples[i].pos.x);
          const py = toPxY(samples[i].pos.z);
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = Math.max(5, activeTrack.roadWidth * scale);
        ctx.lineJoin = 'round';
        ctx.stroke();

        ctx.strokeStyle = 'rgba(249, 115, 22, 0.5)';
        ctx.lineWidth = 1.4;
        ctx.stroke();

        // Start/Finish marker perpendicular bar
        const s0 = samples[0];
        const halfW = activeTrack.roadWidth * 0.55 * scale;
        const sx = toPxX(s0.pos.x);
        const sy = toPxY(s0.pos.z);
        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(sx - s0.right.x * halfW, sy - s0.right.z * halfW);
        ctx.lineTo(sx + s0.right.x * halfW, sy + s0.right.z * halfW);
        ctx.stroke();

        // Render active AI Opponents
        for (let i = 0; i < raceTelemetry.activeBotCount; i++) {
          const bot = raceTelemetry.bots[i];
          const bx = toPxX(bot.x);
          const by = toPxY(bot.z);
          if (activeTrack.isBoss) {
            ctx.beginPath();
            ctx.arc(bx, by, 7.5, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(239, 68, 68, 0.7)';
            ctx.lineWidth = 1.5;
            ctx.stroke();
          }
          ctx.beginPath();
          ctx.arc(bx, by, activeTrack.isBoss ? 4.8 : 4.2, 0, Math.PI * 2);
          ctx.fillStyle = bot.color;
          ctx.fill();
          ctx.lineWidth = 1.3;
          ctx.strokeStyle = '#ffffff';
          ctx.stroke();
        }
      } else {
        // FREE_ROAM 2X URBAN STREET-RACING MAP
        // 1. Arena perimeter boundary box (560x560)
        const bLeft = toPxX(FREE_ROAM_BOUNDS.minX);
        const bTop = toPxY(FREE_ROAM_BOUNDS.minZ);
        const bWidth = FREE_ROAM_BOUNDS.width * scale;
        const bHeight = FREE_ROAM_BOUNDS.depth * scale;

        ctx.fillStyle = 'rgba(18, 22, 30, 0.85)';
        ctx.fillRect(bLeft, bTop, bWidth, bHeight);
        ctx.strokeStyle = 'rgba(249, 115, 22, 0.65)';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(bLeft, bTop, bWidth, bHeight);

        // 2. Road Network Grid
        ctx.strokeStyle = 'rgba(51, 65, 85, 0.9)';
        ctx.lineWidth = Math.max(3, 14 * scale);

        // Broadway & Cross Blvd
        ctx.beginPath();
        ctx.moveTo(toPxX(0), toPxY(-260));
        ctx.lineTo(toPxX(0), toPxY(260));
        ctx.moveTo(toPxX(-260), toPxY(0));
        ctx.lineTo(toPxX(260), toPxY(0));
        ctx.stroke();

        // Avenues & Cross Streets
        for (const c of [-160, -80, 80, 160]) {
          ctx.beginPath();
          ctx.moveTo(toPxX(c), toPxY(-260));
          ctx.lineTo(toPxX(c), toPxY(260));
          ctx.moveTo(toPxX(-260), toPxY(c));
          ctx.lineTo(toPxX(260), toPxY(c));
          ctx.stroke();
        }

        // Perimeter Highway Ring (±230)
        ctx.strokeStyle = 'rgba(71, 85, 105, 0.9)';
        ctx.lineWidth = Math.max(4, 18 * scale);
        ctx.strokeRect(toPxX(-230), toPxY(-230), 460 * scale, 460 * scale);

        // Yellow dashes on Grand Broadway
        ctx.save();
        ctx.strokeStyle = 'rgba(250, 204, 21, 0.65)';
        ctx.lineWidth = Math.max(1, 1.8 * scale);
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(toPxX(0), toPxY(-260));
        ctx.lineTo(toPxX(0), toPxY(260));
        ctx.moveTo(toPxX(-260), toPxY(0));
        ctx.lineTo(toPxX(260), toPxY(0));
        ctx.stroke();
        ctx.restore();

        // 3. City Building Footprints
        for (let i = 0; i < CITY_BUILDINGS.length; i++) {
          const bld = CITY_BUILDINGS[i];
          const bw = bld.w * scale;
          const bd = bld.d * scale;
          const bx = toPxX(bld.x) - bw / 2;
          const by = toPxY(bld.z) - bd / 2;
          ctx.fillStyle = bld.type.includes('hq')
            ? bld.accentColor
            : bld.type === 'skyscraper'
            ? '#2d3748'
            : '#1e293b';
          ctx.fillRect(bx, by, bw, bd);
        }

        // 4. Interactive World Beacons
        for (let i = 0; i < FREE_ROAM_BEACONS.length; i++) {
          const beacon = FREE_ROAM_BEACONS[i];
          const bx = toPxX(beacon.x);
          const by = toPxY(beacon.z);
          const isUnlocked =
            beacon.type !== 'race' ||
            !beacon.trackId ||
            isTrackUnlocked(beacon.trackId, completedRaces).unlocked;

          // Pulse halo
          ctx.beginPath();
          ctx.arc(bx, by, Math.max(3.5, beacon.radius * scale * 0.9), 0, Math.PI * 2);
          ctx.fillStyle = isUnlocked ? beacon.color : '#52525b';
          ctx.globalAlpha = 0.35;
          ctx.fill();
          ctx.globalAlpha = 1;

          // Solid beacon core
          ctx.beginPath();
          ctx.arc(bx, by, beacon.type === 'garage' || beacon.type === 'car_lot' ? 4.5 : 3.2, 0, Math.PI * 2);
          ctx.fillStyle = isUnlocked ? beacon.color : '#71717a';
          ctx.fill();
          ctx.lineWidth = 1;
          ctx.strokeStyle = '#ffffff';
          ctx.stroke();

          // Quick Landmark Label
          if (beacon.type === 'garage') {
            ctx.fillStyle = '#FF9900';
            ctx.font = 'bold 8px monospace';
            ctx.fillText('GARAGE', bx + 6, by + 3);
          } else if (beacon.type === 'car_lot') {
            ctx.fillStyle = '#00B0FF';
            ctx.font = 'bold 8px monospace';
            ctx.fillText('CAR LOT', bx + 6, by + 3);
          }
        }

        // Driving breadcrumb trail
        const trail = trailRef.current;
        if (trail.length > 1) {
          ctx.beginPath();
          for (let i = 0; i < trail.length; i++) {
            const tx = toPxX(trail[i].x);
            const ty = toPxY(trail[i].z);
            if (i === 0) ctx.moveTo(tx, ty);
            else ctx.lineTo(tx, ty);
          }
          ctx.strokeStyle = 'rgba(249, 115, 22, 0.55)';
          ctx.lineWidth = 1.6;
          ctx.stroke();
        }
      }

      // Player car arrow + forward FOV cone
      const carPx = toPxX(x);
      const carPy = toPxY(z);

      ctx.save();
      ctx.translate(carPx, carPy);
      ctx.rotate(headingRad);

      const grad = ctx.createRadialGradient(0, 0, 2, 0, 0, 26);
      grad.addColorStop(0, 'rgba(249, 115, 22, 0.34)');
      grad.addColorStop(1, 'rgba(249, 115, 22, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, 26, -Math.PI / 2 - 0.42, -Math.PI / 2 + 0.42);
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(0, -8);
      ctx.lineTo(5.6, 6);
      ctx.lineTo(0, 3.2);
      ctx.lineTo(-5.6, 6);
      ctx.closePath();
      ctx.fillStyle = carColorRef.current || '#f97316';
      ctx.fill();
      ctx.lineWidth = 1.6;
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();

      ctx.restore();

      // North label pinned inside top border
      ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
      ctx.font = '700 9px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('N', MAP_SIZE / 2, 11);

      ctx.restore();
    };

    rafId = requestAnimationFrame(renderFrame);
    return () => cancelAnimationFrame(rafId);
  }, [zoomMode, view, activeTrack, completedRaces]);

  return (
    <div className="pointer-events-auto bg-zinc-950/90 border border-white/15 rounded-sm shadow-2xl overflow-hidden w-[210px]">
      <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-white/10 bg-black/50">
        <div className="flex items-center gap-1.5">
          <Compass className="w-3.5 h-3.5 text-orange-500" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-200">
            {view === 'RACE' ? 'Circuit Radar' : 'City Radar (2x)'}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setZoomMode((prev) => (prev === 'follow' ? 'full' : 'follow'))}
          title="Toggle Radar Zoom (M)"
          className="flex items-center gap-1 text-[10px] font-mono font-bold uppercase text-zinc-300 hover:text-orange-400 px-1.5 py-0.5 bg-zinc-900 border border-white/10 rounded-sm transition-colors cursor-pointer"
        >
          {zoomMode === 'follow' ? (
            <>
              <Maximize2 className="w-2.5 h-2.5" />
              <span>Follow</span>
            </>
          ) : (
            <>
              <Minimize2 className="w-2.5 h-2.5" />
              <span>Full</span>
            </>
          )}
        </button>
      </div>

      <div className="p-1.5 bg-zinc-950 flex justify-center">
        <canvas
          ref={canvasRef}
          style={{ width: MAP_SIZE, height: MAP_SIZE }}
          className="block rounded-sm border border-white/10"
        />
      </div>

      <div className="flex items-center justify-between px-2.5 py-1.5 border-t border-white/10 bg-black/50 text-[10px] font-mono tabular-nums text-zinc-400">
        <span ref={coordsRef}>0m, 0m</span>
        <span className="text-orange-400 font-bold" ref={headingRef}>
          N
        </span>
      </div>
    </div>
  );
}
