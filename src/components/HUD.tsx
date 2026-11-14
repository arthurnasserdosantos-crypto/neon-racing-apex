import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Crown,
  Flag,
  LogOut,
  RotateCcw,
  Skull,
  Sparkles,
  Trophy,
  Volume2,
  VolumeX,
  Wrench,
} from 'lucide-react';
import { useGameStore } from '../store';
import { FREE_ROAM_BEACONS, FreeRoamBeacon, carTelemetry, raceTelemetry } from '../utils/freeRoamWorld';
import { engineAudio } from '../utils/engineAudio';
import {
  getBuiltRaceTrack,
  getProgressionStatus,
  isTrackUnlocked,
  RACE_TRACK_DEFINITIONS,
} from '../utils/raceTracks';
import { MiniMap } from './MiniMap';

const RPM_SEGMENTS = 16;

function formatElapsed(ms: number): string {
  const clamped = Math.max(0, ms);
  const mins = Math.floor(clamped / 60000);
  const secs = Math.floor((clamped % 60000) / 1000);
  const centis = Math.floor((clamped % 1000) / 10);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(centis).padStart(2, '0')}`;
}

function formatOrdinal(pos: number): string {
  if (pos === 1) return '1st';
  if (pos === 2) return '2nd';
  return '3rd';
}

export function HUD() {
  const setView = useGameStore((s) => s.setView);
  const view = useGameStore((s) => s.view);
  const raceState = useGameStore((s) => s.raceState);
  const raceSessionId = useGameStore((s) => s.raceSessionId);
  const countdownValue = useGameStore((s) => s.countdownValue);
  const setCountdownValue = useGameStore((s) => s.setCountdownValue);
  const beginRaceGo = useGameStore((s) => s.beginRaceGo);
  const activeTrackId = useGameStore((s) => s.activeTrackId);
  const raceDistance = useGameStore((s) => s.raceDistance);
  const raceLaps = useGameStore((s) => s.raceLaps);
  const raceTitle = useGameStore((s) => s.raceTitle);
  const raceIsBoss = useGameStore((s) => s.raceIsBoss);
  const raceParticipantCount = useGameStore((s) => s.raceParticipantCount);
  const raceStartTime = useGameStore((s) => s.raceStartTime);
  const raceTime = useGameStore((s) => s.raceTime);
  const racePlacement = useGameStore((s) => s.racePlacement);
  const currentReward = useGameStore((s) => s.currentReward);
  const justUnlockedAct2 = useGameStore((s) => s.justUnlockedAct2);
  const justCompletedGame = useGameStore((s) => s.justCompletedGame);
  const completedRaces = useGameStore((s) => s.completedRaces);
  const cash = useGameStore((s) => s.cash);
  const startRace = useGameStore((s) => s.startRace);

  const [controlsOpen, setControlsOpen] = useState(true);
  const [audioMuted, setAudioMuted] = useState(() => engineAudio.isMuted());
  const [activeBeacon, setActiveBeacon] = useState<FreeRoamBeacon | null>(null);
  const activeBeaconRef = useRef<FreeRoamBeacon | null>(null);

  const isBeaconUnlocked = useMemo(() => {
    if (!activeBeacon) return false;
    if (activeBeacon.type !== 'race' || !activeBeacon.trackId) return true;
    return isTrackUnlocked(activeBeacon.trackId, completedRaces).unlocked;
  }, [activeBeacon, completedRaces]);

  const handleTriggerAction = () => {
    if (!activeBeacon) return;
    if (activeBeacon.type === 'garage') {
      engineAudio.playUiClick();
      setView('GARAGE');
    } else if (activeBeacon.type === 'car_lot') {
      engineAudio.playUiClick();
      setView('CAR_LOT');
    } else if (activeBeacon.type === 'race' && activeBeacon.trackId) {
      if (isBeaconUnlocked) {
        engineAudio.playUiClick();
        startRace(activeBeacon.trackId);
      }
    }
  };

  // Refs for 60fps zero-re-render telemetry cluster updates
  const speedRef = useRef<HTMLSpanElement | null>(null);
  const gearRef = useRef<HTMLSpanElement | null>(null);
  const rpmBarRefs = useRef<Array<HTMLDivElement | null>>([]);
  const brakeBadgeRef = useRef<HTMLSpanElement | null>(null);
  const driftBadgeRef = useRef<HTMLSpanElement | null>(null);
  const splitRef = useRef<HTMLSpanElement | null>(null);

  const raceTimerRef = useRef<HTMLSpanElement | null>(null);
  const racePosRef = useRef<HTMLSpanElement | null>(null);
  const raceLapRef = useRef<HTMLSpanElement | null>(null);
  const raceDistRef = useRef<HTMLSpanElement | null>(null);
  const raceProgressFillRef = useRef<HTMLDivElement | null>(null);

  const activeTrack = useMemo(() => getBuiltRaceTrack(activeTrackId), [activeTrackId]);
  const progression = useMemo(() => getProgressionStatus(completedRaces), [completedRaces]);

  // Drive 3, 2, 1, GO! race countdown sequence cleanly on each race start / restart
  useEffect(() => {
    if (view !== 'RACE' || raceSessionId <= 0) return;

    setCountdownValue(3);
    engineAudio.playCountdownTone(3);

    const t2 = window.setTimeout(() => {
      setCountdownValue(2);
      engineAudio.playCountdownTone(2);
    }, 900);

    const t1 = window.setTimeout(() => {
      setCountdownValue(1);
      engineAudio.playCountdownTone(1);
    }, 1800);

    const tGo = window.setTimeout(() => {
      beginRaceGo();
      engineAudio.playCountdownTone(0);
    }, 2700);

    const tClear = window.setTimeout(() => {
      setCountdownValue(null);
    }, 3500);

    return () => {
      window.clearTimeout(t2);
      window.clearTimeout(t1);
      window.clearTimeout(tGo);
      window.clearTimeout(tClear);
    };
  }, [view, raceSessionId, setCountdownValue, beginRaceGo]);

  // Escape exits to Menu; Enter activates Free Roam Beacons; H toggles controls; V toggles audio
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        engineAudio.playUiClick();
        setView('MENU');
      } else if (e.key === 'Enter') {
        if (view === 'FREE_ROAM' && activeBeaconRef.current) {
          e.preventDefault();
          const b = activeBeaconRef.current;
          if (b.type === 'garage') {
            engineAudio.playUiClick();
            setView('GARAGE');
          } else if (b.type === 'car_lot') {
            engineAudio.playUiClick();
            setView('CAR_LOT');
          } else if (b.type === 'race' && b.trackId) {
            if (isTrackUnlocked(b.trackId, completedRaces).unlocked) {
              engineAudio.playUiClick();
              startRace(b.trackId);
            }
          }
        }
      } else if (e.key === 'h' || e.key === 'H') {
        setControlsOpen((prev) => !prev);
      } else if (e.key === 'v' || e.key === 'V') {
        engineAudio.unlock();
        setAudioMuted(engineAudio.toggleMute());
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [view, completedRaces, setView, startRace]);

  // High-frequency telemetry loop updating DOM refs directly
  useEffect(() => {
    let rafId = 0;

    const tick = () => {
      rafId = requestAnimationFrame(tick);

      if (speedRef.current) {
        speedRef.current.textContent = String(Math.round(carTelemetry.speedKph));
      }
      if (gearRef.current) {
        gearRef.current.textContent = carTelemetry.gear;
      }

      const activeSegments = Math.round(carTelemetry.rpmRatio * RPM_SEGMENTS);
      for (let i = 0; i < RPM_SEGMENTS; i++) {
        const el = rpmBarRefs.current[i];
        if (!el) continue;
        if (i < activeSegments) {
          if (i >= RPM_SEGMENTS - 3) {
            el.style.backgroundColor = '#ef4444';
          } else if (i >= RPM_SEGMENTS - 6) {
            el.style.backgroundColor = '#f97316';
          } else {
            el.style.backgroundColor = '#facc15';
          }
        } else {
          el.style.backgroundColor = '#27272a';
        }
      }

      if (brakeBadgeRef.current) {
        brakeBadgeRef.current.style.opacity = carTelemetry.isBraking ? '1' : '0.28';
        brakeBadgeRef.current.style.color = carTelemetry.isBraking ? '#f87171' : '#71717a';
        brakeBadgeRef.current.style.borderColor = carTelemetry.isBraking
          ? 'rgba(248, 113, 113, 0.5)'
          : 'rgba(255, 255, 255, 0.1)';
      }

      if (driftBadgeRef.current) {
        driftBadgeRef.current.style.opacity = carTelemetry.isDrifting ? '1' : '0.28';
        driftBadgeRef.current.style.color = carTelemetry.isDrifting ? '#fb923c' : '#71717a';
        driftBadgeRef.current.style.borderColor = carTelemetry.isDrifting
          ? 'rgba(251, 146, 60, 0.55)'
          : 'rgba(255, 255, 255, 0.1)';
      }

      if (splitRef.current) {
        splitRef.current.textContent =
          carTelemetry.zeroToSixtySplitSec !== null
            ? `0-60 ${carTelemetry.zeroToSixtySplitSec.toFixed(2)}s`
            : '0-60 --.--s';
      }

      if (view === 'RACE' && raceState === 'countdown') {
        if (raceTimerRef.current) {
          raceTimerRef.current.textContent = '00:00.00';
        }
        if (racePosRef.current) {
          racePosRef.current.textContent = `${formatOrdinal(raceTelemetry.placement)} / ${raceParticipantCount}`;
        }
        if (raceLapRef.current) {
          raceLapRef.current.textContent = `Lap 1 / ${raceLaps}`;
        }
        if (raceDistRef.current) {
          raceDistRef.current.textContent = `0 / ${Math.round(Math.max(1, raceTelemetry.totalRaceMeters))} m`;
        }
        if (raceProgressFillRef.current) {
          raceProgressFillRef.current.style.width = '0%';
        }
      } else if (view === 'RACE' && raceState === 'racing') {
        const elapsed = raceStartTime > 0 ? Date.now() - raceStartTime : 0;
        if (raceTimerRef.current) {
          raceTimerRef.current.textContent = formatElapsed(elapsed);
        }
        if (racePosRef.current) {
          racePosRef.current.textContent = `${formatOrdinal(raceTelemetry.placement)} / ${raceParticipantCount}`;
        }
        if (raceLapRef.current) {
          raceLapRef.current.textContent = `Lap ${raceTelemetry.playerLap} / ${raceLaps}`;
        }

        const totalM = Math.max(1, raceTelemetry.totalRaceMeters);
        const covered = Math.min(totalM, Math.max(0, raceTelemetry.playerProgressMeters));
        const pct = Math.min(100, Math.max(0, (covered / totalM) * 100));
        if (raceDistRef.current) {
          raceDistRef.current.textContent = `${Math.round(covered)} / ${Math.round(totalM)} m`;
        }
        if (raceProgressFillRef.current) {
          raceProgressFillRef.current.style.width = `${pct.toFixed(1)}%`;
        }
      }

      // Free Roam World Beacon Proximity Detection
      if (view === 'FREE_ROAM') {
        let nearest: FreeRoamBeacon | null = null;
        let nearestDist = Infinity;
        for (let i = 0; i < FREE_ROAM_BEACONS.length; i++) {
          const b = FREE_ROAM_BEACONS[i];
          const dist = Math.hypot(carTelemetry.x - b.x, carTelemetry.z - b.z);
          if (dist <= b.radius && dist < nearestDist) {
            nearest = b;
            nearestDist = dist;
          }
        }
        if (nearest?.id !== activeBeaconRef.current?.id) {
          activeBeaconRef.current = nearest;
          setActiveBeacon(nearest);
        }
      } else if (activeBeaconRef.current) {
        activeBeaconRef.current = null;
        setActiveBeacon(null);
      }
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [view, raceState, raceStartTime, raceDistance, raceLaps, raceParticipantCount]);

  const showCluster =
    (view === 'RACE' && (raceState === 'countdown' || raceState === 'racing')) ||
    view === 'FREE_ROAM';
  const currentIdx = RACE_TRACK_DEFINITIONS.findIndex((t) => t.id === activeTrackId);
  const candidateNext =
    currentIdx >= 0 && currentIdx + 1 < RACE_TRACK_DEFINITIONS.length
      ? RACE_TRACK_DEFINITIONS[currentIdx + 1]
      : null;
  const nextUnlockedTrack =
    candidateNext && isTrackUnlocked(candidateNext.id, completedRaces).unlocked
      ? candidateNext
      : null;

  return (
    <div className="flex-1 pointer-events-none p-5 md:p-7 flex flex-col justify-between absolute inset-0 z-50">
      {/* Top Row: Left Controls | Center Boss Banner (in Boss Battles) | Right Standings & Radar */}
      <div className="flex justify-between items-start gap-4">
        <div className="flex flex-col gap-2.5 items-start">
          <div className="flex flex-wrap items-center gap-2 pointer-events-auto">
            <button
              type="button"
              onClick={() => setView('MENU')}
              className="flex items-center gap-2 px-3.5 py-2 bg-zinc-950/90 border border-white/15 hover:border-orange-500 text-zinc-200 hover:text-orange-400 text-[11px] font-bold uppercase tracking-widest transition-colors rounded-sm shadow-lg"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Menu</span>
            </button>

            <button
              type="button"
              onClick={() => setControlsOpen((prev) => !prev)}
              className="flex items-center gap-1.5 px-3 py-2 bg-zinc-950/90 border border-white/15 hover:border-white/30 text-zinc-300 text-[11px] font-bold uppercase tracking-widest transition-colors rounded-sm shadow-lg"
            >
              <span>Controls (H)</span>
              {controlsOpen ? (
                <ChevronUp className="w-3.5 h-3.5 text-zinc-400" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                engineAudio.unlock();
                setAudioMuted(engineAudio.toggleMute());
              }}
              title="Toggle Engine Audio (V)"
              className="flex items-center gap-1.5 px-3 py-2 bg-zinc-950/90 border border-white/15 hover:border-orange-500 text-zinc-300 hover:text-orange-400 text-[11px] font-bold uppercase tracking-widest transition-colors rounded-sm shadow-lg"
            >
              {audioMuted ? (
                <VolumeX className="w-3.5 h-3.5 text-zinc-500" />
              ) : (
                <Volume2 className="w-3.5 h-3.5 text-orange-400" />
              )}
              <span>{audioMuted ? 'Muted' : 'Audio (V)'}</span>
            </button>
          </div>

          {controlsOpen && (
            <div className="bg-zinc-950/90 p-3.5 rounded-sm border border-white/15 pointer-events-auto shadow-xl min-w-[205px]">
              <div className="grid gap-1.5 text-[11px] font-semibold text-zinc-300 uppercase tracking-wider">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-zinc-400">Throttle</span>
                  <span className="px-1.5 py-0.5 rounded-sm bg-zinc-800 border border-white/10 font-mono text-white">
                    W / ↑
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-zinc-400">Brake / Rev</span>
                  <span className="px-1.5 py-0.5 rounded-sm bg-zinc-800 border border-white/10 font-mono text-white">
                    S / ↓
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-zinc-400">Steer</span>
                  <span className="px-1.5 py-0.5 rounded-sm bg-zinc-800 border border-white/10 font-mono text-white">
                    A / D
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-zinc-400">Handbrake</span>
                  <span className="px-1.5 py-0.5 rounded-sm bg-zinc-800 border border-white/10 font-mono text-white">
                    SPACE
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-zinc-400">Radar Zoom</span>
                  <span className="px-1.5 py-0.5 rounded-sm bg-zinc-800 border border-white/10 font-mono text-white">
                    M
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Center Top: Distinct BOSS BATTLE Banner during 1v1 Boss Duels */}
        {view === 'RACE' &&
          raceIsBoss &&
          activeTrack.bossProfile &&
          raceState === 'racing' &&
          countdownValue === null && (
            <div className="hidden md:flex flex-col items-center bg-zinc-950/92 border border-red-500/60 px-6 py-2.5 rounded-sm shadow-2xl">
              <div className="flex items-center gap-2 text-[10px] font-mono font-bold uppercase tracking-[0.28em] text-red-400">
                {activeTrack.isFinalBoss ? (
                  <Crown className="w-3.5 h-3.5 text-amber-400" />
                ) : (
                  <Skull className="w-3.5 h-3.5 text-red-400" />
                )}
                <span>BOSS BATTLE · 1v1 DUEL</span>
              </div>
              <div className="text-sm font-bold tracking-wide text-white mt-0.5">
                vs {activeTrack.bossProfile.name}
              </div>
              <div className="text-[10px] font-mono text-zinc-400">
                {activeTrack.bossProfile.title}
              </div>
            </div>
          )}

        {/* Top-Right: Race Standings + Circuit Radar, or Free Roam Radar */}
        <div className="flex flex-col items-end gap-2.5">
          {view === 'RACE' && (
            <div
              className={`pointer-events-auto bg-zinc-950/90 border rounded-sm p-3.5 w-[228px] shadow-2xl ${
                raceIsBoss ? 'border-red-500/50' : 'border-white/15'
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  {raceIsBoss ? (
                    <Skull className="w-3.5 h-3.5 text-red-400 shrink-0" />
                  ) : (
                    <Flag className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                  )}
                  <span className="text-[11px] font-bold uppercase tracking-wider text-white truncate">
                    {raceTitle}
                  </span>
                </div>
                <span
                  ref={raceTimerRef}
                  className="text-xs font-mono font-bold tabular-nums text-orange-400 shrink-0"
                >
                  {raceState === 'finished' ? formatElapsed(raceTime) : '00:00.00'}
                </span>
              </div>

              <div className="flex items-baseline justify-between mb-2">
                <span
                  ref={racePosRef}
                  className="text-xl font-mono font-bold tabular-nums text-white"
                >
                  {raceState === 'finished'
                    ? `${formatOrdinal(racePlacement)} / ${raceParticipantCount}`
                    : `${formatOrdinal(raceParticipantCount)} / ${raceParticipantCount}`}
                </span>
                <span
                  ref={raceLapRef}
                  className="text-xs font-mono font-bold tabular-nums text-zinc-300"
                >
                  Lap 1 / {raceLaps}
                </span>
              </div>

              <div className="h-1.5 w-full bg-zinc-800 rounded-sm overflow-hidden border border-white/10">
                <div
                  ref={raceProgressFillRef}
                  className={`h-full transition-[width] duration-75 ${
                    raceIsBoss ? 'bg-red-500' : 'bg-orange-500'
                  }`}
                  style={{ width: raceState === 'finished' ? '100%' : '0%' }}
                />
              </div>

              <div className="flex items-center justify-between mt-1.5 text-[10px] font-mono tabular-nums text-zinc-400">
                <span>{raceIsBoss ? '1v1 Boss Duel' : 'AI Rivals: 2'}</span>
                <span ref={raceDistRef}>
                  {raceState === 'finished'
                    ? `${raceDistance} / ${raceDistance} m`
                    : `0 / ${raceDistance} m`}
                </span>
              </div>
            </div>
          )}

          <MiniMap />
        </div>
      </div>

      {/* Bottom Row: Digital Tachometer + Speedometer Cluster */}
      <div className="flex justify-between items-end">
        {showCluster ? (
          <div className="bg-zinc-950/92 px-5 py-4 rounded-sm border border-white/15 shadow-2xl min-w-[260px]">
            <div className="flex items-baseline justify-between gap-6">
              <div>
                <div className="text-[10px] text-zinc-400 uppercase font-bold tracking-widest">
                  Speed
                </div>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span
                    ref={speedRef}
                    className="text-4xl font-mono font-bold tabular-nums text-white leading-none"
                  >
                    0
                  </span>
                  <span className="text-xs font-mono font-bold text-zinc-400 uppercase">
                    KPH
                  </span>
                </div>
              </div>

              <div className="text-right">
                <div className="text-[10px] text-zinc-400 uppercase font-bold tracking-widest">
                  Gear
                </div>
                <span
                  ref={gearRef}
                  className="text-3xl font-mono font-bold tabular-nums text-orange-400 leading-none block mt-0.5"
                >
                  N
                </span>
              </div>
            </div>

            {/* Multi-Segment RPM Bar */}
            <div className="mt-3 flex gap-1 h-2">
              {Array.from({ length: RPM_SEGMENTS }).map((_, idx) => (
                <div
                  key={idx}
                  ref={(el) => {
                    rpmBarRefs.current[idx] = el;
                  }}
                  className="flex-1 rounded-[1px] bg-zinc-800"
                />
              ))}
            </div>

            {/* Dynamic Vehicle State Flags */}
            <div className="mt-2.5 flex items-center justify-between gap-2 text-[10px] font-mono font-bold uppercase tracking-wider">
              <span
                ref={brakeBadgeRef}
                className="px-2 py-0.5 rounded-sm bg-zinc-900 border border-white/10 text-zinc-500"
              >
                BRK
              </span>
              <span
                ref={driftBadgeRef}
                className="px-2 py-0.5 rounded-sm bg-zinc-900 border border-white/10 text-zinc-500"
              >
                DRIFT
              </span>
              <span ref={splitRef} className="text-zinc-300 tabular-nums">
                0-60 --.--s
              </span>
            </div>
          </div>
        ) : (
          <div />
        )}
      </div>

      {/* FREE ROAM INTERACTIVE WORLD LOCATION TRIGGER BANNER */}
      {view === 'FREE_ROAM' && activeBeacon && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 pointer-events-auto z-50 w-[94%] max-w-xl">
          <div
            className={`mw-slant px-6 py-3.5 border-2 shadow-2xl flex flex-wrap sm:flex-nowrap items-center justify-between gap-4 ${
              activeBeacon.type === 'garage'
                ? 'bg-[#0D0E10]/95 border-[#FF9900] shadow-[0_0_30px_rgba(255,153,0,0.45)]'
                : activeBeacon.type === 'car_lot'
                ? 'bg-[#0D0E10]/95 border-[#00B0FF] shadow-[0_0_30px_rgba(0,176,255,0.45)]'
                : isBeaconUnlocked
                ? 'bg-[#0D0E10]/95 border-[#FACC15] shadow-[0_0_30px_rgba(250,204,21,0.45)]'
                : 'bg-[#0D0E10]/95 border-[#DC2626] shadow-[0_0_30px_rgba(220,38,38,0.45)]'
            }`}
          >
            <div className="mw-unslant flex items-center gap-4 min-w-0">
              <div
                className={`w-12 h-12 border flex items-center justify-center shrink-0 ${
                  activeBeacon.type === 'garage'
                    ? 'bg-[#FF9900]/20 border-[#FF9900] text-[#FF9900]'
                    : activeBeacon.type === 'car_lot'
                    ? 'bg-[#00B0FF]/20 border-[#00B0FF] text-[#00B0FF]'
                    : isBeaconUnlocked
                    ? 'bg-[#FACC15]/20 border-[#FACC15] text-[#FACC15]'
                    : 'bg-[#DC2626]/20 border-[#DC2626] text-[#DC2626]'
                }`}
              >
                {activeBeacon.type === 'garage' ? (
                  <Wrench className="w-5 h-5" />
                ) : activeBeacon.type === 'car_lot' ? (
                  <Sparkles className="w-5 h-5" />
                ) : isBeaconUnlocked ? (
                  <Flag className="w-5 h-5" />
                ) : (
                  <Skull className="w-5 h-5" />
                )}
              </div>

              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono uppercase tracking-[0.2em] font-bold text-[#8E9299]">
                    {activeBeacon.subtitle}
                  </span>
                  {activeBeacon.reward && (
                    <span className="text-[10px] font-mono text-emerald-400 font-bold">
                      +${activeBeacon.reward.toLocaleString()} PURSE
                    </span>
                  )}
                </div>
                <div className="font-[family-name:var(--font-display)] italic font-black text-xl tracking-wider uppercase text-[#F4F4F4] truncate">
                  {activeBeacon.title}
                </div>
                {!isBeaconUnlocked && (
                  <span className="text-[10px] font-mono text-[#DC2626] font-bold mt-0.5">
                    LOCKED // COMPLETE ALL PREREQUISITE RACES TO CHALLENGE
                  </span>
                )}
              </div>
            </div>

            <div className="mw-unslant shrink-0">
              {isBeaconUnlocked ? (
                <button
                  type="button"
                  onClick={handleTriggerAction}
                  className={`px-5 py-2.5 font-[family-name:var(--font-display)] italic font-black uppercase text-sm tracking-wider cursor-pointer transition-colors shadow-lg ${
                    activeBeacon.type === 'garage'
                      ? 'bg-[#FF9900] hover:bg-[#E65100] text-[#0D0E10]'
                      : activeBeacon.type === 'car_lot'
                      ? 'bg-[#00B0FF] hover:bg-[#0284c7] text-[#0D0E10]'
                      : 'bg-[#FACC15] hover:bg-[#eab308] text-[#0D0E10]'
                  }`}
                >
                  <span>
                    [ENTER]{' '}
                    {activeBeacon.type === 'garage'
                      ? 'ENTER GARAGE'
                      : activeBeacon.type === 'car_lot'
                      ? 'ENTER CAR LOT'
                      : 'START RACE'}
                  </span>
                </button>
              ) : (
                <div className="px-4 py-2 border border-[#DC2626]/40 bg-[#DC2626]/15 text-[#DC2626] font-mono text-xs font-bold uppercase">
                  LOCKED
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Upper-Middle Third: Animated NFSMW 3, 2, 1, GO! Race Countdown Overlay */}
      {view === 'RACE' && countdownValue !== null && (
        <div
          aria-live="assertive"
          className="absolute top-[14%] md:top-[16%] left-1/2 -translate-x-1/2 pointer-events-none z-40 flex flex-col items-center"
        >
          {countdownValue === 0 ? (
            <div
              key={`go-${raceSessionId}`}
              className="mw-countdown-go bg-[#FF9900] border-2 border-[#F4F4F4] px-12 py-4 shadow-[0_14px_45px_rgba(255,153,0,0.5)]"
            >
              <div className="mw-unslant text-center">
                <span className="font-[family-name:var(--font-display)] italic font-black uppercase text-7xl md:text-8xl leading-none tracking-wider text-[#0D0E10] drop-shadow-[0_3px_0_rgba(255,255,255,0.45)]">
                  GO!
                </span>
              </div>
            </div>
          ) : (
            <div
              key={`step-${raceSessionId}-${countdownValue}`}
              className="mw-countdown-step bg-[#0D0E10]/92 border border-[#3A3E45] border-l-4 border-l-[#FF9900] px-11 py-4 shadow-[0_14px_45px_rgba(0,0,0,0.9)]"
            >
              <div className="mw-unslant flex flex-col items-center">
                <span className="text-[10px] font-mono font-bold uppercase tracking-[0.28em] text-[#FF9900] mb-1">
                  {raceIsBoss && activeTrack.bossProfile
                    ? `1v1 Boss Duel · vs ${activeTrack.bossProfile.name}`
                    : `${raceTitle} · Rev Engine`}
                </span>
                <span className="font-[family-name:var(--font-display)] italic font-black uppercase text-7xl md:text-8xl leading-none tabular-nums text-[#F4F4F4] drop-shadow-[0_6px_18px_rgba(0,0,0,0.95)]">
                  {countdownValue}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* GAME COMPLETE / CHAMPIONSHIP VICTORY (Defeated Final Boss) */}
      {view === 'RACE' && raceState === 'finished' && justCompletedGame && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/75 pointer-events-auto p-4">
          <div className="bg-zinc-950/95 p-8 md:p-10 rounded-sm border border-amber-400/70 shadow-2xl w-full max-w-lg text-center">
            <div className="flex justify-center mb-3">
              <div className="w-12 h-12 rounded-sm bg-amber-500/15 border border-amber-400/50 flex items-center justify-center">
                <Crown className="w-7 h-7 text-amber-400" />
              </div>
            </div>
            <div className="text-[11px] font-mono uppercase tracking-[0.28em] text-amber-400 mb-1">
              Game Complete · Grand Champion
            </div>
            <h2 className="font-[family-name:var(--font-fondamento)] text-4xl md:text-5xl text-white mb-2">
              Championship Victory
            </h2>
            <p className="text-xs md:text-sm text-zinc-300 mb-6">
              You conquered Act 1 &amp; Act 2 and defeated the Apex Sovereign in the Grand Finale!
            </p>

            <div className="grid grid-cols-3 gap-3 mb-7 text-left">
              <div className="bg-zinc-900 border border-white/10 rounded-sm p-3">
                <div className="text-[10px] uppercase tracking-widest text-zinc-400">Time</div>
                <div className="text-lg font-mono font-bold tabular-nums text-white mt-1">
                  {formatElapsed(raceTime)}
                </div>
              </div>
              <div className="bg-zinc-900 border border-white/10 rounded-sm p-3">
                <div className="text-[10px] uppercase tracking-widest text-zinc-400">
                  Final Purse
                </div>
                <div className="text-lg font-mono font-bold tabular-nums text-emerald-400 mt-1">
                  +${currentReward.toLocaleString()}
                </div>
              </div>
              <div className="bg-zinc-900 border border-white/10 rounded-sm p-3">
                <div className="text-[10px] uppercase tracking-widest text-zinc-400">
                  Total Cash
                </div>
                <div className="text-lg font-mono font-bold tabular-nums text-amber-300 mt-1">
                  ${cash.toLocaleString()}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => setView('CAREER')}
                className="bg-amber-400 hover:bg-amber-300 text-black font-black py-3 text-xs uppercase tracking-widest rounded-sm transition-colors"
              >
                Career Map
              </button>
              <button
                type="button"
                onClick={() => setView('FREE_ROAM')}
                className="bg-zinc-800 hover:bg-zinc-700 border border-white/15 text-white font-bold py-3 text-xs uppercase tracking-widest rounded-sm transition-colors"
              >
                Free Roam
              </button>
              <button
                type="button"
                onClick={() => setView('MENU')}
                className="bg-zinc-900 hover:bg-zinc-800 border border-white/15 text-zinc-200 font-bold py-3 text-xs uppercase tracking-widest rounded-sm transition-colors"
              >
                Main Menu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Standard Finish / Boss 1 Defeat / Boss 1 Unlock Act 2 Overlay */}
      {view === 'RACE' && raceState === 'finished' && !justCompletedGame && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/65 pointer-events-auto p-4">
          <div
            className={`bg-zinc-950/95 p-8 md:p-10 rounded-sm border shadow-2xl w-full max-w-md text-center ${
              raceIsBoss ? 'border-red-500/60' : 'border-orange-500/50'
            }`}
          >
            {justUnlockedAct2 && (
              <div className="mb-4 px-3 py-2 bg-emerald-500/15 border border-emerald-400/50 rounded-sm flex items-center justify-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-emerald-300">
                <Trophy className="w-4 h-4 text-emerald-400" />
                <span>Boss 1 Defeated · Act 2 Unlocked!</span>
              </div>
            )}

            <div className="text-[11px] font-mono uppercase tracking-[0.25em] text-orange-400 mb-1">
              {raceTitle} · {raceLaps} {raceLaps === 1 ? 'Lap' : 'Laps'}
            </div>
            <h2 className="font-[family-name:var(--font-fondamento)] text-5xl text-white mb-2">
              {formatOrdinal(racePlacement)} Place
            </h2>
            <p className="text-xs text-zinc-400 mb-6">
              {raceIsBoss && racePlacement !== 1
                ? 'Boss escaped! Finish 1st in the 1v1 duel to claim victory and unlock the next Act.'
                : racePlacement === 1
                ? justUnlockedAct2
                  ? 'Races 5–9 and the Final Boss path in Act 2 are now open!'
                  : `Act ${activeTrack.act} victory recorded (${
                      activeTrack.act === 1
                        ? `${progression.act1Wins}/${progression.act1Total}`
                        : `${progression.act2Wins}/${progression.act2Total}`
                    } races won).`
                : 'Scaled podium payout awarded. Finish 1st place to unlock the Act Boss.'}
            </p>

            <div className="grid grid-cols-2 gap-3 mb-7 text-left">
              <div className="bg-zinc-900 border border-white/10 rounded-sm p-3.5">
                <div className="text-[10px] uppercase tracking-widest text-zinc-400">
                  Elapsed Time
                </div>
                <div className="text-xl font-mono font-bold tabular-nums text-white mt-1">
                  {formatElapsed(raceTime)}
                </div>
              </div>
              <div className="bg-zinc-900 border border-white/10 rounded-sm p-3.5">
                <div className="text-[10px] uppercase tracking-widest text-zinc-400">
                  Prize Credited
                </div>
                <div className="text-xl font-mono font-bold tabular-nums text-emerald-400 mt-1">
                  +${currentReward.toLocaleString()}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2.5">
              {nextUnlockedTrack && (
                <button
                  type="button"
                  onClick={() => startRace(nextUnlockedTrack.id)}
                  className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-400 text-black font-black py-3 text-xs uppercase tracking-widest rounded-sm transition-colors"
                >
                  <span>
                    {justUnlockedAct2
                      ? `Continue to Act 2: ${nextUnlockedTrack.title}`
                      : `Next Race: ${nextUnlockedTrack.title}`}
                  </span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => startRace(activeTrackId)}
                  className="flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 border border-white/15 text-white font-bold py-3 text-xs uppercase tracking-widest rounded-sm transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>{raceIsBoss && racePlacement !== 1 ? 'Rematch Boss' : 'Race Again'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setView('CAREER')}
                  className={`font-black py-3 text-xs uppercase tracking-widest rounded-sm transition-colors ${
                    nextUnlockedTrack
                      ? 'bg-zinc-900 hover:bg-zinc-800 border border-white/15 text-zinc-200'
                      : 'bg-orange-500 hover:bg-orange-400 text-black'
                  }`}
                >
                  Career Menu
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
