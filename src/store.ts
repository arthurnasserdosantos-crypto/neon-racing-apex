import { create } from 'zustand';
import {
  ACT1_BOSS_ID,
  FINAL_BOSS_ID,
  getBuiltRaceTrack,
  getProgressionStatus,
  getScaledPayout,
  isTrackUnlocked,
  RaceCompletionRecord,
} from './utils/raceTracks';
import { CarModelId, VEHICLE_CATALOG, getVehicleDefinition } from './utils/carTuning';

export type ViewState = 'MENU' | 'GARAGE' | 'CAREER' | 'FREE_ROAM' | 'RACE' | 'CAR_LOT';

export interface CarBuildConfig {
  modelId: CarModelId;
  color: string;
  wheelsColor: string;
  speedLevel: number;
  accelLevel: number;
  handlingLevel: number;
  vinyl: 'none' | 'stripes' | 'flames';
}

interface PersistedSaveData {
  cash: number;
  driverAlias: string;
  autoOrbitCam: boolean;
  selectedCarId: CarModelId;
  ownedCarIds: CarModelId[];
  cars: Record<string, CarBuildConfig>;
  car: CarBuildConfig;
  completedRaces: Record<string, RaceCompletionRecord>;
}

const SAVE_STORAGE_KEY = 'neon_apex_progression_v1';

export const DEFAULT_CARS: Record<CarModelId, CarBuildConfig> = {
  starter: {
    modelId: 'starter',
    color: '#dc2626',
    wheelsColor: '#27272a',
    speedLevel: 1,
    accelLevel: 1,
    handlingLevel: 1,
    vinyl: 'none',
  },
  tuner: {
    modelId: 'tuner',
    color: '#00B0FF',
    wheelsColor: '#f4f4f5',
    speedLevel: 2,
    accelLevel: 3,
    handlingLevel: 3,
    vinyl: 'stripes',
  },
  supercar: {
    modelId: 'supercar',
    color: '#FF9900',
    wheelsColor: '#18181b',
    speedLevel: 4,
    accelLevel: 4,
    handlingLevel: 2,
    vinyl: 'flames',
  },
};

function loadSavedProgress(): PersistedSaveData {
  const fallback: PersistedSaveData = {
    cash: 1500,
    driverAlias: 'NIGHT_RUNNER',
    autoOrbitCam: true,
    selectedCarId: 'starter',
    ownedCarIds: ['starter'],
    cars: { ...DEFAULT_CARS },
    car: { ...DEFAULT_CARS.starter },
    completedRaces: {},
  };

  if (typeof window === 'undefined') {
    return fallback;
  }

  try {
    const raw = window.localStorage.getItem(SAVE_STORAGE_KEY);
    if (!raw) return fallback;

    const parsed = JSON.parse(raw) as Partial<PersistedSaveData>;
    const ownedCarIds: CarModelId[] =
      Array.isArray(parsed.ownedCarIds) && parsed.ownedCarIds.length > 0
        ? (parsed.ownedCarIds.filter((id) =>
            VEHICLE_CATALOG.some((v) => v.id === id),
          ) as CarModelId[])
        : ['starter'];

    if (!ownedCarIds.includes('starter')) {
      ownedCarIds.unshift('starter');
    }

    const selectedCarId: CarModelId =
      parsed.selectedCarId && ownedCarIds.includes(parsed.selectedCarId)
        ? parsed.selectedCarId
        : ownedCarIds[0] || 'starter';

    const cars: Record<string, CarBuildConfig> = {
      ...DEFAULT_CARS,
      ...(parsed.cars || {}),
    };

    // If an older save had `parsed.car`, port it into `cars.starter`
    if (parsed.car) {
      cars.starter = {
        ...DEFAULT_CARS.starter,
        ...parsed.car,
        modelId: 'starter',
      };
    }

    const activeCar = cars[selectedCarId] || cars.starter || DEFAULT_CARS.starter;

    return {
      cash: typeof parsed.cash === 'number' && Number.isFinite(parsed.cash) ? parsed.cash : 1500,
      driverAlias:
        typeof parsed.driverAlias === 'string' && parsed.driverAlias.trim().length > 0
          ? parsed.driverAlias.trim().slice(0, 18).toUpperCase()
          : 'NIGHT_RUNNER',
      autoOrbitCam: typeof parsed.autoOrbitCam === 'boolean' ? parsed.autoOrbitCam : true,
      selectedCarId,
      ownedCarIds,
      cars,
      car: activeCar,
      completedRaces:
        parsed.completedRaces && typeof parsed.completedRaces === 'object'
          ? parsed.completedRaces
          : {},
    };
  } catch {
    return fallback;
  }
}

function persistProgress(data: PersistedSaveData) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(SAVE_STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Ignore storage quota / private-browsing errors cleanly
  }
}

export interface GameState {
  view: ViewState;
  cash: number;
  driverAlias: string;
  autoOrbitCam: boolean;
  selectedCarId: CarModelId;
  ownedCarIds: CarModelId[];
  cars: Record<string, CarBuildConfig>;
  car: CarBuildConfig;
  raceState: 'idle' | 'countdown' | 'racing' | 'finished';
  raceSessionId: number;
  countdownValue: 3 | 2 | 1 | 0 | null;
  activeTrackId: string;
  raceTime: number;
  raceStartTime: number;
  raceDistance: number;
  raceLaps: number;
  raceTitle: string;
  raceIsBoss: boolean;
  raceParticipantCount: number;
  racePlacement: number;
  baseReward: number;
  currentReward: number;
  currentSpeed: number;
  justUnlockedAct2: boolean;
  justCompletedGame: boolean;
  completedRaces: Record<string, RaceCompletionRecord>;
  previewCarId: CarModelId | null;
  devOpen: boolean;

  // Actions
  setView: (view: ViewState) => void;
  setPreviewCarId: (id: CarModelId | null) => void;
  setDevOpen: (open: boolean) => void;
  setCash: (amount: number) => void;
  setCarStat: (stat: 'speedLevel' | 'accelLevel' | 'handlingLevel', level: number) => void;
  unlockAllCars: () => void;
  unlockAllRaces: () => void;
  setDriverAlias: (alias: string) => void;
  setAutoOrbitCam: (enabled: boolean) => void;
  addCash: (amount: number) => void;
  spendCash: (amount: number) => boolean;
  selectCar: (carId: CarModelId) => boolean;
  buyCar: (carId: CarModelId) => boolean;
  updateCarColor: (part: 'color' | 'wheelsColor', color: string) => void;
  updateVinyl: (vinyl: 'none' | 'stripes' | 'flames') => void;
  upgradeStat: (stat: 'speedLevel' | 'accelLevel' | 'handlingLevel', cost: number) => boolean;
  startRace: (trackId: string) => boolean;
  setCountdownValue: (value: 3 | 2 | 1 | 0 | null) => void;
  beginRaceGo: () => void;
  finishRace: (placement?: number) => void;
  setCurrentSpeed: (speed: number) => void;
  resetProgression: () => void;
}

const saved = loadSavedProgress();
const initialTrack = getBuiltRaceTrack('act1-r1');

export const useGameStore = create<GameState>((set, get) => ({
  view: 'MENU',
  cash: saved.cash,
  driverAlias: saved.driverAlias,
  autoOrbitCam: saved.autoOrbitCam,
  selectedCarId: saved.selectedCarId,
  ownedCarIds: saved.ownedCarIds,
  cars: saved.cars,
  car: saved.car,
  raceState: 'idle',
  raceSessionId: 0,
  countdownValue: null,
  activeTrackId: initialTrack.id,
  raceTime: 0,
  raceStartTime: 0,
  raceDistance: Math.round(initialTrack.totalLength * initialTrack.laps),
  raceLaps: initialTrack.laps,
  raceTitle: initialTrack.title,
  raceIsBoss: initialTrack.isBoss,
  raceParticipantCount: initialTrack.isBoss ? 2 : 3,
  racePlacement: 3,
  baseReward: initialTrack.reward,
  currentReward: initialTrack.reward,
  currentSpeed: 0,
  justUnlockedAct2: false,
  justCompletedGame: false,
  completedRaces: saved.completedRaces,
  previewCarId: null,

  setView: (view) =>
    set({
      view,
      previewCarId: null,
      raceState: 'idle',
      countdownValue: null,
      currentSpeed: 0,
      justUnlockedAct2: false,
      justCompletedGame: false,
    }),

  setPreviewCarId: (previewCarId) => set({ previewCarId }),

  setDriverAlias: (alias) =>
    set((state) => {
      const cleaned = alias.trim().slice(0, 18).toUpperCase() || 'NIGHT_RUNNER';
      persistProgress({
        cash: state.cash,
        driverAlias: cleaned,
        autoOrbitCam: state.autoOrbitCam,
        selectedCarId: state.selectedCarId,
        ownedCarIds: state.ownedCarIds,
        cars: state.cars,
        car: state.car,
        completedRaces: state.completedRaces,
      });
      return { driverAlias: cleaned };
    }),

  setAutoOrbitCam: (enabled) =>
    set((state) => {
      persistProgress({
        cash: state.cash,
        driverAlias: state.driverAlias,
        autoOrbitCam: enabled,
        selectedCarId: state.selectedCarId,
        ownedCarIds: state.ownedCarIds,
        cars: state.cars,
        car: state.car,
        completedRaces: state.completedRaces,
      });
      return { autoOrbitCam: enabled };
    }),

  addCash: (amount) =>
    set((state) => {
      const cash = state.cash + amount;
      persistProgress({
        cash,
        driverAlias: state.driverAlias,
        autoOrbitCam: state.autoOrbitCam,
        selectedCarId: state.selectedCarId,
        ownedCarIds: state.ownedCarIds,
        cars: state.cars,
        car: state.car,
        completedRaces: state.completedRaces,
      });
      return { cash };
    }),

  spendCash: (amount) => {
    const state = get();
    if (state.cash >= amount) {
      const cash = state.cash - amount;
      persistProgress({
        cash,
        driverAlias: state.driverAlias,
        autoOrbitCam: state.autoOrbitCam,
        selectedCarId: state.selectedCarId,
        ownedCarIds: state.ownedCarIds,
        cars: state.cars,
        car: state.car,
        completedRaces: state.completedRaces,
      });
      set({ cash });
      return true;
    }
    return false;
  },

  selectCar: (carId) => {
    const state = get();
    if (!state.ownedCarIds.includes(carId)) return false;

    const targetCar = state.cars[carId] || DEFAULT_CARS[carId] || DEFAULT_CARS.starter;
    const updatedCars = {
      ...state.cars,
      [carId]: targetCar,
    };

    persistProgress({
      cash: state.cash,
      driverAlias: state.driverAlias,
      autoOrbitCam: state.autoOrbitCam,
      selectedCarId: carId,
      ownedCarIds: state.ownedCarIds,
      cars: updatedCars,
      car: targetCar,
      completedRaces: state.completedRaces,
    });

    set({
      selectedCarId: carId,
      cars: updatedCars,
      car: targetCar,
    });
    return true;
  },

  buyCar: (carId) => {
    const state = get();
    if (state.ownedCarIds.includes(carId)) {
      state.selectCar(carId);
      return true;
    }
    const def = getVehicleDefinition(carId);
    if (state.cash < def.price) return false;

    const nextCash = state.cash - def.price;
    const nextOwned: CarModelId[] = [...state.ownedCarIds, carId];
    const newCarConfig: CarBuildConfig = state.cars[carId] || {
      ...DEFAULT_CARS[carId],
      modelId: carId,
      color: def.defaultColor,
      wheelsColor: def.defaultWheelsColor,
      vinyl: def.defaultVinyl,
    };
    const nextCars = {
      ...state.cars,
      [carId]: newCarConfig,
    };

    persistProgress({
      cash: nextCash,
      driverAlias: state.driverAlias,
      autoOrbitCam: state.autoOrbitCam,
      selectedCarId: carId,
      ownedCarIds: nextOwned,
      cars: nextCars,
      car: newCarConfig,
      completedRaces: state.completedRaces,
    });

    set({
      cash: nextCash,
      ownedCarIds: nextOwned,
      selectedCarId: carId,
      cars: nextCars,
      car: newCarConfig,
    });
    return true;
  },

  updateCarColor: (part, color) =>
    set((state) => {
      const car = { ...state.car, [part]: color };
      const cars = { ...state.cars, [state.selectedCarId]: car };
      persistProgress({
        cash: state.cash,
        driverAlias: state.driverAlias,
        autoOrbitCam: state.autoOrbitCam,
        selectedCarId: state.selectedCarId,
        ownedCarIds: state.ownedCarIds,
        cars,
        car,
        completedRaces: state.completedRaces,
      });
      return { car, cars };
    }),

  updateVinyl: (vinyl) =>
    set((state) => {
      const car = { ...state.car, vinyl };
      const cars = { ...state.cars, [state.selectedCarId]: car };
      persistProgress({
        cash: state.cash,
        driverAlias: state.driverAlias,
        autoOrbitCam: state.autoOrbitCam,
        selectedCarId: state.selectedCarId,
        ownedCarIds: state.ownedCarIds,
        cars,
        car,
        completedRaces: state.completedRaces,
      });
      return { car, cars };
    }),

  upgradeStat: (stat, cost) => {
    const { cash, driverAlias, autoOrbitCam, car, selectedCarId, ownedCarIds, cars, completedRaces } = get();
    if (cash >= cost && car[stat] < 5) {
      const nextCash = cash - cost;
      const nextCar = { ...car, [stat]: car[stat] + 1 };
      const nextCars = { ...cars, [selectedCarId]: nextCar };
      persistProgress({
        cash: nextCash,
        driverAlias,
        autoOrbitCam,
        selectedCarId,
        ownedCarIds,
        cars: nextCars,
        car: nextCar,
        completedRaces,
      });
      set({ cash: nextCash, car: nextCar, cars: nextCars });
      return true;
    }
    return false;
  },

  startRace: (trackId) => {
    const { completedRaces, raceSessionId } = get();
    if (!isTrackUnlocked(trackId, completedRaces).unlocked) {
      return false;
    }
    const track = getBuiltRaceTrack(trackId);
    set({
      view: 'RACE',
      raceState: 'countdown',
      raceSessionId: raceSessionId + 1,
      countdownValue: 3,
      activeTrackId: track.id,
      raceStartTime: 0,
      raceTime: 0,
      raceDistance: Math.round(track.totalLength * track.laps),
      raceLaps: track.laps,
      raceTitle: track.title,
      raceIsBoss: track.isBoss,
      raceParticipantCount: track.isBoss ? 2 : 3,
      racePlacement: track.isBoss ? 2 : 3,
      baseReward: track.reward,
      currentReward: track.reward,
      currentSpeed: 0,
      justUnlockedAct2: false,
      justCompletedGame: false,
    });
    return true;
  },

  setCountdownValue: (value) => set({ countdownValue: value }),

  beginRaceGo: () =>
    set((state) => {
      if (state.view !== 'RACE' || state.raceState !== 'countdown') return state;
      return {
        raceState: 'racing',
        countdownValue: 0,
        raceStartTime: Date.now(),
      };
    }),

  finishRace: (placement = 1) =>
    set((state) => {
      if (state.raceState === 'finished') return state;
      const elapsedMs = state.raceStartTime > 0 ? Date.now() - state.raceStartTime : 0;
      const earned = getScaledPayout(state.baseReward, placement);
      const prevStatus = getProgressionStatus(state.completedRaces);

      const prevRecord = state.completedRaces[state.activeTrackId];
      const nextRecord: RaceCompletionRecord = {
        bestTimeMs: prevRecord ? Math.min(prevRecord.bestTimeMs, elapsedMs) : elapsedMs,
        bestPosition: prevRecord ? Math.min(prevRecord.bestPosition, placement) : placement,
      };
      const nextCompleted = {
        ...state.completedRaces,
        [state.activeTrackId]: nextRecord,
      };
      const nextCash = state.cash + earned;

      const justUnlockedAct2 =
        state.activeTrackId === ACT1_BOSS_ID && placement === 1 && !prevStatus.act2Unlocked;
      const justCompletedGame =
        state.activeTrackId === FINAL_BOSS_ID && placement === 1;

      persistProgress({
        cash: nextCash,
        driverAlias: state.driverAlias,
        autoOrbitCam: state.autoOrbitCam,
        selectedCarId: state.selectedCarId,
        ownedCarIds: state.ownedCarIds,
        cars: state.cars,
        car: state.car,
        completedRaces: nextCompleted,
      });

      return {
        raceState: 'finished',
        countdownValue: null,
        racePlacement: placement,
        currentReward: earned,
        cash: nextCash,
        raceTime: elapsedMs,
        completedRaces: nextCompleted,
        justUnlockedAct2,
        justCompletedGame,
      };
    }),

  setCurrentSpeed: (speed) => set({ currentSpeed: speed }),

  resetProgression: () => {
    const state = get();
    const fresh: PersistedSaveData = {
      cash: 1500,
      driverAlias: state.driverAlias,
      autoOrbitCam: state.autoOrbitCam,
      selectedCarId: 'starter',
      ownedCarIds: ['starter'],
      cars: { ...DEFAULT_CARS },
      car: { ...DEFAULT_CARS.starter },
      completedRaces: {},
    };
    persistProgress(fresh);
    set({
      cash: fresh.cash,
      selectedCarId: fresh.selectedCarId,
      ownedCarIds: fresh.ownedCarIds,
      cars: fresh.cars,
      car: fresh.car,
      completedRaces: fresh.completedRaces,
      activeTrackId: 'act1-r1',
      justUnlockedAct2: false,
      justCompletedGame: false,
    });
  },
}));
