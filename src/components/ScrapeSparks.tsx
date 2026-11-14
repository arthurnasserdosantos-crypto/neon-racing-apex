import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const MAX_SPARKS = 160;
const SPARK_PALETTE = [
  new THREE.Color('#FF9900'),
  new THREE.Color('#FFD54F'),
  new THREE.Color('#FFFFFF'),
  new THREE.Color('#FF9900'),
  new THREE.Color('#FFD54F'),
];

const px = new Float32Array(MAX_SPARKS);
const py = new Float32Array(MAX_SPARKS);
const pz = new Float32Array(MAX_SPARKS);
const vx = new Float32Array(MAX_SPARKS);
const vy = new Float32Array(MAX_SPARKS);
const vz = new Float32Array(MAX_SPARKS);
const life = new Float32Array(MAX_SPARKS);
const maxLife = new Float32Array(MAX_SPARKS);
const activeFlags = new Uint8Array(MAX_SPARKS);

let writeCursor = 0;

export function clearScrapeSparks() {
  activeFlags.fill(0);
  life.fill(0);
}

/**
 * Emits amber-orange / molten gold / white glowing sparks directly at the 3D
 * car-on-car contact point, shooting backward relative to vehicle motion.
 */
export function emitCarScrapeSparks(
  contactX: number,
  contactY: number,
  contactZ: number,
  carVelX: number,
  carVelZ: number,
  normalX: number,
  normalZ: number,
  count = 6,
) {
  const speed = Math.hypot(carVelX, carVelZ);
  const dirX = speed > 0.5 ? carVelX / speed : 0;
  const dirZ = speed > 0.5 ? carVelZ / speed : -1;

  for (let i = 0; i < count; i++) {
    const idx = writeCursor;
    writeCursor = (writeCursor + 1) % MAX_SPARKS;

    activeFlags[idx] = 1;
    const ttl = 0.25 + Math.random() * 0.15; // 0.25s .. 0.40s
    life[idx] = ttl;
    maxLife[idx] = ttl;

    px[idx] = contactX + (Math.random() - 0.5) * 0.14;
    py[idx] = contactY + (Math.random() - 0.5) * 0.16;
    pz[idx] = contactZ + (Math.random() - 0.5) * 0.14;

    // Shoot backward relative to car travel + spray outward along collision normal + upward kick
    const backSpeed = Math.min(22, 6 + speed * 0.48 + Math.random() * 6.5);
    const sideSpray = (Math.random() - 0.2) * 5.2;
    const tangentSpray = (Math.random() - 0.5) * 3.8;

    vx[idx] = -dirX * backSpeed + normalX * sideSpray - dirZ * tangentSpray;
    vz[idx] = -dirZ * backSpeed + normalZ * sideSpray + dirX * tangentSpray;
    vy[idx] = 1.4 + Math.random() * 4.4;
  }
}

const _dummyPos = new THREE.Vector3();
const _dummyTarget = new THREE.Vector3();
const _dummyScale = new THREE.Vector3();
const _dummyMat = new THREE.Matrix4();
const _lookMat = new THREE.Matrix4();
const _quat = new THREE.Quaternion();
const _up = new THREE.Vector3(0, 1, 0);

export function ScrapeSparks() {
  const meshRef = useRef<THREE.InstancedMesh>(null);

  const { geometry, material } = useMemo(() => {
    const geo = new THREE.BoxGeometry(0.032, 0.032, 0.36);
    const mat = new THREE.MeshBasicMaterial({
      color: '#ffffff',
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    });
    return { geometry: geo, material: mat };
  }, []);

  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    for (let i = 0; i < MAX_SPARKS; i++) {
      mesh.setColorAt(i, SPARK_PALETTE[i % SPARK_PALETTE.length]);
      _dummyMat.makeScale(0, 0, 0);
      mesh.setMatrixAt(i, _dummyMat);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;

    return () => {
      geometry.dispose();
      material.dispose();
    };
  }, [geometry, material]);

  useFrame((_, delta) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const dt = Math.min(delta, 0.05);
    let anyUpdated = false;

    for (let i = 0; i < MAX_SPARKS; i++) {
      if (!activeFlags[i]) continue;
      anyUpdated = true;

      life[i] -= dt;
      if (life[i] <= 0) {
        activeFlags[i] = 0;
        _dummyMat.makeScale(0, 0, 0);
        mesh.setMatrixAt(i, _dummyMat);
        continue;
      }

      // Gravity + air drag
      vy[i] -= 21 * dt;
      const drag = Math.exp(-1.6 * dt);
      vx[i] *= drag;
      vz[i] *= drag;

      px[i] += vx[i] * dt;
      py[i] += vy[i] * dt;
      pz[i] += vz[i] * dt;

      // Asphalt ground bounce at y = 0.025
      if (py[i] <= 0.025) {
        py[i] = 0.025;
        if (vy[i] < -0.4) {
          vy[i] = Math.abs(vy[i]) * 0.48;
          vx[i] *= 0.82;
          vz[i] *= 0.82;
        } else {
          vy[i] = 0.25;
        }
      }

      const ratio = Math.max(0, life[i] / maxLife[i]);
      const speed3D = Math.hypot(vx[i], vy[i], vz[i]);

      _dummyPos.set(px[i], py[i], pz[i]);
      if (speed3D > 0.1) {
        _dummyTarget.set(px[i] + vx[i], py[i] + vy[i], pz[i] + vz[i]);
        _lookMat.lookAt(_dummyPos, _dummyTarget, _up);
        _quat.setFromRotationMatrix(_lookMat);
      } else {
        _quat.identity();
      }

      const thickness = 0.45 + 0.75 * ratio;
      const stretch = Math.min(2.4, Math.max(0.35, speed3D * 0.09)) * (0.4 + 0.6 * ratio);
      _dummyScale.set(thickness, thickness, stretch);
      _dummyMat.compose(_dummyPos, _quat, _dummyScale);
      mesh.setMatrixAt(i, _dummyMat);
    }

    if (anyUpdated) {
      mesh.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, material, MAX_SPARKS]}
      frustumCulled={false}
    />
  );
}
