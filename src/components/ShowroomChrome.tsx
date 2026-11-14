import React from 'react';
import { ShieldAlert, Trophy, Wallet } from 'lucide-react';
import { useGameStore } from '../store';
import { getBlacklistRankSummary, getProgressionStatus } from '../utils/raceTracks';
import { getVehicleDefinition } from '../utils/carTuning';

export function PlayerRapSheet() {
  const driverAlias = useGameStore((s) => s.driverAlias);
  const cash = useGameStore((s) => s.cash);
  const completedRaces = useGameStore((s) => s.completedRaces);
  const car = useGameStore((s) => s.car);

  const rank = getBlacklistRankSummary(completedRaces);
  const totalStage = car.speedLevel + car.accelLevel + car.handlingLevel;

  return (
    <div className="pointer-events-auto inline-block mw-slant bg-[#0D0E10]/92 border border-[#3A3E45] border-l-4 border-l-[#FF9900] px-6 py-3 shadow-2xl">
      <div className="mw-unslant flex flex-wrap items-center gap-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-[#1A1C20] border border-[#3A3E45] flex items-center justify-center shrink-0">
            <ShieldAlert className="w-4 h-4 text-[#FF9900]" />
          </div>
          <div>
            <div className="text-[10px] font-mono uppercase tracking-[0.22em] text-[#8E9299] leading-none">
              Driver Rap Sheet
            </div>
            <div className="font-[family-name:var(--font-display)] italic font-extrabold uppercase text-xl tracking-wide text-[#F4F4F4] leading-tight mt-0.5">
              {driverAlias}
            </div>
          </div>
        </div>

        <div className="h-8 w-px bg-[#3A3E45] hidden sm:block" />

        <div>
          <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#8E9299] leading-none">
            Blacklist Status
          </div>
          <div className="font-[family-name:var(--font-display)] italic font-extrabold uppercase text-base tracking-wider text-[#FF9900] leading-tight mt-1 tabular-nums">
            {rank.rankLabel}
          </div>
        </div>

        <div className="h-8 w-px bg-[#3A3E45] hidden md:block" />

        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 text-[#FF9900] shrink-0" />
          <div>
            <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#8E9299] leading-none">
              Completed
            </div>
            <div className="font-mono font-bold text-sm text-[#F4F4F4] tabular-nums leading-tight mt-1">
              {rank.totalWins} / {rank.totalEvents} RACES
            </div>
          </div>
        </div>

        <div className="h-8 w-px bg-[#3A3E45] hidden sm:block" />

        <div className="flex items-center gap-2">
          <Wallet className="w-4 h-4 text-[#FF9900] shrink-0" />
          <div>
            <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#8E9299] leading-none">
              Bounty / Cash
            </div>
            <div className="font-mono font-bold text-sm text-[#F4F4F4] tabular-nums leading-tight mt-1">
              ${cash.toLocaleString()}
              <span className="ml-2 text-[11px] text-[#FF9900]">· {getVehicleDefinition(car.modelId || 'starter').name.toUpperCase()} (S{totalStage})</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface ControlHint {
  keyLabel: string;
  action: string;
}

export function BottomControlTicker({ hints }: { hints: ControlHint[] }) {
  const driverAlias = useGameStore((s) => s.driverAlias);
  const cash = useGameStore((s) => s.cash);
  const completedRaces = useGameStore((s) => s.completedRaces);
  const prog = getProgressionStatus(completedRaces);

  const nextTarget = prog.finalBossDefeated
    ? 'GRAND CHAMPION STATUS CONFIRMED — ALL BLACKLIST RIVALS CLEARED'
    : prog.finalBossUnlocked
    ? 'FINAL BOSS ALERT: APEX SOVEREIGN AWAITS IN 1V1 CHAMPIONSHIP FINALE'
    : prog.act2Unlocked
    ? `ACT II APEX SERIES LIVE — ${prog.act2Wins}/${prog.act2Total} EVENTS CONQUERED`
    : prog.boss1Unlocked
    ? 'BOSS 1 SHOWDOWN UNLOCKED: CHALLENGE OBSIDIAN PHANTOM TO ENTER ACT II'
    : `ACT I SYNDICATE QUALIFIERS — WIN ${prog.act1Total - prog.act1Wins} MORE RACE(S) TO UNLOCK BOSS 1`;

  const scannerFeed = `STREET SCANNER // UNIT 04: ${driverAlias} BOUNTY $${cash.toLocaleString()} // ${nextTarget} // HIGH-SPEED INTERCEPTORS DEPLOYED ON INDUSTRIAL VIADUCT // AVOID SPIKE STRIPS AND MAINTAIN SPEED`;

  return (
    <footer className="relative z-30 pointer-events-auto w-full bg-[#0D0E10]/95 border-t border-[#3A3E45] px-4 md:px-8 h-10 flex items-center justify-between gap-6 shrink-0">
      <div className="flex items-center gap-4 shrink-0 overflow-x-auto">
        {hints.map((h) => (
          <div key={h.keyLabel} className="flex items-center gap-1.5 whitespace-nowrap">
            <span className="px-1.5 py-0.5 bg-[#1A1C20] border border-[#3A3E45] text-[10px] font-mono font-bold text-[#FF9900] uppercase">
              {h.keyLabel}
            </span>
            <span className="text-[11px] font-[family-name:var(--font-display)] italic font-bold uppercase tracking-wider text-[#F4F4F4]">
              {h.action}
            </span>
          </div>
        ))}
      </div>

      <div className="hidden md:flex flex-1 min-w-0 items-center gap-3 overflow-hidden border-l border-[#3A3E45] pl-4">
        <span className="shrink-0 px-2 py-0.5 bg-[#FF9900] text-[#0D0E10] text-[10px] font-[family-name:var(--font-display)] italic font-black uppercase tracking-widest">
          Scanner
        </span>
        <div className="flex-1 min-w-0 overflow-hidden relative">
          <div className="mw-ticker-track text-[11px] font-mono uppercase tracking-wider text-[#8E9299]">
            <span className="pr-12">{scannerFeed}</span>
            <span className="pr-12" aria-hidden="true">
              {scannerFeed}
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
