import React, { useEffect, useMemo } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  Compass,
  Crown,
  Flag,
  Lock,
  Skull,
  Wrench,
} from 'lucide-react';
import { useGameStore } from '../store';
import { engineAudio } from '../utils/engineAudio';
import {
  getBuiltRaceTrack,
  getProgressionStatus,
  getScaledPayout,
  isTrackUnlocked,
  RACE_TRACK_DEFINITIONS,
  RaceTrackDefinition,
} from '../utils/raceTracks';

function formatTimeMs(ms: number): string {
  const mins = Math.floor(ms / 60000);
  const secs = Math.floor((ms % 60000) / 1000);
  const centis = Math.floor((ms % 1000) / 10);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(centis).padStart(2, '0')}`;
}

function TrackSilhouette({
  trackId,
  locked,
  isBoss,
}: {
  trackId: string;
  locked: boolean;
  isBoss: boolean;
}) {
  const pathD = useMemo(() => {
    const track = getBuiltRaceTrack(trackId);
    const { samples, bounds } = track;
    const span = Math.max(bounds.width, bounds.depth, 1);
    const w = 120;
    const h = 58;
    const pad = 7;
    const scale = Math.min((w - pad * 2) / span, (h - pad * 2) / span);
    const cx = bounds.centerX;
    const cz = bounds.centerZ;

    let d = '';
    for (let i = 0; i < samples.length; i += 4) {
      const p = samples[i].pos;
      const x = (w / 2 + (p.x - cx) * scale).toFixed(1);
      const y = (h / 2 + (p.z - cz) * scale).toFixed(1);
      d += i === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`;
    }
    return `${d} Z`;
  }, [trackId]);

  const strokeColor = locked ? '#52525B' : isBoss ? '#D32F2F' : '#FF9900';

  return (
    <svg
      viewBox="0 0 120 58"
      className="w-full h-14 bg-[#0D0E10] border border-[#3A3E45]"
      aria-hidden="true"
    >
      <path d={pathD} fill="none" stroke={strokeColor} strokeWidth="2.5" strokeLinejoin="round" />
    </svg>
  );
}

function BossRivalPreview({
  bodyColor,
  accentColor,
  locked,
}: {
  bodyColor: string;
  accentColor: string;
  locked: boolean;
}) {
  return (
    <svg
      viewBox="0 0 180 62"
      className="w-full h-14 bg-[#0D0E10] border border-[#3A3E45]"
      aria-hidden="true"
    >
      {/* Subtle Rival Silhouette & Low-Slung GT Profile */}
      <circle cx="145" cy="18" r="10" fill={locked ? '#27272A' : '#1F2329'} />
      <path
        d="M127 42 C131 31, 159 31, 163 42 Z"
        fill={locked ? '#27272A' : '#1F2329'}
      />
      {/* Stylized GT Coupe Side Profile */}
      <path
        d="M14 45 L18 35 L42 32 L66 20 L108 20 L132 31 L148 33 L150 45 Z"
        fill={locked ? '#3A3E45' : bodyColor}
        stroke={locked ? '#52525B' : accentColor}
        strokeWidth="1.5"
      />
      {/* Rear Wing */}
      <path
        d="M14 33 L8 24 L20 24 L22 33 Z"
        fill={locked ? '#3A3E45' : accentColor}
      />
      {/* Cabin Glass */}
      <path d="M68 23 L103 23 L122 31 L56 31 Z" fill="#0D0E10" />
      {/* Wheels */}
      <circle cx="42" cy="46" r="8" fill="#0D0E10" stroke={locked ? '#52525B' : accentColor} strokeWidth="2" />
      <circle cx="122" cy="46" r="8" fill="#0D0E10" stroke={locked ? '#52525B' : accentColor} strokeWidth="2" />
    </svg>
  );
}

export function Career() {
  const setView = useGameStore((s) => s.setView);
  const startRace = useGameStore((s) => s.startRace);
  const completedRaces = useGameStore((s) => s.completedRaces);

  const status = getProgressionStatus(completedRaces);
  const act1Races = RACE_TRACK_DEFINITIONS.filter((r) => r.act === 1);
  const act2Races = RACE_TRACK_DEFINITIONS.filter((r) => r.act === 2);

  // ESC returns cleanly to Main Menu
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        engineAudio.playUiClick();
        setView('MENU');
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [setView]);

  return (
    <main className="flex-1 flex flex-col px-5 md:px-10 py-4 gap-4 min-h-0 overflow-y-auto pointer-events-auto">
      {/* Top Action & Title Strip */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#3A3E45] pb-3 shrink-0">
        <div>
          <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-[#FF9900]">
            Blacklist Career // Two-Act Dossier
          </div>
          <h1 className="font-[family-name:var(--font-display)] italic font-black uppercase text-3xl md:text-4xl tracking-wider text-[#F4F4F4] leading-none mt-0.5">
            Career &amp; Race Select
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              engineAudio.playUiClick();
              setView('GARAGE');
            }}
            className="mw-slant bg-[#1A1C20] hover:bg-[#FF9900] border border-[#3A3E45] hover:border-[#FF9900] text-[#F4F4F4] hover:text-[#0D0E10] px-4 py-2 transition-colors cursor-pointer"
          >
            <span className="mw-unslant flex items-center gap-1.5 font-[family-name:var(--font-display)] italic font-extrabold uppercase text-sm tracking-wider whitespace-nowrap">
              <Wrench className="w-3.5 h-3.5" />
              <span>Garage</span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              engineAudio.playUiClick();
              setView('FREE_ROAM');
            }}
            className="mw-slant bg-[#1A1C20] hover:bg-[#FF9900] border border-[#3A3E45] hover:border-[#FF9900] text-[#F4F4F4] hover:text-[#0D0E10] px-4 py-2 transition-colors cursor-pointer"
          >
            <span className="mw-unslant flex items-center gap-1.5 font-[family-name:var(--font-display)] italic font-extrabold uppercase text-sm tracking-wider whitespace-nowrap">
              <Compass className="w-3.5 h-3.5" />
              <span>Free Roam</span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              engineAudio.playUiClick();
              setView('MENU');
            }}
            className="mw-slant bg-[#FF9900] hover:bg-[#E65100] border border-[#FF9900] text-[#0D0E10] px-5 py-2 transition-colors cursor-pointer"
          >
            <span className="mw-unslant flex items-center gap-1.5 font-[family-name:var(--font-display)] italic font-black uppercase text-sm tracking-wider whitespace-nowrap">
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Menu [ESC]</span>
            </span>
          </button>
        </div>
      </div>

      {/* ACT I — BLACKLIST QUALIFIERS (4 Standard + Boss 1) */}
      <section className="space-y-2.5 shrink-0">
        <div className="flex flex-wrap items-center justify-between gap-3 mw-slant bg-[#1A1C20]/95 border border-[#3A3E45] border-l-4 border-l-[#FF9900] px-5 py-2">
          <div className="mw-unslant flex items-center gap-4">
            <span className="font-[family-name:var(--font-display)] italic font-black uppercase text-xl tracking-wider text-[#F4F4F4]">
              Act I · Syndicate Qualifiers
            </span>
            <span className="text-xs font-mono uppercase tracking-wider text-[#8E9299]">
              Races 01–04 + Boss 1 Duel
            </span>
          </div>

          <div className="mw-unslant flex items-center gap-5 text-xs font-mono uppercase tabular-nums">
            <span className="text-[#8E9299]">
              Won: <strong className="text-[#F4F4F4]">{status.act1Wins}/{status.act1Total}</strong>
            </span>
            <span
              className={
                status.boss1Defeated
                  ? 'text-emerald-400 font-bold'
                  : status.boss1Unlocked
                  ? 'text-[#FF9900] font-bold'
                  : 'text-[#8E9299]'
              }
            >
              {status.boss1Defeated
                ? 'Boss 1 Defeated'
                : status.boss1Unlocked
                ? 'Boss 1 Unlocked'
                : 'Boss 1 Locked'}
            </span>
          </div>
        </div>

        {/* Horizontal Slanted Dossier Card Row */}
        <div className="flex items-stretch gap-3.5 overflow-x-auto pb-2 px-3">
          {act1Races.map((r) => (
            <BlacklistDossierCard
              key={r.id}
              race={r}
              record={completedRaces[r.id]}
              unlock={isTrackUnlocked(r.id, completedRaces)}
              onLaunch={() => {
                engineAudio.playUiClick();
                startRace(r.id);
              }}
            />
          ))}
        </div>
      </section>

      {/* ACT II — APEX CHAMPIONSHIP (5 Standard + Final Boss) */}
      <section className="space-y-2.5 shrink-0 pb-2">
        <div
          className={`flex flex-wrap items-center justify-between gap-3 mw-slant border px-5 py-2 ${
            status.act2Unlocked
              ? 'bg-[#1A1C20]/95 border-[#3A3E45] border-l-4 border-l-[#FF9900]'
              : 'bg-[#0D0E10]/90 border-[#3A3E45] border-l-4 border-l-[#52525B]'
          }`}
        >
          <div className="mw-unslant flex items-center gap-3">
            {!status.act2Unlocked && <Lock className="w-4 h-4 text-[#FF9900] shrink-0" />}
            <span className="font-[family-name:var(--font-display)] italic font-black uppercase text-xl tracking-wider text-[#F4F4F4]">
              Act II · Apex Championship
            </span>
            <span className="text-xs font-mono uppercase tracking-wider text-[#8E9299]">
              {status.act2Unlocked
                ? 'Races 05–09 + Final Boss Championship'
                : 'Locked — Beat Boss 1 (Obsidian Phantom) to Unlock'}
            </span>
          </div>

          <div className="mw-unslant flex items-center gap-5 text-xs font-mono uppercase tabular-nums">
            <span className="text-[#8E9299]">
              Won: <strong className="text-[#F4F4F4]">{status.act2Wins}/{status.act2Total}</strong>
            </span>
            <span
              className={
                status.finalBossDefeated
                  ? 'text-emerald-400 font-bold'
                  : status.finalBossUnlocked
                  ? 'text-[#FF9900] font-bold'
                  : 'text-[#8E9299]'
              }
            >
              {status.finalBossDefeated
                ? 'Grand Champion'
                : status.finalBossUnlocked
                ? 'Final Boss Unlocked'
                : 'Final Boss Locked'}
            </span>
          </div>
        </div>

        {/* Horizontal Slanted Dossier Card Row */}
        <div className="flex items-stretch gap-3 overflow-x-auto pb-2 px-3">
          {act2Races.map((r) => (
            <BlacklistDossierCard
              key={r.id}
              race={r}
              record={completedRaces[r.id]}
              unlock={isTrackUnlocked(r.id, completedRaces)}
              onLaunch={() => {
                engineAudio.playUiClick();
                startRace(r.id);
              }}
            />
          ))}
        </div>
      </section>
    </main>
  );
}

interface DossierCardProps {
  race: RaceTrackDefinition;
  record?: { bestTimeMs: number; bestPosition: number };
  unlock: { unlocked: boolean; reason?: string };
  onLaunch: () => void;
}

function BlacklistDossierCard({ race, record, unlock, onLaunch }: DossierCardProps) {
  const built = getBuiltRaceTrack(race.id);
  const won = record?.bestPosition === 1;
  const locked = !unlock.unlocked;
  const eventNum = String(race.raceNumber).padStart(2, '0');
  const raceTypeLabel = race.laps > 1 ? `Circuit · ${race.laps} Laps` : 'Sprint · 1 Lap';

  return (
    <button
      type="button"
      disabled={locked}
      onClick={onLaunch}
      onMouseEnter={() => {
        if (!locked) engineAudio.playUiHover();
      }}
      className={`group relative text-left mw-slant border transition-all duration-150 flex flex-col justify-between p-4 shrink-0 ${
        race.isBoss
          ? 'w-[285px] lg:flex-[1.35] lg:w-auto lg:min-w-[255px]'
          : 'w-[225px] lg:flex-1 lg:w-auto lg:min-w-[190px]'
      } ${
        locked
          ? 'bg-[#0D0E10]/90 border-[#3A3E45] opacity-60 cursor-not-allowed'
          : race.isBoss
          ? 'bg-[#1A1C20]/95 border-[#D32F2F] hover:border-[#FF9900] hover:-translate-y-0.5 cursor-pointer'
          : won
          ? 'bg-[#1A1C20]/95 border-[#FF9900]/65 hover:border-[#FF9900] hover:-translate-y-0.5 cursor-pointer'
          : 'bg-[#1A1C20]/95 border-[#3A3E45] hover:border-[#FF9900] hover:-translate-y-0.5 cursor-pointer'
      }`}
    >
      {/* Diagonal Hazard Stripes Overlay on Locked Bosses / Locked Act 2 */}
      {locked && (
        <div
          className="absolute inset-0 mw-hazard-stripes pointer-events-none z-10"
          aria-hidden="true"
        />
      )}

      {/* Locked Padlock + Unlock Requirement Overlay */}
      {locked && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-4 text-center pointer-events-none">
          <div className="mw-unslant flex flex-col items-center gap-2 bg-[#0D0E10]/95 border border-[#FF9900]/60 px-3.5 py-2.5 shadow-xl">
            <Lock className="w-5 h-5 text-[#FF9900]" />
            <span className="font-[family-name:var(--font-display)] italic font-black uppercase text-xs tracking-widest text-[#FF9900]">
              {race.isBoss ? 'Beat All Section Races To Unlock' : 'Act Locked'}
            </span>
            <span className="text-[10px] font-mono uppercase text-[#F4F4F4] leading-snug">
              {unlock.reason}
            </span>
          </div>
        </div>
      )}

      {/* Card Top: Number / Emblem + Completed Stamp */}
      <div className="mw-unslant relative z-0 flex flex-col gap-2.5 w-full">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div
              className={`font-[family-name:var(--font-display)] italic font-black uppercase leading-none ${
                race.isBoss ? 'text-2xl text-[#D32F2F]' : 'text-3xl text-[#FF9900]'
              }`}
            >
              {race.isFinalBoss ? 'FINAL' : race.isBoss ? 'BOSS 1' : `#${eventNum}`}
            </div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-[#8E9299] mt-0.5">
              {race.isBoss ? '1v1 Blacklist Duel' : raceTypeLabel}
            </div>
          </div>

          {won ? (
            <div className="border border-[#FF9900] bg-[#FF9900]/15 px-2 py-0.5 flex items-center gap-1 -rotate-3">
              <CheckCircle2 className="w-3 h-3 text-[#FF9900]" />
              <span className="font-[family-name:var(--font-display)] italic font-black uppercase text-[11px] tracking-wider text-[#FF9900]">
                Completed
              </span>
            </div>
          ) : record ? (
            <span className="text-[10px] font-mono font-bold uppercase text-[#FF9900]">
              Best P{record.bestPosition}
            </span>
          ) : race.isFinalBoss ? (
            <Crown className="w-5 h-5 text-[#FF9900]" />
          ) : race.isBoss ? (
            <Skull className="w-5 h-5 text-[#D32F2F]" />
          ) : null}
        </div>

        {/* Visual Track Map or Boss Car Preview */}
        {race.isBoss && race.bossProfile ? (
          <BossRivalPreview
            bodyColor={race.bossProfile.bodyColor}
            accentColor={race.bossProfile.accentColor}
            locked={locked}
          />
        ) : (
          <TrackSilhouette trackId={race.id} locked={locked} isBoss={race.isBoss} />
        )}

        {/* Title & Rival/Track Metadata */}
        <div>
          <h3 className="font-[family-name:var(--font-display)] italic font-black uppercase text-lg tracking-wide text-[#F4F4F4] leading-tight truncate group-hover:text-[#FF9900] transition-colors">
            {race.isBoss && race.bossProfile ? race.bossProfile.name : race.title}
          </h3>
          <div className="text-[11px] font-mono uppercase text-[#8E9299] truncate mt-0.5">
            {race.isBoss
              ? `${race.title} · ${race.laps} Laps`
              : `${race.difficulty} · ${Math.round(built.totalLength)}m · AI ${race.aiSpeedsKph[0]} KPH`}
          </div>
          {won && record && (
            <div className="text-[10px] font-mono tabular-nums text-[#FF9900] mt-0.5">
              Best: {formatTimeMs(record.bestTimeMs)}
            </div>
          )}
        </div>
      </div>

      {/* Card Bottom Action Bar */}
      <div className="mw-unslant relative z-0 mt-3 pt-2.5 border-t border-[#3A3E45] flex items-center justify-between gap-2 w-full">
        <div className="font-mono tabular-nums">
          <div className="text-[9px] uppercase tracking-wider text-[#8E9299]">
            {race.isBoss ? 'Winner Bounty' : '1st Prize'}
          </div>
          <div className="text-sm font-bold text-[#F4F4F4]">
            +${race.reward.toLocaleString()}
            {!race.isBoss && (
              <span className="text-[10px] text-[#8E9299] font-normal ml-1">
                (P2 ${getScaledPayout(race.reward, 2).toLocaleString()})
              </span>
            )}
          </div>
        </div>

        <span
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 font-[family-name:var(--font-display)] italic font-black uppercase text-xs tracking-wider transition-colors ${
            locked
              ? 'bg-[#0D0E10] border border-[#3A3E45] text-[#8E9299]'
              : race.isBoss
              ? 'bg-[#D32F2F] group-hover:bg-[#FF9900] text-white group-hover:text-[#0D0E10]'
              : 'bg-[#0D0E10] border border-[#3A3E45] group-hover:bg-[#FF9900] group-hover:border-[#FF9900] text-[#FF9900] group-hover:text-[#0D0E10]'
          }`}
        >
          {locked ? (
            <>
              <Lock className="w-3 h-3" />
              <span>Locked</span>
            </>
          ) : (
            <>
              <Flag className="w-3 h-3" />
              <span>{race.isBoss ? 'Duel' : won ? 'Replay' : 'Race'}</span>
            </>
          )}
        </span>
      </div>
    </button>
  );
}
