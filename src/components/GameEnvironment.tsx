import React, { useMemo, useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { RigidBody, CuboidCollider } from '@react-three/rapier';
import * as THREE from 'three';
import { useGameStore } from '../store';
import {
  CITY_BUILDINGS,
  CityBuilding,
  FREE_ROAM_BEACONS,
  FREE_ROAM_BOUNDS,
  FREE_ROAM_OBSTACLES,
  FREE_ROAM_PYLONS,
  FreeRoamBeacon,
  SHOWROOM_DISPLAY_CARS,
  STREET_LIGHTS,
} from '../utils/freeRoamWorld';
import { BuiltRaceTrack, getBuiltRaceTrack, isTrackUnlocked } from '../utils/raceTracks';
import { createCarGeometrySet, disposeCarGeometrySet } from '../utils/carGeometry';

function createAsphaltTexture(anisotropy: number): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  // Base dark asphalt
  ctx.fillStyle = '#24272c';
  ctx.fillRect(0, 0, size, size);

  // Subtle aggregate speckle
  for (let i = 0; i < 2400; i++) {
    const x = (i * 73) % size;
    const y = (i * 137 + Math.floor(i / 4) * 19) % size;
    const shade = 34 + (i % 24);
    ctx.fillStyle = `rgb(${shade}, ${shade + 4}, ${shade + 8})`;
    ctx.fillRect(x, y, 2, 2);
  }

  // Subtle grid reference lines so movement and turning are visually crisp
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, size - 2, size - 2);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(120, 120);
  tex.anisotropy = anisotropy;
  return tex;
}

function buildTrackRibbonGeometries(track: BuiltRaceTrack) {
  const { samples, roadWidth } = track;
  const n = samples.length;
  const halfW = roadWidth / 2;
  const curbWidth = 0.85;

  const roadPositions: number[] = [];
  const roadNormals: number[] = [];
  const roadUvs: number[] = [];

  const curbPositions: number[] = [];
  const curbNormals: number[] = [];
  const curbColors: number[] = [];

  const pushTri = (
    arr: number[],
    ax: number,
    ay: number,
    az: number,
    bx: number,
    by: number,
    bz: number,
    cx: number,
    cy: number,
    cz: number,
  ) => {
    arr.push(ax, ay, az, bx, by, bz, cx, cy, cz);
  };

  const pushColorTri = (arr: number[], r: number, g: number, b: number) => {
    arr.push(r, g, b, r, g, b, r, g, b);
  };

  for (let i = 0; i < n; i++) {
    const a = samples[i];
    const b = samples[(i + 1) % n];

    const aLx = a.pos.x - a.right.x * halfW;
    const aLz = a.pos.z - a.right.z * halfW;
    const aRx = a.pos.x + a.right.x * halfW;
    const aRz = a.pos.z + a.right.z * halfW;

    const bLx = b.pos.x - b.right.x * halfW;
    const bLz = b.pos.z - b.right.z * halfW;
    const bRx = b.pos.x + b.right.x * halfW;
    const bRz = b.pos.z + b.right.z * halfW;

    const v0 = a.s * 0.12;
    const v1 = (a.s + track.sampleStep) * 0.12;

    pushTri(roadPositions, aLx, 0.014, aLz, aRx, 0.014, aRz, bLx, 0.014, bLz);
    pushTri(roadPositions, aRx, 0.014, aRz, bRx, 0.014, bRz, bLx, 0.014, bLz);
    for (let k = 0; k < 6; k++) roadNormals.push(0, 1, 0);
    roadUvs.push(0, v0, 1, v0, 0, v1, 1, v0, 1, v1, 0, v1);

    // Alternating red & white outer racing curbs
    const isRed = Math.floor(i / 2) % 2 === 0;
    const cr = isRed ? 0.86 : 0.94;
    const cg = isRed ? 0.15 : 0.95;
    const cb = isRed ? 0.15 : 0.96;

    // Left curb strip
    const aLInX = a.pos.x - a.right.x * (halfW - curbWidth);
    const aLInZ = a.pos.z - a.right.z * (halfW - curbWidth);
    const bLInX = b.pos.x - b.right.x * (halfW - curbWidth);
    const bLInZ = b.pos.z - b.right.z * (halfW - curbWidth);

    pushTri(curbPositions, aLx, 0.022, aLz, aLInX, 0.022, aLInZ, bLx, 0.022, bLz);
    pushTri(curbPositions, aLInX, 0.022, aLInZ, bLInX, 0.022, bLInZ, bLx, 0.022, bLz);
    pushColorTri(curbColors, cr, cg, cb);
    pushColorTri(curbColors, cr, cg, cb);
    for (let k = 0; k < 6; k++) curbNormals.push(0, 1, 0);

    // Right curb strip
    const aRInX = a.pos.x + a.right.x * (halfW - curbWidth);
    const aRInZ = a.pos.z + a.right.z * (halfW - curbWidth);
    const bRInX = b.pos.x + b.right.x * (halfW - curbWidth);
    const bRInZ = b.pos.z + b.right.z * (halfW - curbWidth);

    pushTri(curbPositions, aRInX, 0.022, aRInZ, aRx, 0.022, aRz, bRInX, 0.022, bRInZ);
    pushTri(curbPositions, aRx, 0.022, aRz, bRx, 0.022, bRz, bRInX, 0.022, bRInZ);
    pushColorTri(curbColors, cr, cg, cb);
    pushColorTri(curbColors, cr, cg, cb);
    for (let k = 0; k < 6; k++) curbNormals.push(0, 1, 0);
  }

  const roadGeo = new THREE.BufferGeometry();
  roadGeo.setAttribute('position', new THREE.Float32BufferAttribute(roadPositions, 3));
  roadGeo.setAttribute('normal', new THREE.Float32BufferAttribute(roadNormals, 3));
  roadGeo.setAttribute('uv', new THREE.Float32BufferAttribute(roadUvs, 2));

  const curbGeo = new THREE.BufferGeometry();
  curbGeo.setAttribute('position', new THREE.Float32BufferAttribute(curbPositions, 3));
  curbGeo.setAttribute('normal', new THREE.Float32BufferAttribute(curbNormals, 3));
  curbGeo.setAttribute('color', new THREE.Float32BufferAttribute(curbColors, 3));

  return { roadGeo, curbGeo };
}

function CustomRaceTrack({
  track,
  asphaltTexture,
}: {
  track: BuiltRaceTrack;
  asphaltTexture: THREE.CanvasTexture;
}) {
  const { roadGeo, curbGeo } = useMemo(() => buildTrackRibbonGeometries(track), [track]);

  useEffect(() => {
    return () => {
      roadGeo.dispose();
      curbGeo.dispose();
    };
  }, [roadGeo, curbGeo]);

  const barrierSegments = useMemo(() => {
    const segCount = 80;
    const step = track.samples.length / segCount;
    const wallOffset = track.roadWidth / 2 + 1.05;
    const segLen = (track.totalLength / segCount) * 1.04;

    const list: {
      x: number;
      z: number;
      yaw: number;
      len: number;
      isLeft: boolean;
      isRed: boolean;
    }[] = [];

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

      const rx = (sA.right.x + sB.right.x) / 2;
      const rz = (sA.right.z + sB.right.z) / 2;
      const rLen = Math.hypot(rx, rz) || 1;
      const nrx = rx / rLen;
      const nrz = rz / rLen;

      list.push({
        x: midX - nrx * wallOffset,
        z: midZ - nrz * wallOffset,
        yaw,
        len: segLen,
        isLeft: true,
        isRed: i % 2 === 0,
      });
      list.push({
        x: midX + nrx * wallOffset,
        z: midZ + nrz * wallOffset,
        yaw,
        len: segLen,
        isLeft: false,
        isRed: i % 2 === 0,
      });
    }
    return list;
  }, [track]);

  const centerDashes = useMemo(() => {
    const dashes: { x: number; z: number; yaw: number }[] = [];
    for (let i = 0; i < track.samples.length; i += 3) {
      const s = track.samples[i];
      dashes.push({
        x: s.pos.x,
        z: s.pos.z,
        yaw: Math.atan2(-s.tangent.x, -s.tangent.z),
      });
    }
    return dashes;
  }, [track]);

  const cornerMarkers = useMemo(() => {
    const markers: { x: number; z: number }[] = [];
    for (let i = 0; i < track.samples.length; i += 6) {
      const s = track.samples[i];
      if (s.curvature > 0.032) {
        const next = track.samples[(i + 4) % track.samples.length];
        const crossY = s.tangent.z * next.tangent.x - s.tangent.x * next.tangent.z;
        const outsideSign = crossY >= 0 ? -1 : 1;
        const dist = track.roadWidth / 2 + 0.35;
        markers.push({
          x: s.pos.x + s.right.x * dist * outsideSign,
          z: s.pos.z + s.right.z * dist * outsideSign,
        });
      }
    }
    return markers;
  }, [track]);

  const startSample = track.samples[0];
  const startYaw = Math.atan2(-startSample.tangent.x, -startSample.tangent.z);

  return (
    <group>
      <mesh geometry={roadGeo} receiveShadow>
        <meshStandardMaterial
          map={asphaltTexture}
          color="#1e232a"
          roughness={0.82}
          metalness={0.08}
          polygonOffset
          polygonOffsetFactor={-1}
          polygonOffsetUnits={-1}
        />
      </mesh>

      <mesh geometry={curbGeo} receiveShadow>
        <meshStandardMaterial vertexColors roughness={0.6} />
      </mesh>

      {centerDashes.map((d, i) => (
        <mesh
          key={`dash-${i}`}
          position={[d.x, 0.025, d.z]}
          rotation={[-Math.PI / 2, 0, d.yaw]}
        >
          <planeGeometry args={[0.3, Math.max(1.8, track.sampleStep * 1.4)]} />
          <meshStandardMaterial
            color="#facc15"
            roughness={0.6}
            polygonOffset
            polygonOffsetFactor={-2}
            polygonOffsetUnits={-2}
          />
        </mesh>
      ))}

      {cornerMarkers.map((m, i) => (
        <mesh key={`corner-${i}`} position={[m.x, 0.9, m.z]} castShadow>
          <cylinderGeometry args={[0.25, 0.35, 1.8, 10]} />
          <meshStandardMaterial
            color="#f97316"
            emissive="#ea580c"
            emissiveIntensity={0.45}
            roughness={0.4}
          />
        </mesh>
      ))}

      {barrierSegments.map((b, i) => (
        <RigidBody
          key={`wall-${track.id}-${i}`}
          type="fixed"
          position={[b.x, 0.85, b.z]}
          rotation={[0, b.yaw, 0]}
        >
          <mesh castShadow receiveShadow>
            <boxGeometry args={[0.75, 1.7, b.len]} />
            <meshStandardMaterial color={b.isRed ? '#dc2626' : '#f4f4f5'} roughness={0.6} />
          </mesh>
        </RigidBody>
      ))}

      <group
        position={[startSample.pos.x, 0, startSample.pos.z]}
        rotation={[0, startYaw, 0]}
      >
        <mesh position={[0, 0.028, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[track.roadWidth - 1.5, 3.6]} />
          <meshStandardMaterial color="#facc15" roughness={0.35} />
        </mesh>
        <mesh position={[-(track.roadWidth / 2 + 0.2), 3.3, 0]} castShadow>
          <boxGeometry args={[0.65, 6.6, 0.65]} />
          <meshStandardMaterial color="#18181b" metalness={0.5} roughness={0.4} />
        </mesh>
        <mesh position={[track.roadWidth / 2 + 0.2, 3.3, 0]} castShadow>
          <boxGeometry args={[0.65, 6.6, 0.65]} />
          <meshStandardMaterial color="#18181b" metalness={0.5} roughness={0.4} />
        </mesh>
        <mesh position={[0, 6.3, 0]} castShadow>
          <boxGeometry args={[track.roadWidth + 1.1, 1.15, 0.85]} />
          <meshStandardMaterial color="#f97316" emissive="#ea580c" emissiveIntensity={0.35} />
        </mesh>
      </group>
    </group>
  );
}

// Glowing World Beacon Ground Zone & Vertical Light Pillar
function WorldBeaconMarker({
  beacon,
  isUnlocked,
}: {
  beacon: FreeRoamBeacon;
  isUnlocked: boolean;
}) {
  const diskRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const beamRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (ringRef.current) {
      const scale = 1 + Math.sin(t * 2.8) * 0.08;
      ringRef.current.scale.set(scale, scale, 1);
    }
    if (beamRef.current) {
      const mat = beamRef.current.material as THREE.MeshBasicMaterial;
      if (mat) {
        mat.opacity = 0.28 + Math.sin(t * 3.5) * 0.12;
      }
    }
  });

  const baseColor = isUnlocked ? beacon.color : '#52525b';
  const emissiveColor = isUnlocked ? beacon.color : '#27272a';

  return (
    <group position={[beacon.x, 0, beacon.z]}>
      {/* Ground illuminated zone */}
      <mesh ref={diskRef} position={[0, 0.024, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[beacon.radius * 0.9, 32]} />
        <meshBasicMaterial
          color={baseColor}
          transparent
          opacity={isUnlocked ? 0.24 : 0.1}
          depthWrite={false}
        />
      </mesh>

      {/* Pulsing Outer Neon Ring */}
      <mesh ref={ringRef} position={[0, 0.028, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[beacon.radius * 0.92, beacon.radius, 40]} />
        <meshBasicMaterial
          color={baseColor}
          transparent
          opacity={isUnlocked ? 0.85 : 0.3}
          depthWrite={false}
        />
      </mesh>

      {/* Vertical light column / sky beacon */}
      <mesh ref={beamRef} position={[0, 14, 0]}>
        <cylinderGeometry args={[0.3, beacon.radius * 0.65, 28, 16, 1, true]} />
        <meshBasicMaterial
          color={emissiveColor}
          transparent
          opacity={isUnlocked ? 0.32 : 0.08}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* Center floating icon pillar */}
      <mesh position={[0, 2.2, 0]}>
        <cylinderGeometry args={[0.45, 0.45, 0.2, 16]} />
        <meshStandardMaterial
          color={baseColor}
          emissive={baseColor}
          emissiveIntensity={isUnlocked ? 2.2 : 0.4}
        />
      </mesh>
    </group>
  );
}

// 3D City Building Block with rooftop trims and illuminated windows
function UrbanBuilding({ bld }: { bld: CityBuilding }) {
  const isHQ = bld.type === 'garage_hq' || bld.type === 'dealership_hq';
  const halfH = bld.h / 2;

  return (
    <RigidBody type="fixed" position={[bld.x, halfH, bld.z]} friction={0} restitution={0}>
      <CuboidCollider args={[bld.w / 2, halfH, bld.d / 2]} friction={0} restitution={0} />

      {/* Main Structural Body */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[bld.w, bld.h, bld.d]} />
        <meshStandardMaterial
          color={bld.color}
          roughness={0.75}
          metalness={isHQ ? 0.3 : 0.15}
        />
      </mesh>

      {/* Rooftop Parapet / Coping */}
      <mesh position={[0, halfH + 0.3, 0]} castShadow>
        <boxGeometry args={[bld.w + 0.3, 0.6, bld.d + 0.3]} />
        <meshStandardMaterial color={bld.roofColor} roughness={0.8} />
      </mesh>

      {/* Accent Neon Edges / Signage */}
      {isHQ && (
        <mesh position={[0, halfH + 0.65, 0]}>
          <boxGeometry args={[bld.w * 0.8, 0.3, bld.d * 0.8]} />
          <meshStandardMaterial
            color={bld.accentColor}
            emissive={bld.accentColor}
            emissiveIntensity={2.5}
            roughness={0.2}
          />
        </mesh>
      )}

      {/* Window grid illumination strips for skyscrapers & offices */}
      {(bld.type === 'skyscraper' || bld.type === 'office') && (
        <group position={[0, 0, bld.d / 2 + 0.05]}>
          {Array.from({ length: Math.min(6, Math.floor(bld.h / 7)) }).map((_, r) => (
            <mesh key={`win-${r}`} position={[0, (r - 2) * 6, 0]}>
              <planeGeometry args={[bld.w * 0.75, 1.2]} />
              <meshStandardMaterial
                color="#0f172a"
                emissive={bld.accentColor}
                emissiveIntensity={0.65}
                roughness={0.2}
              />
            </mesh>
          ))}
        </group>
      )}

      {/* Garage Roll-Up Bay Doors */}
      {bld.type === 'garage_hq' && (
        <group position={[0, -halfH + 2.2, bld.d / 2 + 0.06]}>
          {[-6.5, 6.5].map((gx, i) => (
            <group key={`garage-door-${i}`} position={[gx, 0, 0]}>
              <mesh>
                <planeGeometry args={[8.5, 4.4]} />
                <meshStandardMaterial color="#2d333b" metalness={0.8} roughness={0.4} />
              </mesh>
              {/* Door Hazard Stripes */}
              <mesh position={[0, -1.9, 0.02]}>
                <planeGeometry args={[8.5, 0.4]} />
                <meshStandardMaterial color="#FF9900" emissive="#FF9900" emissiveIntensity={0.8} />
              </mesh>
            </group>
          ))}
          {/* Over-Door Sign */}
          <mesh position={[0, 3.4, 0.15]}>
            <boxGeometry args={[20, 1.4, 0.3]} />
            <meshStandardMaterial color="#0d0e10" />
          </mesh>
          <mesh position={[0, 3.4, 0.32]}>
            <planeGeometry args={[18, 0.9]} />
            <meshStandardMaterial
              color="#FF9900"
              emissive="#FF9900"
              emissiveIntensity={3.2}
            />
          </mesh>
        </group>
      )}

      {/* Car Lot Dealership Showroom Glass Facade & Canopy */}
      {bld.type === 'dealership_hq' && (
        <group position={[0, -halfH + 2.5, bld.d / 2 + 0.06]}>
          {/* Showroom Glass Curtain */}
          <mesh position={[0, 0, 0]}>
            <planeGeometry args={[bld.w * 0.88, 5.0]} />
            <meshPhysicalMaterial
              color="#0284c7"
              emissive="#00B0FF"
              emissiveIntensity={0.6}
              roughness={0.1}
              metalness={0.2}
              transmission={0.65}
              transparent
              opacity={0.85}
            />
          </mesh>
          {/* Glowing Dealership Header Sign */}
          <mesh position={[0, 3.6, 0.15]}>
            <boxGeometry args={[22, 1.4, 0.3]} />
            <meshStandardMaterial color="#0d0e10" />
          </mesh>
          <mesh position={[0, 3.6, 0.32]}>
            <planeGeometry args={[20, 0.9]} />
            <meshStandardMaterial
              color="#00B0FF"
              emissive="#00B0FF"
              emissiveIntensity={3.2}
            />
          </mesh>
        </group>
      )}
    </RigidBody>
  );
}

// Low-poly parked display cars on the Car Lot outdoor pedestals
function ParkedShowroomCars() {
  const tunerGeo = useMemo(() => createCarGeometrySet('tuner'), []);
  const superGeo = useMemo(() => createCarGeometrySet('supercar'), []);

  useEffect(() => {
    return () => {
      disposeCarGeometrySet(tunerGeo);
      disposeCarGeometrySet(superGeo);
    };
  }, [tunerGeo, superGeo]);

  return (
    <group>
      {SHOWROOM_DISPLAY_CARS.map((car, idx) => {
        const geo = car.modelId === 'tuner' ? tunerGeo : superGeo;
        return (
          <group key={car.name} position={[car.x, 0.22, car.z]} rotation={[0, car.yaw, 0]}>
            {/* Showroom Illuminated Turntable Pedestal */}
            <mesh position={[0, -0.11, 0]} receiveShadow>
              <cylinderGeometry args={[2.8, 3.0, 0.22, 32]} />
              <meshStandardMaterial color="#1a1d24" roughness={0.5} metalness={0.6} />
            </mesh>
            <mesh position={[0, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[2.7, 2.85, 32]} />
              <meshBasicMaterial color="#00B0FF" />
            </mesh>

            {/* Display Car Visual Body */}
            <mesh geometry={geo.centerBody} castShadow>
              <meshStandardMaterial color={car.color} roughness={0.25} metalness={0.7} />
            </mesh>
            <mesh geometry={geo.sideFender} position={[-0.78, 0, 0]} castShadow>
              <meshStandardMaterial color={car.color} roughness={0.25} metalness={0.7} />
            </mesh>
            <mesh geometry={geo.sideFender} position={[0.78, 0, 0]} castShadow>
              <meshStandardMaterial color={car.color} roughness={0.25} metalness={0.7} />
            </mesh>
            <mesh geometry={geo.cabinGlass} castShadow>
              <meshStandardMaterial color="#0d141e" roughness={0.1} metalness={0.4} />
            </mesh>
            <mesh geometry={geo.roofCap} castShadow>
              <meshStandardMaterial color={car.color} roughness={0.25} metalness={0.7} />
            </mesh>
            <mesh geometry={geo.rearWingBlade} position={[0, 0.98, 1.95]} castShadow>
              <meshStandardMaterial color="#18181b" roughness={0.3} metalness={0.5} />
            </mesh>

            {/* Wheels */}
            {[-0.85, 0.85].flatMap((wx) =>
              [-1.35, 1.35].map((wz, wi) => (
                <mesh
                  key={`wheel-${wi}-${wx}`}
                  position={[wx, 0.35, wz]}
                  geometry={geo.tire}
                  castShadow
                >
                  <meshStandardMaterial color="#16161a" roughness={0.8} />
                </mesh>
              )),
            )}
          </group>
        );
      })}
    </group>
  );
}

// 2x Urban Free Roam City Environment
function FreeRoamCity({ asphaltTexture }: { asphaltTexture: THREE.CanvasTexture }) {
  const completedRaces = useGameStore((state) => state.completedRaces);

  // Road lines & avenues
  const roadWidthAvenue = 18;
  const halfSpan = 270;

  return (
    <group>
      {/* 1. Interconnected Asphalt Street Grid */}
      {/* Main Broadway (North-South Avenue at x = 0) */}
      <mesh position={[0, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[roadWidthAvenue, 540]} />
        <meshStandardMaterial color="#1b1e24" roughness={0.85} />
      </mesh>
      {/* Cross Boulevard (East-West Avenue at z = 0) */}
      <mesh position={[0, 0.006, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[540, roadWidthAvenue]} />
        <meshStandardMaterial color="#1b1e24" roughness={0.85} />
      </mesh>
      {/* Parallel Avenues at x = ±80, ±160 */}
      {[-160, -80, 80, 160].map((ax) => (
        <mesh
          key={`ave-x-${ax}`}
          position={[ax, 0.005, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          receiveShadow
        >
          <planeGeometry args={[14, 540]} />
          <meshStandardMaterial color="#1b1e24" roughness={0.85} />
        </mesh>
      ))}
      {/* Cross Streets at z = ±80, ±160 */}
      {[-160, -80, 80, 160].map((az) => (
        <mesh
          key={`ave-z-${az}`}
          position={[0, 0.005, az]}
          rotation={[-Math.PI / 2, 0, 0]}
          receiveShadow
        >
          <planeGeometry args={[540, 14]} />
          <meshStandardMaterial color="#1b1e24" roughness={0.85} />
        </mesh>
      ))}

      {/* Perimeter 4-Lane Highway Ring (at ±230) */}
      {[-230, 230].map((px) => (
        <mesh
          key={`hwy-x-${px}`}
          position={[px, 0.007, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          receiveShadow
        >
          <planeGeometry args={[22, 480]} />
          <meshStandardMaterial color="#17191e" roughness={0.8} />
        </mesh>
      ))}
      {[-230, 230].map((pz) => (
        <mesh
          key={`hwy-z-${pz}`}
          position={[0, 0.007, pz]}
          rotation={[-Math.PI / 2, 0, 0]}
          receiveShadow
        >
          <planeGeometry args={[480, 22]} />
          <meshStandardMaterial color="#17191e" roughness={0.8} />
        </mesh>
      ))}

      {/* Yellow Dashed Road Markings along Broadway & Cross Blvd */}
      {Array.from({ length: 50 }).map((_, i) => (
        <React.Fragment key={`markings-${i}`}>
          <mesh
            position={[0, 0.012, -245 + i * 10]}
            rotation={[-Math.PI / 2, 0, 0]}
            receiveShadow
          >
            <planeGeometry args={[0.35, 5]} />
            <meshStandardMaterial color="#facc15" roughness={0.6} />
          </mesh>
          <mesh
            position={[-245 + i * 10, 0.012, 0]}
            rotation={[-Math.PI / 2, 0, Math.PI / 2]}
            receiveShadow
          >
            <planeGeometry args={[0.35, 5]} />
            <meshStandardMaterial color="#facc15" roughness={0.6} />
          </mesh>
        </React.Fragment>
      ))}

      {/* 2. Varied 3D Buildings across City Blocks */}
      {CITY_BUILDINGS.map((bld) => (
        <UrbanBuilding key={bld.id} bld={bld} />
      ))}

      {/* 3. Parked Display Cars at Car Lot Showroom */}
      <ParkedShowroomCars />

      {/* 4. Glowing World Beacons (Central Garage, Car Lot, and Street Races) */}
      {FREE_ROAM_BEACONS.map((beacon) => {
        const isUnlocked =
          beacon.type !== 'race' ||
          !beacon.trackId ||
          isTrackUnlocked(beacon.trackId, completedRaces).unlocked;

        return (
          <WorldBeaconMarker
            key={beacon.id}
            beacon={beacon}
            isUnlocked={isUnlocked}
          />
        );
      })}

      {/* 5. Streetlights along Avenue Curbs */}
      {STREET_LIGHTS.map((sl, i) => (
        <group key={`streetlight-${i}`} position={[sl.x, 0, sl.z]} rotation={[0, sl.yaw, 0]}>
          {/* Post */}
          <mesh position={[0, 3.5, 0]}>
            <cylinderGeometry args={[0.1, 0.14, 7, 8]} />
            <meshStandardMaterial color="#334155" metalness={0.7} roughness={0.3} />
          </mesh>
          {/* Overhang Arm */}
          <mesh position={[0.7, 6.9, 0]} rotation={[0, 0, -0.3]}>
            <cylinderGeometry args={[0.07, 0.07, 1.8, 8]} />
            <meshStandardMaterial color="#334155" metalness={0.7} roughness={0.3} />
          </mesh>
          {/* Glowing LED Fixture */}
          <mesh position={[1.4, 6.7, 0]}>
            <boxGeometry args={[0.4, 0.12, 0.25]} />
            <meshStandardMaterial
              color="#fff7ed"
              emissive="#fef08a"
              emissiveIntensity={2.5}
              roughness={0.2}
            />
          </mesh>
        </group>
      ))}

      {/* 6. Practice Slalom Pylons in Center Plaza */}
      {FREE_ROAM_PYLONS.map((p, i) => (
        <RigidBody key={`pylon-${i}`} type="dynamic" mass={2} position={[p.x, 0.5, p.z]}>
          <mesh castShadow receiveShadow>
            <cylinderGeometry args={[0.25, 0.45, 1.0, 12]} />
            <meshStandardMaterial color="#f97316" roughness={0.4} />
          </mesh>
        </RigidBody>
      ))}

      {/* 7. Secondary Plaza Obstacles */}
      {FREE_ROAM_OBSTACLES.map((obs, i) => (
        <RigidBody key={`obs-${i}`} type="fixed" position={[obs.x, obs.size[1] / 2, obs.z]}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={obs.size} />
            <meshStandardMaterial color={obs.color} roughness={0.6} metalness={0.2} />
          </mesh>
        </RigidBody>
      ))}

      {/* 8. Outer 2x Perimeter Highway Boundary Walls (width=560, depth=560) */}
      <RigidBody type="fixed" position={[FREE_ROAM_BOUNDS.centerX, 2.5, FREE_ROAM_BOUNDS.minZ]}>
        <mesh receiveShadow>
          <boxGeometry args={[FREE_ROAM_BOUNDS.width, 5, 3]} />
          <meshStandardMaterial color="#1e293b" roughness={0.8} />
        </mesh>
      </RigidBody>
      <RigidBody type="fixed" position={[FREE_ROAM_BOUNDS.centerX, 2.5, FREE_ROAM_BOUNDS.maxZ]}>
        <mesh receiveShadow>
          <boxGeometry args={[FREE_ROAM_BOUNDS.width, 5, 3]} />
          <meshStandardMaterial color="#1e293b" roughness={0.8} />
        </mesh>
      </RigidBody>
      <RigidBody type="fixed" position={[FREE_ROAM_BOUNDS.minX, 2.5, FREE_ROAM_BOUNDS.centerZ]}>
        <mesh receiveShadow>
          <boxGeometry args={[3, 5, FREE_ROAM_BOUNDS.depth]} />
          <meshStandardMaterial color="#1e293b" roughness={0.8} />
        </mesh>
      </RigidBody>
      <RigidBody type="fixed" position={[FREE_ROAM_BOUNDS.maxX, 2.5, FREE_ROAM_BOUNDS.centerZ]}>
        <mesh receiveShadow>
          <boxGeometry args={[3, 5, FREE_ROAM_BOUNDS.depth]} />
          <meshStandardMaterial color="#1e293b" roughness={0.8} />
        </mesh>
      </RigidBody>
    </group>
  );
}

export function GameEnvironment() {
  const view = useGameStore((state) => state.view);
  const activeTrackId = useGameStore((state) => state.activeTrackId);
  const { gl } = useThree();

  const asphaltTexture = useMemo(() => {
    const maxAniso = gl.capabilities.getMaxAnisotropy();
    return createAsphaltTexture(Math.min(maxAniso, 8));
  }, [gl]);

  useEffect(() => {
    return () => asphaltTexture.dispose();
  }, [asphaltTexture]);

  const activeTrack = useMemo(() => getBuiltRaceTrack(activeTrackId), [activeTrackId]);
  const isShowroom = view === 'MENU' || view === 'GARAGE' || view === 'CAREER' || view === 'CAR_LOT';

  return (
    <group>
      {/* Solid Ground Collider (friction 0 so CarModel controls rolling/grip cleanly) */}
      <RigidBody type="fixed" friction={0} restitution={0}>
        <CuboidCollider args={[700, 0.5, 700]} position={[0, -0.5, 0]} friction={0} />
        <mesh
          receiveShadow
          position={[0, isShowroom ? -0.045 : 0, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <planeGeometry args={[isShowroom ? 160 : 1400, isShowroom ? 160 : 1400]} />
          <meshStandardMaterial
            map={isShowroom ? null : asphaltTexture}
            color={isShowroom ? '#12151c' : view === 'RACE' ? '#243028' : '#ffffff'}
            roughness={isShowroom ? 0.65 : 0.88}
            metalness={isShowroom ? 0.12 : 0.04}
            polygonOffset
            polygonOffsetFactor={1}
            polygonOffsetUnits={1}
          />
        </mesh>
      </RigidBody>

      {/* RACE MODE: Custom Procedural Closed Circuit */}
      {view === 'RACE' && <CustomRaceTrack track={activeTrack} asphaltTexture={asphaltTexture} />}

      {/* FREE ROAM MODE: 2x Urban Street-Racing City */}
      {view === 'FREE_ROAM' && <FreeRoamCity asphaltTexture={asphaltTexture} />}

      {/* Garage / Menu / Car Lot Showroom Turntable */}
      {isShowroom && (
        <group>
          <mesh position={[0, -0.0225, 0]} receiveShadow>
            <cylinderGeometry args={[3.6, 3.8, 0.045, 64]} />
            <meshStandardMaterial color="#1e222b" metalness={0.45} roughness={0.42} />
          </mesh>
          <mesh position={[0, 0.008, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[3.52, 3.62, 64]} />
            <meshStandardMaterial
              color="#ff9900"
              emissive="#ff9900"
              emissiveIntensity={1.5}
              roughness={0.25}
              polygonOffset
              polygonOffsetFactor={-1}
              polygonOffsetUnits={-1}
            />
          </mesh>
          <pointLight position={[0, 4.5, 0]} intensity={8} distance={14} color="#ffedd5" />
        </group>
      )}
    </group>
  );
}
