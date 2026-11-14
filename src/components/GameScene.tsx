import { Suspense, useEffect, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Physics } from '@react-three/rapier';
import { KeyboardControls, OrbitControls } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { useGameStore } from '../store';
import { CarModel } from './CarModel';
import { AIOpponentCars } from './AIOpponentCars';
import { GameEnvironment } from './GameEnvironment';
import { ScrapeSparks } from './ScrapeSparks';

function StudioEnvironment() {
  const { gl, scene } = useThree();

  useEffect(() => {
    const pmremGenerator = new THREE.PMREMGenerator(gl);
    const roomEnv = new RoomEnvironment();
    const envRT = pmremGenerator.fromScene(roomEnv, 0.04);
    scene.environment = envRT.texture;
    roomEnv.dispose();
    pmremGenerator.dispose();

    return () => {
      scene.environment = null;
      envRT.dispose();
    };
  }, [gl, scene]);

  return null;
}

function CameraClipController({ isInteractiveWorld }: { isInteractiveWorld: boolean }) {
  const { camera } = useThree();

  useEffect(() => {
    camera.near = 0.5;
    camera.far = isInteractiveWorld ? 650 : 120;
    camera.updateProjectionMatrix();
  }, [camera, isInteractiveWorld]);

  return null;
}

function ShowroomOrbitRig() {
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const autoOrbitCam = useGameStore((state) => state.autoOrbitCam);
  const keysRef = useRef({ q: false, e: false });

  useEffect(() => {
    const onKeyDown = (ev: KeyboardEvent) => {
      if (ev.target instanceof HTMLInputElement || ev.target instanceof HTMLTextAreaElement) return;
      if (ev.key === 'q' || ev.key === 'Q') keysRef.current.q = true;
      if (ev.key === 'e' || ev.key === 'E') keysRef.current.e = true;
    };
    const onKeyUp = (ev: KeyboardEvent) => {
      if (ev.key === 'q' || ev.key === 'Q') keysRef.current.q = false;
      if (ev.key === 'e' || ev.key === 'E') keysRef.current.e = false;
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  useFrame((_, delta) => {
    const ctrl = controlsRef.current;
    if (!ctrl) return;
    const dt = Math.min(delta, 0.05);
    const dir = (keysRef.current.e ? 1 : 0) - (keysRef.current.q ? 1 : 0);
    if (dir !== 0) {
      ctrl.setAzimuthalAngle(ctrl.getAzimuthalAngle() + dir * 1.45 * dt);
      ctrl.update();
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      autoRotate={autoOrbitCam}
      autoRotateSpeed={0.55}
      enableDamping
      dampingFactor={0.055}
      enablePan={false}
      minDistance={3.9}
      maxDistance={9.5}
      target={[0.45, 0.55, 0]}
      maxPolarAngle={Math.PI / 2 - 0.08}
      minPolarAngle={Math.PI / 5}
    />
  );
}

export function GameScene() {
  const view = useGameStore((state) => state.view);

  // In menu/garage/career, render live industrial showroom showcase. In game, full physics.
  const isInteractiveWorld = view === 'FREE_ROAM' || view === 'RACE';
  const shadowFrustum = isInteractiveWorld ? 30 : 12;

  return (
    <KeyboardControls
      map={[
        { name: 'forward', keys: ['ArrowUp', 'KeyW'] },
        { name: 'backward', keys: ['ArrowDown', 'KeyS'] },
        { name: 'left', keys: ['ArrowLeft', 'KeyA'] },
        { name: 'right', keys: ['ArrowRight', 'KeyD'] },
        { name: 'brake', keys: ['Space'] },
      ]}
    >
      <Canvas
        shadows={{ type: THREE.PCFSoftShadowMap }}
        dpr={[1, 2]}
        gl={{
          antialias: true,
          powerPreference: 'high-performance',
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.02,
        }}
        camera={{ position: [4.4, 2.05, 5.6], fov: 46, near: 0.5, far: 120 }}
        onCreated={({ gl }) => {
          const canvas = gl.domElement;
          const handleLost = (e: Event) => {
            e.preventDefault();
          };
          canvas.addEventListener('webglcontextlost', handleLost, false);
        }}
      >
        <CameraClipController isInteractiveWorld={isInteractiveWorld} />
        <color attach="background" args={[isInteractiveWorld ? '#87CEEB' : '#0d0e10']} />
        {isInteractiveWorld ? (
          <fog attach="fog" args={['#87CEEB', 115, 360]} />
        ) : (
          <fog attach="fog" args={['#0d0e10', 14, 42]} />
        )}

        <StudioEnvironment />

        <hemisphereLight
          args={[
            isInteractiveWorld ? '#c7e2ff' : '#a1a1aa',
            isInteractiveWorld ? '#2f343b' : '#111216',
            isInteractiveWorld ? 0.75 : 0.6,
          ]}
        />

        <directionalLight
          castShadow
          position={[18, 28, 16]}
          intensity={isInteractiveWorld ? 1.8 : 1.75}
          color={isInteractiveWorld ? '#fff7ed' : '#ffedd5'}
          shadow-mapSize={[2048, 2048]}
          shadow-bias={-0.0005}
          shadow-normalBias={0.02}
          shadow-radius={3}
        >
          <orthographicCamera
            attach="shadow-camera"
            args={[
              -shadowFrustum,
              shadowFrustum,
              shadowFrustum,
              -shadowFrustum,
              1,
              isInteractiveWorld ? 100 : 65,
            ]}
          />
        </directionalLight>

        {!isInteractiveWorld && (
          <>
            {/* Gritty NFSMW Amber Overpass Rim & Cool Steel Fill */}
            <directionalLight position={[-11, 5, -9]} intensity={0.95} color="#ff9900" />
            <directionalLight position={[10, 4, -12]} intensity={0.45} color="#71717a" />
          </>
        )}

        <Suspense fallback={null}>
          <Physics gravity={[0, -9.81, 0]} paused={!isInteractiveWorld}>
            <GameEnvironment />
            <CarModel isInteractive={isInteractiveWorld} />
            <AIOpponentCars />
          </Physics>
        </Suspense>

        {isInteractiveWorld && <ScrapeSparks />}

        {!isInteractiveWorld && <ShowroomOrbitRig />}
      </Canvas>
    </KeyboardControls>
  );
}
