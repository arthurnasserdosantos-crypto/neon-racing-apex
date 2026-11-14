import React, { useEffect } from 'react';
import { ArrowLeft, Gauge, Paintbrush, Sparkles, Wrench } from 'lucide-react';
import { useGameStore } from '../store';
import { engineAudio } from '../utils/engineAudio';
import {
  ACCEL_TIERS,
  ENGINE_TIERS,
  HANDLING_TIERS,
  VEHICLE_CATALOG,
  getCarPerformanceSpecs,
} from '../utils/carTuning';

export function Garage() {
  const {
    car,
    ownedCarIds,
    selectedCarId,
    selectCar,
    updateCarColor,
    updateVinyl,
    upgradeStat,
    setView,
  } = useGameStore();

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

  const colors = [
    { label: 'Crimson', value: '#dc2626' },
    { label: 'Azure', value: '#2563eb' },
    { label: 'Emerald', value: '#059669' },
    { label: 'Onyx', value: '#18181b' },
    { label: 'Snow', value: '#f4f4f5' },
    { label: 'Gold', value: '#d97706' },
  ];

  const statCost = (level: number) => level * 500;
  const specs = getCarPerformanceSpecs(car);

  const nextEngineTier = car.speedLevel < 5 ? ENGINE_TIERS[car.speedLevel] : null;
  const nextAccelTier = car.accelLevel < 5 ? ACCEL_TIERS[car.accelLevel] : null;
  const nextHandlingTier = car.handlingLevel < 5 ? HANDLING_TIERS[car.handlingLevel] : null;

  return (
    <main className="flex-1 grid grid-cols-12 pointer-events-none h-full min-h-0">
      {/* Left/Center Spacer for 3D Car Focus */}
      <section className="col-span-12 md:col-span-7 lg:col-span-8 flex flex-col justify-end p-5 md:p-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => {
                engineAudio.playUiClick();
                setView('MENU');
              }}
              className="pointer-events-auto mw-slant bg-[#FF9900] hover:bg-[#E65100] border border-[#FF9900] px-5 py-2.5 text-[#0D0E10] transition-colors cursor-pointer"
            >
              <span className="mw-unslant flex items-center gap-2 font-[family-name:var(--font-display)] italic font-black uppercase text-sm tracking-wider">
                <ArrowLeft className="w-4 h-4" />
                <span>Menu [ESC]</span>
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                engineAudio.playUiClick();
                setView('CAR_LOT');
              }}
              className="pointer-events-auto mw-slant bg-[#00B0FF] hover:bg-[#0284c7] border border-[#00B0FF] px-4 py-2.5 text-[#0D0E10] transition-colors cursor-pointer shadow-[0_0_15px_rgba(0,176,255,0.35)]"
            >
              <span className="mw-unslant flex items-center gap-2 font-[family-name:var(--font-display)] italic font-black uppercase text-sm tracking-wider">
                <Sparkles className="w-4 h-4" />
                <span>Car Lot</span>
              </span>
            </button>
          </div>

          <div className="pointer-events-auto mw-slant bg-[#0D0E10]/92 border border-[#3A3E45] border-l-4 border-l-[#FF9900] px-5 py-2.5">
            <div className="mw-unslant flex flex-wrap items-center gap-5">
              <div className="flex items-center gap-2 font-[family-name:var(--font-display)] italic font-black uppercase text-sm tracking-wider text-[#FF9900]">
                <Gauge className="w-4 h-4" />
                <span>Dyno Specs</span>
              </div>
              <div className="text-xs font-mono tabular-nums text-[#8E9299]">
                TOP <strong className="text-[#F4F4F4]">{specs.topSpeedKph} KPH</strong>
              </div>
              <div className="text-xs font-mono tabular-nums text-[#8E9299]">
                0–60 <strong className="text-[#FF9900]">{specs.zeroToSixtySec.toFixed(2)}s</strong>
              </div>
              <div className="text-xs font-mono tabular-nums text-[#8E9299]">
                GRIP <strong className="text-[#F4F4F4]">{specs.gripScore}%</strong>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Right Sidebar: Customization & Performance Upgrades */}
      <section className="pointer-events-auto col-span-12 md:col-span-5 lg:col-span-4 bg-[#0D0E10]/94 border-l border-[#3A3E45] p-6 md:p-7 flex flex-col gap-5 overflow-y-auto">
        {/* Switch Owned Vehicle */}
        {ownedCarIds.length > 1 && (
          <div className="bg-[#1A1C20]/90 p-4 border border-[#3A3E45] space-y-2.5">
            <span className="font-[family-name:var(--font-display)] italic font-bold text-xs tracking-widest uppercase block text-[#8E9299]">
              Switch Active Vehicle
            </span>
            <div className="grid grid-cols-2 gap-2">
              {ownedCarIds.map((id) => {
                const def = VEHICLE_CATALOG.find((v) => v.id === id);
                const isCurrent = car.modelId === id || selectedCarId === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => {
                      engineAudio.playUiClick();
                      selectCar(id);
                    }}
                    className={`py-2 px-2.5 text-xs font-[family-name:var(--font-display)] italic font-black tracking-wider uppercase border transition-all cursor-pointer truncate ${
                      isCurrent
                        ? 'border-[#FF9900] bg-[#FF9900] text-[#0D0E10]'
                        : 'border-[#3A3E45] bg-[#0D0E10] text-[#8E9299] hover:text-[#F4F4F4] hover:border-[#FF9900]'
                    }`}
                  >
                    {def?.name || id}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 border-b border-[#3A3E45] pb-3.5">
          <Paintbrush className="w-4 h-4 text-[#FF9900]" />
          <span className="font-[family-name:var(--font-display)] italic font-black text-xl tracking-wider uppercase text-[#F4F4F4]">
            Visual Customization
          </span>
        </div>

        <div className="bg-[#1A1C20]/90 p-4 border border-[#3A3E45] space-y-4">
          <div>
            <span className="font-[family-name:var(--font-display)] italic font-bold text-xs tracking-widest uppercase block mb-2.5 text-[#8E9299]">
              Body Paint Shop
            </span>
            <div className="grid grid-cols-6 gap-2">
              {colors.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => {
                    engineAudio.playUiClick();
                    updateCarColor('color', c.value);
                  }}
                  className={`h-8 border transition-all cursor-pointer ${
                    car.color === c.value
                      ? 'ring-2 ring-[#FF9900] border-white scale-105'
                      : 'border-[#3A3E45] opacity-75 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: c.value }}
                  title={c.label}
                />
              ))}
            </div>
          </div>

          <div>
            <span className="font-[family-name:var(--font-display)] italic font-bold text-xs tracking-widest uppercase block mb-2.5 text-[#8E9299]">
              Alloy Wheel Finish
            </span>
            <div className="grid grid-cols-6 gap-2">
              {colors.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => {
                    engineAudio.playUiClick();
                    updateCarColor('wheelsColor', c.value);
                  }}
                  className={`h-6 border transition-all cursor-pointer ${
                    car.wheelsColor === c.value
                      ? 'ring-2 ring-[#FF9900] border-white scale-105'
                      : 'border-[#3A3E45] opacity-75 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: c.value }}
                  title={c.label}
                />
              ))}
            </div>
          </div>

          <div>
            <span className="font-[family-name:var(--font-display)] italic font-bold text-xs tracking-widest uppercase block mb-2.5 text-[#8E9299]">
              Vinyls &amp; Livery
            </span>
            <div className="grid grid-cols-3 gap-2.5">
              {/* None */}
              <button
                type="button"
                onClick={() => {
                  engineAudio.playUiClick();
                  updateVinyl('none');
                }}
                className={`p-2 flex flex-col items-center justify-between gap-1.5 border transition-all cursor-pointer ${
                  car.vinyl === 'none'
                    ? 'border-[#FF9900] bg-[#FF9900]/15 ring-2 ring-[#FF9900]'
                    : 'border-[#3A3E45] bg-[#0D0E10] hover:border-[#FF9900]/60'
                }`}
              >
                <div className="w-full h-10 rounded-sm bg-[#181A20] flex items-center justify-center border border-[#3A3E45]/80">
                  <span className="text-[9px] font-mono uppercase font-bold text-[#8E9299]">OEM Clean</span>
                </div>
                <span
                  className={`text-[10px] font-[family-name:var(--font-display)] italic font-black uppercase tracking-wider ${
                    car.vinyl === 'none' ? 'text-[#FF9900]' : 'text-[#8E9299]'
                  }`}
                >
                  None
                </span>
              </button>

              {/* Stripes */}
              <button
                type="button"
                onClick={() => {
                  engineAudio.playUiClick();
                  updateVinyl('stripes');
                }}
                className={`p-2 flex flex-col items-center justify-between gap-1.5 border transition-all cursor-pointer ${
                  car.vinyl === 'stripes'
                    ? 'border-[#FF9900] bg-[#FF9900]/15 ring-2 ring-[#FF9900]'
                    : 'border-[#3A3E45] bg-[#0D0E10] hover:border-[#FF9900]/60'
                }`}
              >
                <div className="w-full h-10 rounded-sm bg-[#181A20] flex items-center justify-center gap-1 border border-[#3A3E45]/80 px-3">
                  <div className="w-2 h-full bg-[#f8fafc]" />
                  <div className="w-2 h-full bg-[#f8fafc]" />
                </div>
                <span
                  className={`text-[10px] font-[family-name:var(--font-display)] italic font-black uppercase tracking-wider ${
                    car.vinyl === 'stripes' ? 'text-[#FF9900]' : 'text-[#8E9299]'
                  }`}
                >
                  GT Stripes
                </span>
              </button>

              {/* Flames with Image Preview */}
              <button
                type="button"
                onClick={() => {
                  engineAudio.playUiClick();
                  updateVinyl('flames');
                }}
                className={`p-2 flex flex-col items-center justify-between gap-1.5 border transition-all cursor-pointer ${
                  car.vinyl === 'flames'
                    ? 'border-[#FF9900] bg-[#FF9900]/15 ring-2 ring-[#FF9900]'
                    : 'border-[#3A3E45] bg-[#0D0E10] hover:border-[#FF9900]/60'
                }`}
              >
                <div className="w-full h-10 rounded-sm bg-[#090b0e] overflow-hidden flex items-center justify-center border border-[#3A3E45]/80 relative p-0.5">
                  <img
                    src="/assets/flames_vinyl.png"
                    alt="Flames Vinyl Preview"
                    className="w-full h-full object-contain filter drop-shadow-[0_0_6px_rgba(255,153,0,0.85)]"
                  />
                </div>
                <span
                  className={`text-[10px] font-[family-name:var(--font-display)] italic font-black uppercase tracking-wider ${
                    car.vinyl === 'flames' ? 'text-[#FF9900]' : 'text-[#8E9299]'
                  }`}
                >
                  Hot Flames
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Performance Upgrades */}
        <div className="flex items-center gap-2 border-b border-[#3A3E45] pb-3.5 pt-2">
          <Wrench className="w-4 h-4 text-[#FF9900]" />
          <span className="font-[family-name:var(--font-display)] italic font-black text-xl tracking-wider uppercase text-[#F4F4F4]">
            Performance Tuning
          </span>
        </div>

        <div className="flex flex-col gap-3.5 pb-6">
          <StatUpgrade
            name="Engine Stage"
            tierLabel={specs.engineTier.label}
            detail={
              nextEngineTier
                ? `Top Speed: ${specs.topSpeedKph} → ${nextEngineTier.topSpeedKph} KPH`
                : `Max Top Speed: ${specs.topSpeedKph} KPH`
            }
            tierTags={ENGINE_TIERS.map((t) => `${t.topSpeedKph}`)}
            level={car.speedLevel}
            cost={statCost(car.speedLevel)}
            onUpgrade={() => {
              engineAudio.playUiClick();
              upgradeStat('speedLevel', statCost(car.speedLevel));
            }}
          />
          <StatUpgrade
            name="Transmission"
            tierLabel={specs.accelTier.label}
            detail={
              nextAccelTier
                ? `0–60 KPH: ${specs.zeroToSixtySec.toFixed(2)}s → ${nextAccelTier.zeroToSixtySec.toFixed(2)}s`
                : `Peak Launch: ${specs.zeroToSixtySec.toFixed(2)}s (0–60 KPH)`
            }
            tierTags={ACCEL_TIERS.map((t) => `${t.zeroToSixtySec.toFixed(2)}s`)}
            level={car.accelLevel}
            cost={statCost(car.accelLevel)}
            onUpgrade={() => {
              engineAudio.playUiClick();
              upgradeStat('accelLevel', statCost(car.accelLevel));
            }}
          />
          <StatUpgrade
            name="Suspension"
            tierLabel={specs.handlingTier.label}
            detail={
              nextHandlingTier
                ? `Lateral Grip: ${specs.gripScore}% → ${nextHandlingTier.gripScore}%`
                : `Peak Lateral Grip: ${specs.gripScore}%`
            }
            tierTags={HANDLING_TIERS.map((t) => `${t.gripScore}%`)}
            level={car.handlingLevel}
            cost={statCost(car.handlingLevel)}
            onUpgrade={() => {
              engineAudio.playUiClick();
              upgradeStat('handlingLevel', statCost(car.handlingLevel));
            }}
          />
        </div>
      </section>
    </main>
  );
}

interface StatUpgradeProps {
  name: string;
  tierLabel: string;
  detail: string;
  tierTags: string[];
  level: number;
  cost: number;
  onUpgrade: () => void;
}

function StatUpgrade({
  name,
  tierLabel,
  detail,
  tierTags,
  level,
  cost,
  onUpgrade,
}: StatUpgradeProps) {
  const canUpgrade = level < 5;
  const cash = useGameStore((s) => s.cash);
  const affordable = cash >= cost;

  return (
    <div className="bg-[#1A1C20]/90 p-4 border border-[#3A3E45] hover:border-[#FF9900]/60 transition-colors flex flex-col justify-between">
      <div className="flex justify-between items-baseline mb-1">
        <div>
          <span className="font-[family-name:var(--font-display)] italic font-black text-base tracking-wider uppercase text-[#F4F4F4]">
            {name}
          </span>
          <span className="ml-2 text-[10px] font-mono uppercase text-[#8E9299]">
            {tierLabel}
          </span>
        </div>
        <span className="text-[11px] text-[#FF9900] font-mono font-bold tabular-nums">
          STAGE {level}/5
        </span>
      </div>
      <div className="text-[11px] font-mono tabular-nums text-[#F4F4F4]/90 mb-3">{detail}</div>

      <div className="grid grid-cols-5 gap-1 mb-1.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex flex-col gap-1">
            <div
              className={`h-1.5 ${i <= level ? 'bg-[#FF9900]' : 'bg-[#0D0E10] border border-[#3A3E45]'}`}
            />
            <span
              className={`text-[9px] font-mono tabular-nums text-center ${
                i === level ? 'text-[#FF9900] font-bold' : 'text-[#8E9299]'
              }`}
            >
              {tierTags[i - 1]}
            </span>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={onUpgrade}
        disabled={!canUpgrade || !affordable}
        className={`mt-2 w-full py-2 font-[family-name:var(--font-display)] italic font-black text-sm tracking-widest uppercase transition-colors flex justify-between px-3 items-center tabular-nums cursor-pointer ${
          !canUpgrade
            ? 'bg-[#0D0E10] text-[#8E9299] justify-center border border-[#3A3E45] cursor-default'
            : !affordable
            ? 'bg-[#D32F2F]/15 text-[#D32F2F] cursor-not-allowed border border-[#D32F2F]/40'
            : 'bg-[#FF9900] hover:bg-[#E65100] text-[#0D0E10] border border-[#FF9900]'
        }`}
      >
        <span>{canUpgrade ? 'Install Upgrade' : 'Max Stage Reached'}</span>
        {canUpgrade && <span className="font-mono text-xs">${cost.toLocaleString()}</span>}
      </button>
    </div>
  );
}
