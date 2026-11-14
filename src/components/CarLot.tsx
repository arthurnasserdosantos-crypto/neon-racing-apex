import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle,
  DollarSign,
  Fuel,
  Gauge,
  KeyRound,
  ShieldCheck,
  Sparkles,
  Weight,
  Wrench,
  Zap,
} from 'lucide-react';
import { useGameStore } from '../store';
import {
  CarModelId,
  VEHICLE_CATALOG,
  VehicleDefinition,
  getCarPerformanceSpecs,
} from '../utils/carTuning';
import { engineAudio } from '../utils/engineAudio';

export function CarLot() {
  const {
    cash,
    ownedCarIds,
    selectedCarId,
    cars,
    selectCar,
    buyCar,
    setView,
    setPreviewCarId,
  } = useGameStore();

  const [activeCarId, setActiveCarId] = useState<CarModelId>(selectedCarId);

  // Sync active previewed car with 3D showroom turntable
  useEffect(() => {
    setActiveCarId(selectedCarId);
  }, [selectedCarId]);

  useEffect(() => {
    setPreviewCarId(activeCarId);
    return () => setPreviewCarId(null);
  }, [activeCarId, setPreviewCarId]);

  // Keyboard navigation: ArrowLeft/Right to cycle, Enter to buy/equip, Esc to Menu
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        engineAudio.playUiClick();
        setView('MENU');
      } else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        engineAudio.playUiHover();
        const curIdx = VEHICLE_CATALOG.findIndex((v) => v.id === activeCarId);
        const nextIdx = (curIdx - 1 + VEHICLE_CATALOG.length) % VEHICLE_CATALOG.length;
        const nextCar = VEHICLE_CATALOG[nextIdx];
        setActiveCarId(nextCar.id);
        if (ownedCarIds.includes(nextCar.id)) {
          selectCar(nextCar.id);
        }
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        e.preventDefault();
        engineAudio.playUiHover();
        const curIdx = VEHICLE_CATALOG.findIndex((v) => v.id === activeCarId);
        const nextIdx = (curIdx + 1) % VEHICLE_CATALOG.length;
        const nextCar = VEHICLE_CATALOG[nextIdx];
        setActiveCarId(nextCar.id);
        if (ownedCarIds.includes(nextCar.id)) {
          selectCar(nextCar.id);
        }
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const isOwned = ownedCarIds.includes(activeCarId);
        if (isOwned) {
          selectCar(activeCarId);
          engineAudio.playUiClick();
        } else {
          const def = VEHICLE_CATALOG.find((v) => v.id === activeCarId);
          if (def && cash >= def.price) {
            buyCar(activeCarId);
            engineAudio.playUiClick();
          }
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeCarId, ownedCarIds, cash, selectCar, buyCar, setView]);

  const activeDef: VehicleDefinition =
    VEHICLE_CATALOG.find((v) => v.id === activeCarId) || VEHICLE_CATALOG[0];

  const carConfig = cars[activeCarId] || {
    speedLevel: 1,
    accelLevel: 1,
    handlingLevel: 1,
    modelId: activeCarId,
  };

  const specs = getCarPerformanceSpecs(carConfig, activeCarId);
  const isOwned = ownedCarIds.includes(activeCarId);
  const isEquipped = selectedCarId === activeCarId;
  const canAfford = cash >= activeDef.price;

  const handleSelectOrBuy = () => {
    engineAudio.playUiClick();
    if (isOwned) {
      selectCar(activeCarId);
    } else if (canAfford) {
      buyCar(activeCarId);
    }
  };

  return (
    <main className="flex-1 grid grid-cols-12 pointer-events-none h-full min-h-0">
      {/* Left/Center 3D Viewport Spacer */}
      <section className="col-span-12 md:col-span-7 lg:col-span-7 flex flex-col justify-between p-5 md:p-8">
        {/* Top Header Strip */}
        <div className="flex flex-wrap items-center justify-between gap-4">
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
              <span>Main Menu [ESC]</span>
            </span>
          </button>

          <div className="pointer-events-auto flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                engineAudio.playUiClick();
                setView('GARAGE');
              }}
              className="mw-slant bg-[#1A1C20]/95 hover:bg-[#FF9900] border border-[#3A3E45] hover:border-[#FF9900] text-[#F4F4F4] hover:text-[#0D0E10] px-4 py-2 transition-colors cursor-pointer"
            >
              <span className="mw-unslant flex items-center gap-2 font-[family-name:var(--font-display)] italic font-black uppercase text-xs tracking-wider">
                <Wrench className="w-3.5 h-3.5" />
                <span>Go To Garage</span>
              </span>
            </button>
          </div>
        </div>

        {/* Lower Left Vehicle Carousel Selector */}
        <div className="pointer-events-auto flex flex-col gap-3">
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-[#00B0FF]">
            <Sparkles className="w-4 h-4" />
            <span>Apex Dealership Showroom Floor</span>
          </div>

          <div className="flex flex-wrap gap-2.5">
            {VEHICLE_CATALOG.map((veh) => {
              const owned = ownedCarIds.includes(veh.id);
              const equipped = selectedCarId === veh.id;
              const isCurrent = activeCarId === veh.id;

              return (
                <button
                  key={veh.id}
                  type="button"
                  onClick={() => {
                    engineAudio.playUiClick();
                    setActiveCarId(veh.id);
                    if (owned) selectCar(veh.id);
                  }}
                  className={`mw-slant px-4 py-3 transition-all cursor-pointer border text-left min-w-[155px] ${
                    isCurrent
                      ? 'bg-[#00B0FF] border-[#00B0FF] text-[#0D0E10] shadow-[0_0_15px_rgba(0,176,255,0.4)]'
                      : 'bg-[#0D0E10]/90 border-[#3A3E45] hover:border-[#00B0FF] text-[#F4F4F4]'
                  }`}
                >
                  <div className="mw-unslant flex flex-col gap-0.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-mono uppercase font-bold tracking-wider opacity-80">
                        {veh.id.toUpperCase()}
                      </span>
                      {equipped ? (
                        <span className="text-[9px] font-mono px-1.5 py-0.2 bg-[#FF9900] text-[#0D0E10] font-black uppercase">
                          EQUIPPED
                        </span>
                      ) : owned ? (
                        <span className="text-[9px] font-mono px-1.5 py-0.2 bg-[#10b981] text-[#0D0E10] font-black uppercase">
                          OWNED
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono font-bold text-[#FF9900]">
                          ${veh.price.toLocaleString()}
                        </span>
                      )}
                    </div>
                    <div className="font-[family-name:var(--font-display)] italic font-black text-sm uppercase tracking-wide truncate">
                      {veh.name}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Right Sidebar: Vehicle Dossier, Specs & Purchase Button */}
      <section className="pointer-events-auto col-span-12 md:col-span-5 lg:col-span-5 bg-[#0D0E10]/95 border-l border-[#3A3E45] p-6 md:p-8 flex flex-col justify-between overflow-y-auto">
        <div className="flex flex-col gap-5">
          {/* Badge & Title */}
          <div className="border-b border-[#3A3E45] pb-4">
            <div className="flex items-center justify-between gap-3 mb-1">
              <span className="text-[11px] font-mono uppercase tracking-[0.25em] text-[#00B0FF] font-bold">
                {activeDef.tagline}
              </span>
              <span
                className={`text-[10px] font-mono font-black uppercase px-2 py-0.5 border ${
                  isEquipped
                    ? 'bg-[#FF9900] text-[#0D0E10] border-[#FF9900]'
                    : isOwned
                    ? 'bg-[#10b981]/20 text-[#10b981] border-[#10b981]/40'
                    : 'bg-[#3A3E45]/40 text-[#F4F4F4] border-[#3A3E45]'
                }`}
              >
                {isEquipped ? 'Currently In Use' : isOwned ? 'In Your Garage' : 'Available For Purchase'}
              </span>
            </div>
            <h1 className="font-[family-name:var(--font-display)] italic font-black uppercase text-3xl md:text-4xl tracking-wider text-[#F4F4F4] leading-tight">
              {activeDef.name}
            </h1>
            <p className="text-xs text-[#8E9299] mt-2 font-sans leading-relaxed">
              {activeDef.description}
            </p>
          </div>

          {/* Dyno Performance Specs */}
          <div className="bg-[#1A1C20]/90 border border-[#3A3E45] p-4 flex flex-col gap-4">
            <div className="flex items-center gap-2 border-b border-[#3A3E45]/60 pb-2">
              <Gauge className="w-4 h-4 text-[#FF9900]" />
              <span className="font-[family-name:var(--font-display)] italic font-black text-sm uppercase tracking-wider text-[#F4F4F4]">
                Factory Dyno Telemetry
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3.5">
              <div className="bg-[#0D0E10] p-3 border border-[#3A3E45]/80">
                <div className="text-[10px] font-mono text-[#8E9299] uppercase">Top Speed</div>
                <div className="text-xl font-[family-name:var(--font-display)] italic font-black text-[#F4F4F4] tabular-nums">
                  {specs.topSpeedKph}{' '}
                  <span className="text-xs font-mono font-normal text-[#8E9299]">KPH</span>
                </div>
                <div className="w-full bg-[#1A1C20] h-1.5 mt-2">
                  <div
                    className="bg-[#00B0FF] h-1.5 transition-all"
                    style={{ width: `${Math.min(100, (specs.topSpeedKph / 290) * 100)}%` }}
                  />
                </div>
              </div>

              <div className="bg-[#0D0E10] p-3 border border-[#3A3E45]/80">
                <div className="text-[10px] font-mono text-[#8E9299] uppercase">0–60 Launch</div>
                <div className="text-xl font-[family-name:var(--font-display)] italic font-black text-[#FF9900] tabular-nums">
                  {specs.zeroToSixtySec.toFixed(2)}{' '}
                  <span className="text-xs font-mono font-normal text-[#8E9299]">SEC</span>
                </div>
                <div className="w-full bg-[#1A1C20] h-1.5 mt-2">
                  <div
                    className="bg-[#FF9900] h-1.5 transition-all"
                    style={{ width: `${Math.min(100, (1.8 / Math.max(0.6, specs.zeroToSixtySec)) * 60)}%` }}
                  />
                </div>
              </div>

              <div className="bg-[#0D0E10] p-3 border border-[#3A3E45]/80">
                <div className="text-[10px] font-mono text-[#8E9299] uppercase">Lateral Grip</div>
                <div className="text-xl font-[family-name:var(--font-display)] italic font-black text-[#38bdf8] tabular-nums">
                  {specs.gripScore}
                  <span className="text-xs font-mono font-normal text-[#8E9299]"> / 100</span>
                </div>
                <div className="w-full bg-[#1A1C20] h-1.5 mt-2">
                  <div
                    className="bg-[#38bdf8] h-1.5 transition-all"
                    style={{ width: `${Math.min(100, specs.gripScore)}%` }}
                  />
                </div>
              </div>

              <div className="bg-[#0D0E10] p-3 border border-[#3A3E45]/80">
                <div className="text-[10px] font-mono text-[#8E9299] uppercase">Drivetrain</div>
                <div className="text-sm font-[family-name:var(--font-display)] italic font-black text-[#F4F4F4] truncate mt-1">
                  {activeDef.drivetrain}
                </div>
                <div className="text-[10px] font-mono text-[#8E9299] mt-1">
                  Weight: {activeDef.weightKg} kg
                </div>
              </div>
            </div>
          </div>

          {/* Pricing & Balance Box */}
          <div className="bg-[#1A1C20]/90 border border-[#3A3E45] p-4 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[10px] font-mono uppercase text-[#8E9299]">Car Lot Price</span>
              <span className="text-2xl font-[family-name:var(--font-display)] italic font-black text-[#FF9900] tabular-nums">
                {activeDef.price === 0 ? 'FREE / STARTER' : `$${activeDef.price.toLocaleString()}`}
              </span>
            </div>
            <div className="flex flex-col text-right">
              <span className="text-[10px] font-mono uppercase text-[#8E9299]">Your Cash Bounty</span>
              <span className="text-xl font-mono font-bold text-[#F4F4F4] tabular-nums">
                ${cash.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Action Button Strip */}
        <div className="pt-6 border-t border-[#3A3E45] flex flex-col gap-3">
          {isEquipped ? (
            <button
              type="button"
              disabled
              className="w-full py-3.5 bg-[#FF9900]/20 border border-[#FF9900] text-[#FF9900] font-[family-name:var(--font-display)] italic font-black text-base uppercase tracking-widest flex items-center justify-center gap-2 cursor-default"
            >
              <CheckCircle className="w-5 h-5 text-[#FF9900]" />
              <span>Currently Equipped</span>
            </button>
          ) : isOwned ? (
            <button
              type="button"
              onClick={handleSelectOrBuy}
              className="w-full py-3.5 bg-[#FF9900] hover:bg-[#E65100] text-[#0D0E10] border border-[#FF9900] font-[family-name:var(--font-display)] italic font-black text-base uppercase tracking-widest flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-lg"
            >
              <KeyRound className="w-5 h-5" />
              <span>Drive This Vehicle [ENTER]</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSelectOrBuy}
              disabled={!canAfford}
              className={`w-full py-3.5 font-[family-name:var(--font-display)] italic font-black text-base uppercase tracking-widest flex items-center justify-center gap-2 transition-colors border ${
                canAfford
                  ? 'bg-[#00B0FF] hover:bg-[#0284c7] text-[#0D0E10] border-[#00B0FF] cursor-pointer shadow-[0_0_20px_rgba(0,176,255,0.4)]'
                  : 'bg-[#D32F2F]/15 text-[#D32F2F] border-[#D32F2F]/40 cursor-not-allowed'
              }`}
            >
              <DollarSign className="w-5 h-5" />
              <span>
                {canAfford
                  ? `Purchase For $${activeDef.price.toLocaleString()} [ENTER]`
                  : `Insufficient Funds ($${activeDef.price.toLocaleString()})`}
              </span>
            </button>
          )}

          <div className="flex items-center justify-between text-[11px] font-mono text-[#8E9299] px-1">
            <span>[← / →] Browse Vehicles</span>
            <span>[ESC] Return</span>
          </div>
        </div>
      </section>
    </main>
  );
}
