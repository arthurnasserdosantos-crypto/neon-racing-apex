import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { CuboidCollider, RapierRigidBody, RigidBody } from '@react-three/rapier';
import * as THREE from 'three';
import { useGameStore } from '../store';
import { CarGeometrySet, createCarGeometrySet, disposeCarGeometrySet } from '../utils/carGeometry';
import { raceTelemetry } from '../utils/freeRoamWorld';
import { BuiltRaceTrack, getBuiltRaceTrack } from '../utils/raceTracks';

const WHEEL_RADIUS = 0.355;

interface BotConfig {
  index: 0 | 1;
  id: string;
  name: string;
  color: string;
  wheelsColor: string;
  accentColor: string;
  underglowColor?: string;
  isBoss: boolean;
  vinyl: 'stripes' | 'flames';
  startOffsetMeters: number;
  baseLaneOffset: number;
}

const STANDARD_BOT_CONFIGS: readonly BotConfig[] = [
  {
    index: 0,
    id: 'ai-1',
    name: 'Cobalt Apex',
    color: '#2563eb',
    wheelsColor: '#18181b',
    accentColor: '#f8fafc',
    isBoss: false,
    vinyl: 'stripes',
    startOffsetMeters: 6.5,
    baseLaneOffset: -2.8,
  },
  {
    index: 1,
    id: 'ai-2',
    name: 'Emerald GT',
    color: '#059669',
    wheelsColor: '#f4f4f5',
    accentColor: '#facc15',
    isBoss: false,
    vinyl: 'flames',
    startOffsetMeters: 12.0,
    baseLaneOffset: 2.8,
  },
] as const;

const _pos = new THREE.Vector3();
const _target = new THREE.Vector3();
const _quat = new THREE.Quaternion();
const _yAxis = new THREE.Vector3(0, 1, 0);

function sampleTrackAtS(track: BuiltRaceTrack, s: number, laneOffset: number, out: THREE.Vector3) {
  const { samples, totalLength, sampleStep } = track;
  const n = samples.length;
  const wrapped = ((s % totalLength) + totalLength) % totalLength;
  const exactIdx = wrapped / sampleStep;
  const i0 = Math.floor(exactIdx) % n;
  const i1 = (i0 + 1) % n;
  const t = exactIdx - Math.floor(exactIdx);

  const a = samples[i0];
  const b = samples[i1];

  out.lerpVectors(a.pos, b.pos, t);
  const rx = THREE.MathUtils.lerp(a.right.x, b.right.x, t);
  const rz = THREE.MathUtils.lerp(a.right.z, b.right.z, t);
  out.x += rx * laneOffset;
  out.z += rz * laneOffset;
}

function getMaxAheadCurvature(track: BuiltRaceTrack, s: number, lookDistanceMeters: number): number {
  const { samples, totalLength, sampleStep } = track;
  const n = samples.length;
  const steps = Math.max(2, Math.ceil(lookDistanceMeters / sampleStep));
  const startIdx = Math.floor((((s % totalLength) + totalLength) % totalLength) / sampleStep) % n;
  let maxCurv = 0;
  for (let k = 0; k <= steps; k++) {
    const c = samples[(startIdx + k) % n].curvature;
    if (c > maxCurv) maxCurv = c;
  }
  return maxCurv;
}

interface SingleAIBotProps {
  config: BotConfig;
  track: BuiltRaceTrack;
  raceSessionId: number;
  raceState: 'idle' | 'countdown' | 'racing' | 'finished';
  geometries: CarGeometrySet;
}

function SingleAIBot({ config, track, raceSessionId, raceState, geometries }: SingleAIBotProps) {
  const rbRef = useRef<RapierRigidBody>(null);
  const bodyTiltRef = useRef<THREE.Group>(null);
  const flSteerRef = useRef<THREE.Group>(null);
  const frSteerRef = useRef<THREE.Group>(null);
  const wheelSpinRefs = useRef<(THREE.Group | null)[]>([null, null, null, null]);
  const brakeMatLRef = useRef<THREE.MeshStandardMaterial>(null);
  const brakeMatRRef = useRef<THREE.MeshStandardMaterial>(null);

  const stateRef = useRef({
    s: config.startOffsetMeters,
    speedMs: 0,
    yaw: 0,
    steerVisual: 0,
    wheelSpin: 0,
    roll: 0,
    finished: false,
  });

  // Reset AI bot to staggered grid position whenever track or race restarts
  useEffect(() => {
    const { samples } = track;
    sampleTrackAtS(track, config.startOffsetMeters, config.baseLaneOffset, _pos);
    const tangent = samples[0].tangent;
    const initYaw = Math.atan2(-tangent.x, -tangent.z);

    stateRef.current = {
      s: config.startOffsetMeters,
      speedMs: 0,
      yaw: initYaw,
      steerVisual: 0,
      wheelSpin: 0,
      roll: 0,
      finished: false,
    };

    _quat.setFromAxisAngle(_yAxis, initYaw);
    if (rbRef.current) {
      rbRef.current.setNextKinematicTranslation({ x: _pos.x, y: 0.08, z: _pos.z });
      rbRef.current.setNextKinematicRotation({
        x: _quat.x,
        y: _quat.y,
        z: _quat.z,
        w: _quat.w,
      });
    }

    const botTel = raceTelemetry.bots[config.index];
    botTel.name = config.name;
    botTel.color = config.isBoss ? config.accentColor : config.color;
    botTel.x = _pos.x;
    botTel.z = _pos.z;
    botTel.headingRad = Math.atan2(tangent.x, -tangent.z);
    botTel.speedKph = 0;
    botTel.lap = 1;
    botTel.progressMeters = config.startOffsetMeters;
    botTel.finished = false;
  }, [track, raceSessionId, config]);

  const spokeAngles = useMemo(() => {
    const angles: number[] = [];
    for (let i = 0; i < 5; i++) {
      const base = (i * Math.PI * 2) / 5;
      angles.push(base - 0.14, base + 0.14);
    }
    return angles;
  }, []);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    const st = stateRef.current;
    const rb = rbRef.current;
    if (!rb) return;

    // Hold AI racers pinned on the starting grid during 3, 2, 1 countdown
    if (raceState !== 'racing') {
      sampleTrackAtS(track, st.s, config.baseLaneOffset, _pos);
      _quat.setFromAxisAngle(_yAxis, st.yaw);
      rb.setNextKinematicTranslation({ x: _pos.x, y: 0.08, z: _pos.z });
      rb.setNextKinematicRotation({ x: _quat.x, y: _quat.y, z: _quat.z, w: _quat.w });
      if (brakeMatLRef.current) brakeMatLRef.current.emissiveIntensity = 2.4;
      if (brakeMatRRef.current) brakeMatRRef.current.emissiveIntensity = 2.4;
      return;
    }

    const botTel = raceTelemetry.bots[config.index];

    // Recover lateral bump impulse via damped spring while keeping AI inside track barriers
    if (Math.abs(botTel.bumpOffset) > 0.0005 || Math.abs(botTel.bumpVel) > 0.0005) {
      const springAccel = -26 * botTel.bumpOffset - 7.2 * botTel.bumpVel;
      botTel.bumpVel += springAccel * dt;
      botTel.bumpOffset += botTel.bumpVel * dt;
      const maxBump = Math.max(2.0, track.roadWidth * 0.36);
      if (botTel.bumpOffset > maxBump) {
        botTel.bumpOffset = maxBump;
        botTel.bumpVel = Math.min(0, botTel.bumpVel);
      } else if (botTel.bumpOffset < -maxBump) {
        botTel.bumpOffset = -maxBump;
        botTel.bumpVel = Math.max(0, botTel.bumpVel);
      }
    }
    if (Math.abs(botTel.speedRecoil) > 0.01) {
      botTel.speedRecoil *= Math.exp(-3.5 * dt);
    } else {
      botTel.speedRecoil = 0;
    }

    const totalRaceMeters = track.totalLength * track.laps;
    const baseTargetKph = track.aiSpeedsKph[config.index];
    const baseMaxMs = baseTargetKph / 3.6;

    // Boss AI carries sharper corner speed and stronger acceleration out of apexes
    const aheadCurv = getMaxAheadCurvature(track, st.s, config.isBoss ? 24 : 26);
    const cornerDrag = config.isBoss ? 8.5 : 11.5;
    const cornerFactor = 1 / (1 + aheadCurv * cornerDrag);
    const desiredSpeedMs = st.finished
      ? baseMaxMs * 0.35
      : Math.max(config.isBoss ? 15 : 12, baseMaxMs * cornerFactor + botTel.speedRecoil);

    const accelRate = (config.isBoss ? 16 : 9) + track.order * 2.2;
    const brakeRate = (config.isBoss ? 24 : 18) + track.order * 1.8;
    let isBraking = false;

    if (st.speedMs < desiredSpeedMs) {
      st.speedMs = Math.min(desiredSpeedMs, st.speedMs + accelRate * dt);
    } else if (st.speedMs > desiredSpeedMs + 1.2) {
      st.speedMs = Math.max(desiredSpeedMs, st.speedMs - brakeRate * dt);
      isBraking = true;
    }

    const laneSway = config.isBoss
      ? Math.sin(st.s * 0.022) * 0.85
      : Math.sin(st.s * 0.028 + config.index * 2.1) * 1.1;
    const laneOffset = THREE.MathUtils.clamp(
      config.baseLaneOffset + laneSway + botTel.bumpOffset,
      -(track.roadWidth * 0.42),
      track.roadWidth * 0.42,
    );

    st.s += st.speedMs * dt;
    if (!st.finished && st.s >= totalRaceMeters) {
      st.finished = true;
    }

    sampleTrackAtS(track, st.s, laneOffset, _pos);
    sampleTrackAtS(track, st.s + 11, laneOffset, _target);

    const dx = _target.x - _pos.x;
    const dz = _target.z - _pos.z;
    const desiredYaw = Math.atan2(-dx, -dz);

    let yawDiff = desiredYaw - st.yaw;
    while (yawDiff > Math.PI) yawDiff -= Math.PI * 2;
    while (yawDiff < -Math.PI) yawDiff += Math.PI * 2;

    const prevYaw = st.yaw;
    st.yaw += yawDiff * Math.min(1, (config.isBoss ? 11 : 9.5) * dt);

    _quat.setFromAxisAngle(_yAxis, st.yaw);
    rb.setNextKinematicTranslation({ x: _pos.x, y: 0.08, z: _pos.z });
    rb.setNextKinematicRotation({ x: _quat.x, y: _quat.y, z: _quat.z, w: _quat.w });

    st.wheelSpin -= (st.speedMs * dt) / WHEEL_RADIUS;
    for (let i = 0; i < 4; i++) {
      const w = wheelSpinRefs.current[i];
      if (w) w.rotation.x = st.wheelSpin;
    }

    const targetSteer = THREE.MathUtils.clamp(yawDiff * 1.4, -0.4, 0.4);
    st.steerVisual = THREE.MathUtils.damp(st.steerVisual, targetSteer, 12, dt);
    if (flSteerRef.current) flSteerRef.current.rotation.y = st.steerVisual;
    if (frSteerRef.current) frSteerRef.current.rotation.y = st.steerVisual;

    const yawRate = (st.yaw - prevYaw) / Math.max(dt, 1e-4);
    const bumpRoll = THREE.MathUtils.clamp(-botTel.bumpVel * 0.015, -0.04, 0.04);
    const targetRoll = THREE.MathUtils.clamp(-yawRate * 0.032 + bumpRoll, -0.08, 0.08);
    st.roll = THREE.MathUtils.damp(st.roll, targetRoll, 10, dt);
    if (bodyTiltRef.current) {
      bodyTiltRef.current.rotation.z = st.roll;
      bodyTiltRef.current.rotation.x = isBraking ? -0.025 : 0.015;
    }

    const glow = isBraking ? 4.8 : 1.6;
    if (brakeMatLRef.current) brakeMatLRef.current.emissiveIntensity = glow;
    if (brakeMatRRef.current) brakeMatRRef.current.emissiveIntensity = glow;

    const fx = -Math.sin(st.yaw);
    const fz = -Math.cos(st.yaw);
    const rx = -fz;
    const rz = fx;
    botTel.x = _pos.x;
    botTel.z = _pos.z;
    botTel.headingRad = Math.atan2(fx, -fz);
    botTel.vx = fx * st.speedMs + rx * botTel.bumpVel;
    botTel.vz = fz * st.speedMs + rz * botTel.bumpVel;
    botTel.speedKph = Math.round(st.speedMs * 3.6);
    botTel.lap = Math.min(track.laps, Math.floor(st.s / track.totalLength) + 1);
    botTel.progressMeters = st.s;
    botTel.finished = st.finished;
  });

  const wheelPositions: { pos: [number, number, number]; isLeft: boolean; isRear: boolean }[] = [
    { pos: [-0.96, WHEEL_RADIUS, -1.36], isLeft: true, isRear: false },
    { pos: [0.96, WHEEL_RADIUS, -1.36], isLeft: false, isRear: false },
    { pos: [-0.98, WHEEL_RADIUS, 1.38], isLeft: true, isRear: true },
    { pos: [0.98, WHEEL_RADIUS, 1.38], isLeft: false, isRear: true },
  ];

  return (
    <RigidBody
      ref={rbRef}
      type="kinematicPosition"
      colliders={false}
      position={[config.baseLaneOffset, 0.08, -config.startOffsetMeters]}
    >
      <CuboidCollider args={[0.98, 0.44, 2.22]} position={[0, 0.44, 0]} />

      <group ref={bodyTiltRef}>
        <mesh geometry={geometries.centerBody} castShadow receiveShadow>
          <meshPhysicalMaterial
            color={config.color}
            metalness={config.isBoss ? 0.82 : 0.68}
            roughness={config.isBoss ? 0.16 : 0.22}
            clearcoat={1.0}
            clearcoatRoughness={0.06}
          />
        </mesh>

        <mesh
          geometry={geometries.sideFender}
          position={[-0.78, 0, 0]}
          castShadow
          receiveShadow
        >
          <meshPhysicalMaterial
            color={config.color}
            metalness={config.isBoss ? 0.82 : 0.68}
            roughness={config.isBoss ? 0.16 : 0.22}
            clearcoat={1.0}
            clearcoatRoughness={0.06}
          />
        </mesh>
        <mesh
          geometry={geometries.sideFender}
          position={[0.78, 0, 0]}
          castShadow
          receiveShadow
        >
          <meshPhysicalMaterial
            color={config.color}
            metalness={config.isBoss ? 0.82 : 0.68}
            roughness={config.isBoss ? 0.16 : 0.22}
            clearcoat={1.0}
            clearcoatRoughness={0.06}
          />
        </mesh>

        <mesh geometry={geometries.cabinGlass} castShadow>
          <meshPhysicalMaterial
            color="#0b1322"
            metalness={0.15}
            roughness={0.06}
            clearcoat={1.0}
            clearcoatRoughness={0.04}
          />
        </mesh>

        <mesh geometry={geometries.roofCap} castShadow>
          <meshPhysicalMaterial
            color={config.color}
            metalness={config.isBoss ? 0.82 : 0.68}
            roughness={config.isBoss ? 0.16 : 0.22}
            clearcoat={1.0}
          />
        </mesh>

        {/* Carbon front splitter & side skirts */}
        <mesh position={[0, 0.145, -2.26]} castShadow>
          <boxGeometry args={[config.isBoss ? 2.06 : 1.94, 0.05, 0.24]} />
          <meshStandardMaterial color="#18181b" roughness={0.45} metalness={0.25} />
        </mesh>
        <mesh position={[-0.98, 0.15, 0.02]}>
          <boxGeometry args={[0.1, 0.06, 2.24]} />
          <meshStandardMaterial color="#18181b" roughness={0.45} metalness={0.25} />
        </mesh>
        <mesh position={[0.98, 0.15, 0.02]}>
          <boxGeometry args={[0.1, 0.06, 2.24]} />
          <meshStandardMaterial color="#18181b" roughness={0.45} metalness={0.25} />
        </mesh>

        {/* GT Rear Wing (Boss cars feature a wider twin-plane wing & glowing dorsal fin) */}
        <mesh
          geometry={geometries.rearWingBlade}
          position={[0, 1.07, 2.13]}
          scale={config.isBoss ? [1.14, 1, 1.1] : [1, 1, 1]}
          castShadow
        >
          <meshStandardMaterial color="#141418" metalness={0.45} roughness={0.3} />
        </mesh>
        {config.isBoss && (
          <group>
            {/* Upper Boss Twin-Plane Wing Element */}
            <mesh
              geometry={geometries.rearWingBlade}
              position={[0, 1.24, 2.2]}
              scale={[1.18, 0.85, 0.85]}
              castShadow
            >
              <meshStandardMaterial
                color={config.accentColor}
                emissive={config.accentColor}
                emissiveIntensity={0.45}
                metalness={0.6}
                roughness={0.25}
              />
            </mesh>
            {/* Boss Dorsal Aero Crest */}
            <mesh position={[0, 1.26, 0.42]} castShadow>
              <boxGeometry args={[0.06, 0.14, 1.1]} />
              <meshStandardMaterial
                color={config.accentColor}
                emissive={config.accentColor}
                emissiveIntensity={0.9}
              />
            </mesh>
            {/* Boss Underglow Strip */}
            <mesh position={[0, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[2.15, 4.3]} />
              <meshStandardMaterial
                color={config.underglowColor || config.accentColor}
                emissive={config.underglowColor || config.accentColor}
                emissiveIntensity={1.8}
                transparent
                opacity={0.42}
              />
            </mesh>
          </group>
        )}

        <mesh position={[-0.5, 0.91, 2.08]} rotation={[0.18, 0, 0]} castShadow>
          <boxGeometry args={[0.04, 0.34, 0.16]} />
          <meshStandardMaterial color="#18181b" metalness={0.7} roughness={0.25} />
        </mesh>
        <mesh position={[0.5, 0.91, 2.08]} rotation={[0.18, 0, 0]} castShadow>
          <boxGeometry args={[0.04, 0.34, 0.16]} />
          <meshStandardMaterial color="#18181b" metalness={0.7} roughness={0.25} />
        </mesh>

        {/* AI Livery */}
        {config.vinyl === 'stripes' && (
          <group>
            <mesh position={[-0.18, 0.678, -1.3]} rotation={[0.14, 0, 0]}>
              <boxGeometry args={[0.17, 0.014, 1.56]} />
              <meshStandardMaterial
                color={config.accentColor}
                emissive={config.isBoss ? config.accentColor : '#000000'}
                emissiveIntensity={config.isBoss ? 0.65 : 0}
                roughness={0.35}
              />
            </mesh>
            <mesh position={[0.18, 0.678, -1.3]} rotation={[0.14, 0, 0]}>
              <boxGeometry args={[0.17, 0.014, 1.56]} />
              <meshStandardMaterial
                color={config.accentColor}
                emissive={config.isBoss ? config.accentColor : '#000000'}
                emissiveIntensity={config.isBoss ? 0.65 : 0}
                roughness={0.35}
              />
            </mesh>
          </group>
        )}
        {config.vinyl === 'flames' && (
          <group>
            <mesh position={[-1.022, 0.43, -0.32]} rotation={[0, 0, -0.05]}>
              <boxGeometry args={[0.012, 0.15, 2.1]} />
              <meshStandardMaterial
                color={config.accentColor}
                emissive={config.accentColor}
                emissiveIntensity={config.isBoss ? 0.85 : 0.4}
              />
            </mesh>
            <mesh position={[1.022, 0.43, -0.32]} rotation={[0, 0, 0.05]}>
              <boxGeometry args={[0.012, 0.15, 2.1]} />
              <meshStandardMaterial
                color={config.accentColor}
                emissive={config.accentColor}
                emissiveIntensity={config.isBoss ? 0.85 : 0.4}
              />
            </mesh>
          </group>
        )}

        {/* Headlights & Taillights */}
        <mesh position={[-0.68, 0.49, -2.2]} rotation={[0.25, -0.18, 0]}>
          <boxGeometry args={[0.38, 0.075, 0.1]} />
          <meshStandardMaterial
            color={config.isBoss ? config.accentColor : '#e0f2fe'}
            emissive={config.isBoss ? config.accentColor : '#bae6fd'}
            emissiveIntensity={3.2}
          />
        </mesh>
        <mesh position={[0.68, 0.49, -2.2]} rotation={[0.25, 0.18, 0]}>
          <boxGeometry args={[0.38, 0.075, 0.1]} />
          <meshStandardMaterial
            color={config.isBoss ? config.accentColor : '#e0f2fe'}
            emissive={config.isBoss ? config.accentColor : '#bae6fd'}
            emissiveIntensity={3.2}
          />
        </mesh>
        <mesh position={[-0.68, 0.64, 2.22]}>
          <boxGeometry args={[0.42, 0.075, 0.06]} />
          <meshStandardMaterial
            ref={brakeMatLRef}
            color="#ef4444"
            emissive="#ef4444"
            emissiveIntensity={1.6}
          />
        </mesh>
        <mesh position={[0.68, 0.64, 2.22]}>
          <boxGeometry args={[0.42, 0.075, 0.06]} />
          <meshStandardMaterial
            ref={brakeMatRRef}
            color="#ef4444"
            emissive="#ef4444"
            emissiveIntensity={1.6}
          />
        </mesh>
      </group>

      {/* 4 Wheels */}
      {wheelPositions.map((w, idx) => {
        const sideSign = w.isLeft ? -1 : 1;
        const inner = (
          <group
            ref={(el) => {
              wheelSpinRefs.current[idx] = el;
            }}
            scale={[w.isRear ? 1.12 : 1, w.isRear ? 1.04 : 1, w.isRear ? 1.04 : 1]}
          >
            <mesh geometry={geometries.tire} castShadow receiveShadow>
              <meshStandardMaterial color="#16161a" roughness={0.86} />
            </mesh>
            <mesh geometry={geometries.rimLip} castShadow>
              <meshStandardMaterial color={config.wheelsColor} metalness={0.88} roughness={0.2} />
            </mesh>
            {spokeAngles.map((angle, sIdx) => (
              <group key={sIdx} rotation={[angle, 0, 0]}>
                <mesh position={[sideSign * 0.095, 0.115, 0]}>
                  <boxGeometry args={[0.025, 0.21, 0.022]} />
                  <meshStandardMaterial color={config.wheelsColor} metalness={0.88} roughness={0.2} />
                </mesh>
              </group>
            ))}
          </group>
        );

        if (!w.isRear) {
          return (
            <group key={idx} position={w.pos} ref={w.isLeft ? flSteerRef : frSteerRef}>
              {inner}
            </group>
          );
        }

        return (
          <group key={idx} position={w.pos}>
            {inner}
          </group>
        );
      })}
    </RigidBody>
  );
}

export function AIOpponentCars() {
  const view = useGameStore((state) => state.view);
  const activeTrackId = useGameStore((state) => state.activeTrackId);
  const raceSessionId = useGameStore((state) => state.raceSessionId);
  const raceState = useGameStore((state) => state.raceState);

  const geometries = useMemo(() => createCarGeometrySet(), []);
  useEffect(() => {
    return () => disposeCarGeometrySet(geometries);
  }, [geometries]);

  const track = useMemo(() => getBuiltRaceTrack(activeTrackId), [activeTrackId]);

  const activeConfigs: BotConfig[] = useMemo(() => {
    if (track.isBoss && track.bossProfile) {
      return [
        {
          index: 0,
          id: `boss-${track.id}`,
          name: track.bossProfile.name,
          color: track.bossProfile.bodyColor,
          wheelsColor: track.bossProfile.wheelsColor,
          accentColor: track.bossProfile.accentColor,
          underglowColor: track.bossProfile.underglowColor,
          isBoss: true,
          vinyl: track.isFinalBoss ? 'flames' : 'stripes',
          startOffsetMeters: 6.5,
          baseLaneOffset: 0,
        },
      ];
    }
    return [...STANDARD_BOT_CONFIGS];
  }, [track]);

  if (view !== 'RACE') return null;

  return (
    <group>
      {activeConfigs.map((cfg) => (
        <SingleAIBot
          key={cfg.id}
          config={cfg}
          track={track}
          raceSessionId={raceSessionId}
          raceState={raceState}
          geometries={geometries}
        />
      ))}
    </group>
  );
}
