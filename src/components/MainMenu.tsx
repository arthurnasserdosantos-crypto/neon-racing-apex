import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ChevronRight,
  Compass,
  Flag,
  Gauge,
  RotateCcw,
  Settings,
  Sliders,
  Sparkles,
  Volume2,
  VolumeX,
  Wrench,
  X,
  Zap,
} from 'lucide-react';
import { useGameStore } from '../store';
import { getCarPerformanceSpecs } from '../utils/carTuning';
import { engineAudio } from '../utils/engineAudio';
import {
  getBuiltRaceTrack,
  getProgressionStatus,
  getQuickRaceTrackId,
} from '../utils/raceTracks';

interface NavOption {
  id: 'CAREER' | 'GARAGE' | 'CAR_LOT' | 'QUICK_RACE' | 'FREE_ROAM' | 'OPTIONS';
  label: string;
  tag: string;
  icon: React.ReactNode;
}

export function MainMenu() {
  const setView = useGameStore((s) => s.setView);
  const startRace = useGameStore((s) => s.startRace);
  const car = useGameStore((s) => s.car);
  const ownedCarIds = useGameStore((s) => s.ownedCarIds);
  const completedRaces = useGameStore((s) => s.completedRaces);
  const driverAlias = useGameStore((s) => s.driverAlias);
  const setDriverAlias = useGameStore((s) => s.setDriverAlias);
  const autoOrbitCam = useGameStore((s) => s.autoOrbitCam);
  const setAutoOrbitCam = useGameStore((s) => s.setAutoOrbitCam);
  const resetProgression = useGameStore((s) => s.resetProgression);

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [aliasDraft, setAliasDraft] = useState(driverAlias);
  const [audioMuted, setAudioMuted] = useState(() => engineAudio.isMuted());
  const [masterVolume, setMasterVolume] = useState(() =>
    Math.round(engineAudio.getMasterVolume() * 100),
  );
  const [confirmReset, setConfirmReset] = useState(false);

  useEffect(() => {
    setAliasDraft(driverAlias);
  }, [driverAlias]);

  const specs = getCarPerformanceSpecs(car);
  const prog = getProgressionStatus(completedRaces);
  const quickTrackId = useMemo(() => getQuickRaceTrackId(completedRaces), [completedRaces]);
  const quickTrack = useMemo(() => getBuiltRaceTrack(quickTrackId), [quickTrackId]);

  const careerTag = prog.finalBossDefeated
    ? 'ALL CLEARED'
    : prog.finalBossUnlocked
    ? 'FINAL BOSS READY'
    : prog.act2Unlocked
    ? `ACT II · ${prog.act2Wins}/${prog.act2Total}`
    : prog.boss1Unlocked
    ? 'BOSS 1 READY'
    : `ACT I · ${prog.act1Wins}/${prog.act1Total}`;

  const navOptions: NavOption[] = useMemo(
    () => [
      {
        id: 'CAREER',
        label: 'CAREER / RACE SELECT',
        tag: careerTag,
        icon: <Flag className="w-4 h-4" />,
      },
      {
        id: 'GARAGE',
        label: 'GARAGE',
        tag: `S${car.speedLevel + car.accelLevel + car.handlingLevel} TUNING`,
        icon: <Wrench className="w-4 h-4" />,
      },
      {
        id: 'CAR_LOT',
        label: 'CAR LOT / DEALERSHIP',
        tag: `${ownedCarIds.length}/3 CARS`,
        icon: <Sparkles className="w-4 h-4" />,
      },
      {
        id: 'QUICK_RACE',
        label: 'QUICK RACE',
        tag: quickTrack.title.toUpperCase(),
        icon: <Zap className="w-4 h-4" />,
      },
      {
        id: 'FREE_ROAM',
        label: 'FREE ROAM',
        tag: 'URBAN CITY 2X',
        icon: <Compass className="w-4 h-4" />,
      },
      {
        id: 'OPTIONS',
        label: 'OPTIONS',
        tag: optionsOpen ? 'OPEN' : 'SETTINGS',
        icon: <Settings className="w-4 h-4" />,
      },
    ],
    [
      careerTag,
      car.speedLevel,
      car.accelLevel,
      car.handlingLevel,
      ownedCarIds.length,
      quickTrack.title,
      optionsOpen,
    ],
  );

  const activateOption = useCallback(
    (id: NavOption['id']) => {
      engineAudio.playUiClick();
      if (id === 'CAREER') {
        setView('CAREER');
      } else if (id === 'GARAGE') {
        setView('GARAGE');
      } else if (id === 'CAR_LOT') {
        setView('CAR_LOT');
      } else if (id === 'QUICK_RACE') {
        startRace(quickTrackId);
      } else if (id === 'FREE_ROAM') {
        setView('FREE_ROAM');
      } else if (id === 'OPTIONS') {
        setOptionsOpen((prev) => !prev);
      }
    },
    [setView, startRace, quickTrackId],
  );

  // Keyboard navigation matching bottom ticker: W/S or ArrowUp/Down, Enter, Esc
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        if (e.key === 'Escape') {
          (e.target as HTMLElement).blur();
        }
        return;
      }

      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        e.preventDefault();
        engineAudio.playUiHover();
        setSelectedIndex((prev) => (prev - 1 + navOptions.length) % navOptions.length);
      } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        e.preventDefault();
        engineAudio.playUiHover();
        setSelectedIndex((prev) => (prev + 1) % navOptions.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        activateOption(navOptions[selectedIndex].id);
      } else if (e.key === 'Escape' && optionsOpen) {
        e.preventDefault();
        engineAudio.playUiClick();
        setOptionsOpen(false);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [navOptions, selectedIndex, optionsOpen, activateOption]);

  return (
    <main className="flex-1 relative px-5 md:px-10 py-6 flex flex-col justify-end min-h-0">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 w-full">
        {/* Lower-Left Brand Lockup + Slanted Vertical Navigation Stack */}
        <div className="flex flex-col md:flex-row md:items-end gap-6 pointer-events-auto">
          <div className="w-full max-w-[390px]">
            {/* Title Block preserving Fondamento title + NFSMW 2005 condensed kicker */}
            <div className="mb-6 pl-2">
              <div className="inline-block mw-slant bg-[#FF9900] px-3 py-0.5 mb-2">
                <span className="mw-unslant block font-[family-name:var(--font-display)] italic font-black uppercase text-[11px] tracking-[0.24em] text-[#0D0E10]">
                  Most Wanted · Street Syndicate
                </span>
              </div>
              <h1 className="font-[family-name:var(--font-fondamento)] text-5xl md:text-6xl text-[#F4F4F4] leading-none tracking-tight drop-shadow-[0_4px_18px_rgba(0,0,0,0.9)]">
                Neon Apex
              </h1>
              <p className="font-[family-name:var(--font-display)] italic font-bold uppercase text-sm tracking-[0.18em] text-[#8E9299] mt-1.5">
                Urban Underground Circuit &amp; Blacklist Duels
              </p>
            </div>

            {/* Slanted Vertical Navigation Stack */}
            <nav aria-label="Main Menu" className="flex flex-col gap-2.5 pl-2">
              {navOptions.map((item, idx) => {
                const isSelected = selectedIndex === idx || (item.id === 'OPTIONS' && optionsOpen);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onMouseEnter={() => {
                      if (selectedIndex !== idx) {
                        engineAudio.playUiHover();
                        setSelectedIndex(idx);
                      }
                    }}
                    onFocus={() => setSelectedIndex(idx)}
                    onClick={() => activateOption(item.id)}
                    className={`group relative w-full text-left mw-slant border transition-all duration-150 ease-out px-5 py-3.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF9900] ${
                      isSelected
                        ? 'translate-x-3 bg-[#FF9900] border-[#FF9900] text-[#0D0E10] shadow-[0_8px_24px_rgba(255,153,0,0.28)]'
                        : 'bg-[#1A1C20]/90 border-[#3A3E45] text-[#F4F4F4] hover:translate-x-3 hover:bg-[#FF9900] hover:border-[#FF9900] hover:text-[#0D0E10]'
                    }`}
                  >
                    <div className="mw-unslant flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <span
                          className={`shrink-0 ${
                            isSelected ? 'text-[#0D0E10]' : 'text-[#FF9900] group-hover:text-[#0D0E10]'
                          }`}
                        >
                          {item.icon}
                        </span>
                        <span className="font-[family-name:var(--font-display)] italic font-black uppercase text-xl tracking-wider whitespace-nowrap truncate">
                          {item.label}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={`text-[10px] font-mono font-bold uppercase tracking-wider whitespace-nowrap ${
                            isSelected
                              ? 'text-[#0D0E10]/85'
                              : 'text-[#8E9299] group-hover:text-[#0D0E10]/85'
                          }`}
                        >
                          {item.tag}
                        </span>
                        <ChevronRight className="w-4 h-4 shrink-0" />
                      </div>
                    </div>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Slanted Options Drawer when OPTIONS is toggled */}
          {optionsOpen && (
            <section
              aria-label="Game Options"
              className="w-full max-w-[350px] mw-slant bg-[#0D0E10]/94 border border-[#3A3E45] border-l-4 border-l-[#FF9900] p-5 shadow-2xl"
            >
              <div className="mw-unslant space-y-4">
                <div className="flex items-center justify-between border-b border-[#3A3E45] pb-2.5">
                  <div className="flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-[#FF9900]" />
                    <h2 className="font-[family-name:var(--font-display)] italic font-black uppercase text-lg tracking-wider text-[#F4F4F4]">
                      System Options
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      engineAudio.playUiClick();
                      setOptionsOpen(false);
                    }}
                    className="p-1 text-[#8E9299] hover:text-[#FF9900] transition-colors"
                    aria-label="Close Options"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Driver Alias Input */}
                <div>
                  <label
                    htmlFor="driver-alias-input"
                    className="block text-[10px] font-mono uppercase tracking-[0.2em] text-[#8E9299] mb-1.5"
                  >
                    Blacklist Alias
                  </label>
                  <div className="flex gap-2">
                    <input
                      id="driver-alias-input"
                      type="text"
                      maxLength={18}
                      value={aliasDraft}
                      onChange={(e) => setAliasDraft(e.target.value.toUpperCase())}
                      onBlur={() => setDriverAlias(aliasDraft)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          setDriverAlias(aliasDraft);
                          engineAudio.playUiClick();
                        }
                      }}
                      className="flex-1 bg-[#1A1C20] border border-[#3A3E45] focus:border-[#FF9900] px-3 py-1.5 text-xs font-mono font-bold uppercase text-[#F4F4F4] outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setDriverAlias(aliasDraft);
                        engineAudio.playUiClick();
                      }}
                      className="px-3 py-1.5 bg-[#FF9900] hover:bg-[#E65100] text-[#0D0E10] font-[family-name:var(--font-display)] italic font-black uppercase text-xs tracking-wider"
                    >
                      Save
                    </button>
                  </div>
                </div>

                {/* Engine & UI Audio Controls */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#8E9299]">
                      Audio Output
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        engineAudio.unlock();
                        const muted = engineAudio.toggleMute();
                        setAudioMuted(muted);
                        if (!muted) engineAudio.playUiClick();
                      }}
                      className={`flex items-center gap-1.5 px-2.5 py-1 border text-[10px] font-mono font-bold uppercase ${
                        audioMuted
                          ? 'bg-[#1A1C20] border-[#D32F2F] text-[#D32F2F]'
                          : 'bg-[#FF9900] border-[#FF9900] text-[#0D0E10]'
                      }`}
                    >
                      {audioMuted ? (
                        <VolumeX className="w-3.5 h-3.5" />
                      ) : (
                        <Volume2 className="w-3.5 h-3.5" />
                      )}
                      <span>{audioMuted ? 'Muted' : 'Active'}</span>
                    </button>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={masterVolume}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setMasterVolume(val);
                        engineAudio.setMasterVolume(val / 100);
                      }}
                      aria-label="Master Volume"
                      className="flex-1 accent-[#FF9900] cursor-pointer"
                    />
                    <span className="text-xs font-mono tabular-nums text-[#F4F4F4] w-9 text-right">
                      {masterVolume}%
                    </span>
                  </div>
                </div>

                {/* Showroom Auto-Orbit Camera Toggle */}
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#8E9299]">
                    Cinematic Orbit Cam
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      engineAudio.playUiClick();
                      setAutoOrbitCam(!autoOrbitCam);
                    }}
                    className={`px-3 py-1 border text-[10px] font-mono font-bold uppercase transition-colors ${
                      autoOrbitCam
                        ? 'bg-[#FF9900] border-[#FF9900] text-[#0D0E10]'
                        : 'bg-[#1A1C20] border-[#3A3E45] text-[#8E9299]'
                    }`}
                  >
                    {autoOrbitCam ? 'Auto Pan ON' : 'Manual Only'}
                  </button>
                </div>

                {/* Reset Career Save */}
                <div className="pt-2 border-t border-[#3A3E45]">
                  {!confirmReset ? (
                    <button
                      type="button"
                      onClick={() => {
                        engineAudio.playUiClick();
                        setConfirmReset(true);
                      }}
                      className="w-full flex items-center justify-center gap-2 py-2 bg-[#1A1C20] hover:bg-[#D32F2F] border border-[#3A3E45] hover:border-[#D32F2F] text-[#8E9299] hover:text-white text-xs font-[family-name:var(--font-display)] italic font-bold uppercase tracking-wider transition-colors"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Reset Blacklist Save</span>
                    </button>
                  ) : (
                    <div className="flex items-center justify-between gap-2 bg-[#D32F2F]/15 border border-[#D32F2F] px-3 py-1.5">
                      <span className="text-[10px] font-mono uppercase text-[#F4F4F4]">
                        Wipe progress?
                      </span>
                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            engineAudio.playUiClick();
                            resetProgression();
                            setConfirmReset(false);
                          }}
                          className="px-2.5 py-0.5 bg-[#D32F2F] text-white text-[10px] font-mono font-bold uppercase"
                        >
                          Yes
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmReset(false)}
                          className="px-2.5 py-0.5 bg-[#1A1C20] border border-[#3A3E45] text-[#F4F4F4] text-[10px] font-mono font-bold uppercase"
                        >
                          No
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </section>
          )}
        </div>

        {/* Bottom-Right Compact Car Telemetry Strip (leaves 3D vehicle unobstructed) */}
        <aside className="hidden lg:flex flex-col items-end gap-2.5 pointer-events-none">
          <div className="mw-slant bg-[#0D0E10]/90 border border-[#3A3E45] border-l-4 border-l-[#FF9900] px-5 py-3 shadow-2xl">
            <div className="mw-unslant flex items-center gap-5">
              <div className="flex items-center gap-2">
                <Gauge className="w-4 h-4 text-[#FF9900]" />
                <span className="font-[family-name:var(--font-display)] italic font-extrabold uppercase text-sm tracking-wider text-[#F4F4F4]">
                  Active Spec
                </span>
              </div>

              <div className="flex items-center gap-4 text-xs font-mono tabular-nums">
                <div>
                  <span className="text-[#8E9299] mr-1.5">TOP</span>
                  <strong className="text-[#F4F4F4]">{specs.topSpeedKph} KPH</strong>
                </div>
                <span className="text-[#3A3E45]">/</span>
                <div>
                  <span className="text-[#8E9299] mr-1.5">0–60</span>
                  <strong className="text-[#FF9900]">{specs.zeroToSixtySec.toFixed(2)}s</strong>
                </div>
                <span className="text-[#3A3E45]">/</span>
                <div>
                  <span className="text-[#8E9299] mr-1.5">GRIP</span>
                  <strong className="text-[#F4F4F4]">{specs.gripScore}%</strong>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
