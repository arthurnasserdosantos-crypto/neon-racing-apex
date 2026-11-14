import React, { useRef, useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useKeyboardControls } from '@react-three/drei';
import { RigidBody, RapierRigidBody, CuboidCollider } from '@react-three/rapier';
import * as THREE from 'three';
import { useGameStore } from '../store';
import { createCarGeometrySet, disposeCarGeometrySet } from '../utils/carGeometry';
import { carTelemetry, raceTelemetry, resetCarTelemetry, resetRaceTelemetry } from '../utils/freeRoamWorld';
import { getCarPerformanceSpecs, TARGET_ZERO_TO_SIXTY_MS } from '../utils/carTuning';
import { engineAudio } from '../utils/engineAudio';
import { findNearestTrackSample, getBuiltRaceTrack } from '../utils/raceTracks';
import {
  applyWallSlideVelocity,
  buildVehicleObb,
  getFreeRoamObstacleObbs,
  getTrackBarrierObbs,
  OBB2D,
  testObbOverlap,
} from '../utils/collisionPhysics';
import { clearScrapeSparks, emitCarScrapeSparks } from './ScrapeSparks';

const GEAR_MAX_SPEED_FRACS = [0.16, 0.28, 0.43, 0.6, 0.8, 1.0] as const;
const _spawnYAxis = new THREE.Vector3(0, 1, 0);
const _spawnQuat = new THREE.Quaternion();

interface CarModelProps {
  isInteractive: boolean;
}

// Pre-allocated math helpers to avoid per-frame GC inside useFrame
const _quat = new THREE.Quaternion();
const _camQuat = new THREE.Quaternion();
const _forward = new THREE.Vector3();
const _right = new THREE.Vector3();
const _horizVel = new THREE.Vector3();
const _targetPos = new THREE.Vector3();
const _camOffset = new THREE.Vector3();
const _desiredCamPos = new THREE.Vector3();
const _lookOffset = new THREE.Vector3();
const _lookAtPos = new THREE.Vector3();
const _playerObb: OBB2D = { cx: 0, cz: 0, ux: 1, uz: 0, fx: 0, fz: -1, halfW: 0.98, halfL: 2.22 };
const _botObb: OBB2D = { cx: 0, cz: 0, ux: 1, uz: 0, fx: 0, fz: -1, halfW: 0.98, halfL: 2.22 };
const _velSlideOut = { vx: 0, vz: 0 };

const WHEEL_RADIUS = 0.355;

interface WheelAssemblyProps {
  position: [number, number, number];
  isLeft: boolean;
  isRear: boolean;
  tireGeo: THREE.BufferGeometry;
  rimLipGeo: THREE.BufferGeometry;
  wheelColor: string;
  steerRef?: React.RefObject<THREE.Group | null>;
  spinRef: (el: THREE.Group | null) => void;
}

function WheelAssembly({
  position,
  isLeft,
  isRear,
  tireGeo,
  rimLipGeo,
  wheelColor,
  steerRef,
  spinRef,
}: WheelAssemblyProps) {
  const sideSign = isLeft ? -1 : 1;
  const scaleZ = isRear ? 1.04 : 1.0;
  const scaleY = isRear ? 1.04 : 1.0;
  const scaleX = isRear ? 1.12 : 1.0;

  const spokeAngles = useMemo(() => {
    const angles: number[] = [];
    for (let i = 0; i < 5; i++) {
      const base = (i * Math.PI * 2) / 5;
      angles.push(base - 0.14, base + 0.14);
    }
    return angles;
  }, []);

  const wheelContent = (
    <group scale={[scaleX, scaleY, scaleZ]}>
      {/* Fixed Brake Caliper (doesn't spin with wheel, turns with steering knuckle) */}
      <mesh position={[-sideSign * 0.04, 0.05, isRear ? -0.11 : 0.11]} castShadow>
        <boxGeometry args={[0.07, 0.13, 0.09]} />
        <meshStandardMaterial color="#ef4444" metalness={0.5} roughness={0.3} />
      </mesh>

      {/* Spinning Wheel + Rotor Group */}
      <group ref={spinRef}>
        {/* Tire */}
        <mesh geometry={tireGeo} castShadow receiveShadow>
          <meshStandardMaterial color="#16161a" roughness={0.86} metalness={0.05} />
        </mesh>

        {/* Alloy Rim Barrel & Outer Lip */}
        <mesh geometry={rimLipGeo} castShadow>
          <meshStandardMaterial color={wheelColor} metalness={0.88} roughness={0.2} />
        </mesh>

        {/* Center Hub Cap */}
        <mesh position={[sideSign * 0.08, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.065, 0.065, 0.06, 16]} />
          <meshStandardMaterial color={wheelColor} metalness={0.9} roughness={0.18} />
        </mesh>
        <mesh position={[sideSign * 0.112, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.032, 0.032, 0.015, 16]} />
          <meshStandardMaterial color="#f97316" metalness={0.8} roughness={0.25} />
        </mesh>

        {/* 5 Twin-Spoke Alloy Design */}
        {spokeAngles.map((angle, idx) => (
          <group key={idx} rotation={[angle, 0, 0]}>
            <mesh position={[sideSign * 0.095, 0.115, 0]}>
              <boxGeometry args={[0.025, 0.21, 0.022]} />
              <meshStandardMaterial color={wheelColor} metalness={0.88} roughness={0.2} />
            </mesh>
          </group>
        ))}

        {/* Inner Brake Disc Rotor */}
        <mesh position={[-sideSign * 0.02, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.18, 0.18, 0.025, 24]} />
          <meshStandardMaterial color="#a1a1aa" metalness={0.92} roughness={0.28} />
        </mesh>
      </group>
    </group>
  );

  if (steerRef) {
    return (
      <group position={position} ref={steerRef}>
        {wheelContent}
      </group>
    );
  }

  return <group position={position}>{wheelContent}</group>;
}

export function CarModel({ isInteractive }: CarModelProps) {
  const bodyRef = useRef<RapierRigidBody>(null);
  const chassisVisualRef = useRef<THREE.Group>(null);
  const frontLeftSteerRef = useRef<THREE.Group>(null);
  const frontRightSteerRef = useRef<THREE.Group>(null);
  const wheelSpinRefs = useRef<(THREE.Group | null)[]>([null, null, null, null]);

  const [, getKeys] = useKeyboardControls();
  const rawCarSettings = useGameStore((state) => state.car);
  const view = useGameStore((state) => state.view);
  const previewCarId = useGameStore((state) => state.previewCarId);
  const cars = useGameStore((state) => state.cars);
  const raceState = useGameStore((state) => state.raceState);
  const activeTrackId = useGameStore((state) => state.activeTrackId);
  const raceSessionId = useGameStore((state) => state.raceSessionId);
  const finishRace = useGameStore((state) => state.finishRace);

  const currentModelId =
    view === 'CAR_LOT' && previewCarId ? previewCarId : rawCarSettings.modelId || 'starter';
  const carSettings =
    view === 'CAR_LOT' && previewCarId && cars[previewCarId]
      ? cars[previewCarId]
      : rawCarSettings;

  const activeTrack = useMemo(() => getBuiltRaceTrack(activeTrackId), [activeTrackId]);

  const steerAngleRef = useRef(0);
  const yawRateRef = useRef(0);
  const wheelSpinAngleRef = useRef(0);
  const bodyRollRef = useRef(0);
  const bodyPitchRef = useRef(0);
  const currentGearRef = useRef(0);
  const countdownRevRpmRef = useRef(0.16);
  const lapProgressRef = useRef({ sampleIdx: 0, lap: 0 });
  const tailBarMatRef = useRef<THREE.MeshStandardMaterial>(null);
  const tailLeftMatRef = useRef<THREE.MeshStandardMaterial>(null);
  const tailRightMatRef = useRef<THREE.MeshStandardMaterial>(null);
  const camYawRef = useRef(0);
  const camInitializedRef = useRef(false);
  const camTargetPosRef = useRef(new THREE.Vector3(0, 0.08, 0));
  const camLookAtRef = useRef(new THREE.Vector3(0, 0.9, -5.5));
  const launchClockRef = useRef<{ active: boolean; elapsed: number; lastSplit: number | null }>({
    active: false,
    elapsed: 0,
    lastSplit: null,
  });

  const geometries = useMemo(() => createCarGeometrySet(currentModelId), [currentModelId]);
  useEffect(() => {
    return () => disposeCarGeometrySet(geometries);
  }, [geometries]);

  const flameTexture = useMemo(() => {
    const loader = new THREE.TextureLoader();
    const tex = loader.load('/assets/flames_vinyl.png');
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, []);

  useEffect(() => {
    return () => flameTexture.dispose();
  }, [flameTexture]);

  // Unlock Web Audio on first user input when driving, and silence cleanly when leaving interactive mode
  useEffect(() => {
    if (!isInteractive) {
      engineAudio.stopAll();
      return;
    }
    const handleUnlock = () => engineAudio.unlock();
    window.addEventListener('keydown', handleUnlock, { passive: true });
    window.addEventListener('pointerdown', handleUnlock, { passive: true });
    return () => {
      window.removeEventListener('keydown', handleUnlock);
      window.removeEventListener('pointerdown', handleUnlock);
      engineAudio.stopAll();
    };
  }, [isInteractive]);

  // Reset car position & dynamics cleanly whenever switching modes or starting a race
  useEffect(() => {
    steerAngleRef.current = 0;
    yawRateRef.current = 0;
    bodyRollRef.current = 0;
    bodyPitchRef.current = 0;
    currentGearRef.current = 0;
    countdownRevRpmRef.current = 0.16;
    camInitializedRef.current = false;
    lapProgressRef.current = { sampleIdx: 0, lap: 0 };
    launchClockRef.current = { active: false, elapsed: 0, lastSplit: null };
    clearScrapeSparks();
    resetCarTelemetry();

    if (view === 'RACE') {
      resetRaceTelemetry(
        activeTrack.laps,
        activeTrack.totalLength * activeTrack.laps,
        activeTrack.isBoss,
        activeTrack.bossProfile?.name,
        activeTrack.bossProfile?.accentColor,
      );
    }

    if (frontLeftSteerRef.current) frontLeftSteerRef.current.rotation.y = 0;
    if (frontRightSteerRef.current) frontRightSteerRef.current.rotation.y = 0;
    if (chassisVisualRef.current) chassisVisualRef.current.rotation.set(0, 0, 0);

    if (bodyRef.current) {
      if (view === 'RACE') {
        const startSample = activeTrack.samples[0];
        const yaw = Math.atan2(-startSample.tangent.x, -startSample.tangent.z);
        _spawnQuat.setFromAxisAngle(_spawnYAxis, yaw);
        bodyRef.current.setTranslation(
          { x: startSample.pos.x, y: 0.08, z: startSample.pos.z },
          true,
        );
        bodyRef.current.setRotation(
          { x: _spawnQuat.x, y: _spawnQuat.y, z: _spawnQuat.z, w: _spawnQuat.w },
          true,
        );
        carTelemetry.x = startSample.pos.x;
        carTelemetry.z = startSample.pos.z;
        carTelemetry.fx = startSample.tangent.x;
        carTelemetry.fz = startSample.tangent.z;
        carTelemetry.headingRad = Math.atan2(startSample.tangent.x, -startSample.tangent.z);
      } else {
        bodyRef.current.setTranslation({ x: 0, y: isInteractive ? 0.08 : 0.0, z: 0 }, true);
        bodyRef.current.setRotation({ x: 0, y: 0, z: 0, w: 1 }, true);
      }
      if (isInteractive) {
        bodyRef.current.setLinvel({ x: 0, y: 0, z: 0 }, true);
        bodyRef.current.setAngvel({ x: 0, y: 0, z: 0 }, true);
      }
    }
  }, [view, isInteractive, activeTrack, raceSessionId]);

  // Derive calibrated 5-tier physics stats from Garage upgrades and vehicle model
  const specs = useMemo(
    () => getCarPerformanceSpecs(carSettings, currentModelId),
    [carSettings, currentModelId],
  );
  const {
    maxForwardSpeedMs: maxForwardSpeed,
    maxReverseSpeedMs: maxReverseSpeed,
    terminalSpeedMs,
    engineAccelMs2,
    throttleDragPerSec,
    maxTurnRate,
    lateralGrip,
  } = specs;

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);

    if (!isInteractive || !bodyRef.current) {
      return;
    }

    const keys = getKeys();
    const rb = bodyRef.current;

    // 1. Read current linear velocity and orientation
    const linVel = rb.linvel();
    const rot = rb.rotation();
    _quat.set(rot.x, rot.y, rot.z, rot.w);

    // Local forward (-Z) and right (+X) projected cleanly on XZ plane
    _forward.set(0, 0, -1).applyQuaternion(_quat);
    _forward.y = 0;
    if (_forward.lengthSq() > 1e-6) _forward.normalize();

    _right.set(1, 0, 0).applyQuaternion(_quat);
    _right.y = 0;
    if (_right.lengthSq() > 1e-6) _right.normalize();

    const isCountdownLocked = view === 'RACE' && raceState === 'countdown';

    if (isCountdownLocked) {
      // Lock physical movement & steering on the grid while allowing engine revving & RPM feedback
      rb.setLinvel({ x: 0, y: linVel.y, z: 0 }, true);
      rb.setAngvel({ x: 0, y: 0, z: 0 }, true);
      steerAngleRef.current = 0;
      yawRateRef.current = 0;
      if (frontLeftSteerRef.current) frontLeftSteerRef.current.rotation.y = 0;
      if (frontRightSteerRef.current) frontRightSteerRef.current.rotation.y = 0;

      const isRevving = Boolean(keys.forward);
      const targetRev = isRevving ? 0.94 : 0.16;
      countdownRevRpmRef.current = THREE.MathUtils.damp(
        countdownRevRpmRef.current,
        targetRev,
        isRevving ? 8.5 : 5.5,
        dt,
      );

      const isHoldingBrakes = Boolean(keys.brake) || Boolean(keys.backward);
      const brakeGlowVal = isHoldingBrakes ? 5.0 : 2.2;
      if (tailBarMatRef.current) tailBarMatRef.current.emissiveIntensity = brakeGlowVal;
      if (tailLeftMatRef.current) tailLeftMatRef.current.emissiveIntensity = brakeGlowVal * 1.15;
      if (tailRightMatRef.current) tailRightMatRef.current.emissiveIntensity = brakeGlowVal * 1.15;

      const revTorquePitch = isRevving ? 0.016 : 0;
      bodyRollRef.current = THREE.MathUtils.damp(bodyRollRef.current, 0, 10, dt);
      bodyPitchRef.current = THREE.MathUtils.damp(bodyPitchRef.current, revTorquePitch, 14, dt);
      if (chassisVisualRef.current) {
        chassisVisualRef.current.rotation.z = bodyRollRef.current;
        chassisVisualRef.current.rotation.x = bodyPitchRef.current;
      }

      engineAudio.update({
        active: true,
        speedKph: 0,
        speedRatio: 0,
        rpmRatio: countdownRevRpmRef.current,
        isAccelerating: isRevving,
        isDeceleratingCoasting: false,
        isBraking: isHoldingBrakes,
        isHandbrake: Boolean(keys.brake),
      });

      const pos = rb.translation();
      carTelemetry.x = pos.x;
      carTelemetry.y = pos.y;
      carTelemetry.z = pos.z;
      carTelemetry.fx = _forward.x;
      carTelemetry.fz = _forward.z;
      carTelemetry.headingRad = Math.atan2(_forward.x, -_forward.z);
      carTelemetry.speedKph = 0;
      carTelemetry.forwardSpeed = 0;
      carTelemetry.isBraking = isHoldingBrakes;
      carTelemetry.isDrifting = false;
      carTelemetry.gear = isRevving ? '1' : 'N';
      carTelemetry.rpmRatio = countdownRevRpmRef.current;
      carTelemetry.zeroToSixtySplitSec = null;

      // Keep chase camera cleanly positioned behind the grid car
      const carYaw = Math.atan2(-_forward.x, -_forward.z);
      _targetPos.set(pos.x, pos.y, pos.z);
      if (!camInitializedRef.current) {
        camYawRef.current = carYaw;
        camTargetPosRef.current.copy(_targetPos);
        _camQuat.setFromAxisAngle(_spawnYAxis, carYaw);
        _camOffset.set(0, 2.75, 6.7).applyQuaternion(_camQuat);
        state.camera.position.copy(_targetPos).add(_camOffset);
        _lookOffset.set(0, 0.95, -5.5).applyQuaternion(_camQuat);
        camLookAtRef.current.copy(_targetPos).add(_lookOffset);
        state.camera.lookAt(camLookAtRef.current);
        camInitializedRef.current = true;
      } else {
        _camQuat.setFromAxisAngle(_spawnYAxis, camYawRef.current);
        _camOffset.set(0, 2.75, 6.7).applyQuaternion(_camQuat);
        _desiredCamPos.copy(_targetPos).add(_camOffset);
        state.camera.position.lerp(_desiredCamPos, 1 - Math.exp(-10 * dt));
        _lookOffset.set(0, 0.95, -5.5).applyQuaternion(_camQuat);
        _lookAtPos.copy(_targetPos).add(_lookOffset);
        camLookAtRef.current.lerp(_lookAtPos, 1 - Math.exp(-12 * dt));
        state.camera.lookAt(camLookAtRef.current);
      }
      return;
    }

    _horizVel.set(linVel.x, 0, linVel.z);
    let forwardSpeed = _horizVel.dot(_forward);
    let lateralSpeed = _horizVel.dot(_right);

    // 2. Throttle, Brake & Drag
    const isTryingToBrake =
      Boolean(keys.brake) || (Boolean(keys.backward) && forwardSpeed > 1.0);
    const brakeGlowVal = isTryingToBrake ? 5.0 : 1.8;
    if (tailBarMatRef.current) tailBarMatRef.current.emissiveIntensity = brakeGlowVal;
    if (tailLeftMatRef.current) tailLeftMatRef.current.emissiveIntensity = brakeGlowVal * 1.15;
    if (tailRightMatRef.current) tailRightMatRef.current.emissiveIntensity = brakeGlowVal * 1.15;

    const prevForwardSpeed = forwardSpeed;
    let targetPitch = 0;
    if (keys.forward) {
      // Exact framerate-independent exponential integration of dv/dt = engineAccel - drag * v
      const decay = Math.exp(-throttleDragPerSec * dt);
      forwardSpeed = forwardSpeed * decay + terminalSpeedMs * (1 - decay);
      forwardSpeed = Math.min(maxForwardSpeed, forwardSpeed);
      targetPitch = 0.025; // squat rear on acceleration
    } else if (keys.backward) {
      if (forwardSpeed > 0.8) {
        const brakeDecel = Math.max(24, engineAccelMs2 * 1.9);
        forwardSpeed = Math.max(0, forwardSpeed - brakeDecel * dt);
        targetPitch = -0.035; // nose dive on brake
      } else {
        const reverseAccel = Math.max(12, engineAccelMs2 * 0.65);
        forwardSpeed = Math.max(-maxReverseSpeed, forwardSpeed - reverseAccel * dt);
      }
    } else {
      // Natural rolling + aero drag
      forwardSpeed *= Math.exp(-0.95 * dt);
    }

    if (keys.brake) {
      forwardSpeed *= Math.exp(-4.5 * dt);
      targetPitch = -0.04;
    }

    // Track exact 0-60 km/h (16.67 m/s) launch split time from standstill
    const launch = launchClockRef.current;
    if (!launch.active && keys.forward && prevForwardSpeed <= 0.15 && forwardSpeed > 0) {
      launch.active = true;
      launch.elapsed = 0;
    }
    if (launch.active) {
      if (!keys.forward || forwardSpeed < prevForwardSpeed - 0.5) {
        launch.active = false;
      } else if (forwardSpeed >= TARGET_ZERO_TO_SIXTY_MS) {
        // Sub-frame linear interpolation for exact 0-60 crossing time
        const denom = Math.max(1e-5, forwardSpeed - prevForwardSpeed);
        const frac = THREE.MathUtils.clamp(
          (TARGET_ZERO_TO_SIXTY_MS - prevForwardSpeed) / denom,
          0,
          1,
        );
        launch.lastSplit = launch.elapsed + frac * dt;
        launch.active = false;
      } else {
        launch.elapsed += dt;
      }
    }

    // 3. Steering Left & Right (A/Left = +Y CCW, D/Right = -Y CW)
    const steerInput = (keys.left ? 1 : 0) - (keys.right ? 1 : 0);

    // Smooth visual front wheel steer angle (always responsive even from standstill)
    steerAngleRef.current = THREE.MathUtils.damp(
      steerAngleRef.current,
      steerInput * 0.30,
      14,
      dt,
    );
    if (frontLeftSteerRef.current) {
      frontLeftSteerRef.current.rotation.y = steerAngleRef.current;
    }
    if (frontRightSteerRef.current) {
      frontRightSteerRef.current.rotation.y = steerAngleRef.current;
    }

    // Physical yaw rate proportional to speed (starts turning smoothly as soon as car rolls)
    const absSpeed = Math.abs(forwardSpeed);
    const reverseSign = forwardSpeed < -0.5 ? -1 : 1;
    const speedSteerFactor =
      absSpeed > 0.25 ? THREE.MathUtils.clamp(absSpeed / 5.0, 0.35, 1.0) : 0;

    const targetYawRate = steerInput * maxTurnRate * 0.70 * reverseSign * speedSteerFactor;
    yawRateRef.current = THREE.MathUtils.damp(yawRateRef.current, targetYawRate, 14, dt);
    rb.setAngvel({ x: 0, y: yawRateRef.current, z: 0 }, true);

    // 4. Lateral Tire Grip (prevents sideways ice-skating; allows controlled drift on Space)
    const activeGrip = keys.brake ? 2.6 : lateralGrip;
    lateralSpeed *= Math.exp(-activeGrip * dt);

    // 5. Apply combined horizontal velocity, resolve OBB car-to-car & wall/obstacle collisions
    let newVx = _forward.x * forwardSpeed + _right.x * lateralSpeed;
    let newVz = _forward.z * forwardSpeed + _right.z * lateralSpeed;

    const rawPos = rb.translation();
    let posX = rawPos.x;
    let posZ = rawPos.z;
    let posModified = false;

    // 5a. Opponent / Boss Car-to-Car Collisions (physical impulse + STRICT scrape spark emission)
    if (view === 'RACE' && raceState === 'racing') {
      buildVehicleObb(posX, posZ, _forward.x, _forward.z, _playerObb, 0.98, 2.22);
      const maxBotBump = Math.max(2.0, activeTrack.roadWidth * 0.36);

      for (let i = 0; i < raceTelemetry.activeBotCount; i++) {
        const bot = raceTelemetry.bots[i];
        const botFx = Math.sin(bot.headingRad);
        const botFz = -Math.cos(bot.headingRad);
        buildVehicleObb(bot.x, bot.z, botFx, botFz, _botObb, 0.98, 2.22);

        const hit = testObbOverlap(_playerObb, _botObb);
        if (hit.hit) {
          // Separate both vehicles cleanly so neither clips
          const playerPush = hit.depth * 0.58 + 0.005;
          posX += hit.nx * playerPush;
          posZ += hit.nz * playerPush;
          _playerObb.cx = posX;
          _playerObb.cz = posZ;
          posModified = true;

          // Relative velocity before impulse
          const relVx = newVx - bot.vx;
          const relVz = newVz - bot.vz;
          const relVn = relVx * hit.nx + relVz * hit.nz;
          const closingSpeed = relVn < 0 ? -relVn : 0;

          // Push AI / Boss car physically away along its track-lateral & longitudinal axes
          const botRx = -botFz;
          const botRz = botFx;
          const botPushLat = -(hit.nx * botRx + hit.nz * botRz);
          const botPushLong = -(hit.nx * botFx + hit.nz * botFz);

          bot.bumpOffset = THREE.MathUtils.clamp(
            bot.bumpOffset + botPushLat * hit.depth * 0.48,
            -maxBotBump,
            maxBotBump,
          );
          bot.bumpVel += botPushLat * Math.max(2.4, closingSpeed * 0.72 + 1.8);
          bot.speedRecoil = THREE.MathUtils.clamp(
            bot.speedRecoil + botPushLong * Math.max(1.2, closingSpeed * 0.45),
            -8,
            8,
          );

          // Apply opposing impulse & scrape drag to player car
          if (relVn < 0) {
            const impulse = 1.35 * 0.55 * -relVn + 0.6;
            newVx += hit.nx * impulse;
            newVz += hit.nz * impulse;
          } else {
            newVx += hit.nx * 0.9;
            newVz += hit.nz * 0.9;
          }
          newVx *= 0.992;
          newVz *= 0.992;

          // STRICT SPARK TRIGGER: ONLY on moving car-on-car/boss contact or scrape
          const playerSpeed = Math.hypot(newVx, newVz);
          const botSpeed = Math.hypot(bot.vx, bot.vz);
          const peakSpeed = Math.max(playerSpeed, botSpeed);
          const relSpeed = Math.hypot(relVx, relVz);
          const sideDot = Math.abs(hit.nx * _right.x + hit.nz * _right.z);

          if (peakSpeed >= 4.0 && (sideDot > 0.3 || relSpeed >= 1.8)) {
            const sparkCount = 4 + Math.min(7, Math.round((peakSpeed - 4.0) * 0.2));
            emitCarScrapeSparks(
              hit.contactX,
              0.48,
              hit.contactZ,
              newVx,
              newVz,
              hit.nx,
              hit.nz,
              sparkCount,
            );
          }
        }
      }
    }

    // 5b. Static Wall, Barrier & Obstacle Collisions (hard boundary, smooth slide, NEVER emits sparks)
    buildVehicleObb(posX, posZ, _forward.x, _forward.z, _playerObb, 0.99, 2.23);
    if (view === 'RACE') {
      const { segments } = getTrackBarrierObbs(activeTrack);
      for (let i = 0; i < segments.length; i++) {
        const hit = testObbOverlap(_playerObb, segments[i]);
        if (hit.hit) {
          const push = hit.depth + 0.008;
          posX += hit.nx * push;
          posZ += hit.nz * push;
          _playerObb.cx = posX;
          _playerObb.cz = posZ;
          posModified = true;
          applyWallSlideVelocity(newVx, newVz, hit.nx, hit.nz, _velSlideOut);
          newVx = _velSlideOut.vx;
          newVz = _velSlideOut.vz;
        }
      }

      // High-speed continuous corridor guard against track barrier seams
      const nearIdx = findNearestTrackSample(
        activeTrack,
        posX,
        posZ,
        lapProgressRef.current.sampleIdx,
      );
      const trackSample = activeTrack.samples[nearIdx];
      const lateralOffset =
        (posX - trackSample.pos.x) * trackSample.right.x +
        (posZ - trackSample.pos.z) * trackSample.right.z;
      const corridorLimit = activeTrack.roadWidth * 0.5 + 0.675 - 0.98;
      if (Math.abs(lateralOffset) > corridorLimit + 0.35) {
        const sideSign = lateralOffset >= 0 ? 1 : -1;
        const nx = -trackSample.right.x * sideSign;
        const nz = -trackSample.right.z * sideSign;
        const excess = Math.abs(lateralOffset) - corridorLimit;
        posX += nx * excess;
        posZ += nz * excess;
        _playerObb.cx = posX;
        _playerObb.cz = posZ;
        posModified = true;
        applyWallSlideVelocity(newVx, newVz, nx, nz, _velSlideOut);
        newVx = _velSlideOut.vx;
        newVz = _velSlideOut.vz;
      }
    } else if (view === 'FREE_ROAM') {
      const obstacles = getFreeRoamObstacleObbs();
      for (let i = 0; i < obstacles.length; i++) {
        const hit = testObbOverlap(_playerObb, obstacles[i]);
        if (hit.hit) {
          const push = hit.depth + 0.008;
          posX += hit.nx * push;
          posZ += hit.nz * push;
          _playerObb.cx = posX;
          _playerObb.cz = posZ;
          posModified = true;
          applyWallSlideVelocity(newVx, newVz, hit.nx, hit.nz, _velSlideOut);
          newVx = _velSlideOut.vx;
          newVz = _velSlideOut.vz;
        }
      }
    }

    if (posModified) {
      rb.setTranslation({ x: posX, y: rawPos.y, z: posZ }, true);
      forwardSpeed = newVx * _forward.x + newVz * _forward.z;
      lateralSpeed = newVx * _right.x + newVz * _right.z;
    }

    rb.setLinvel({ x: newVx, y: linVel.y, z: newVz }, true);

    // 6. Spin all 4 wheels & apply realistic suspension roll/pitch
    wheelSpinAngleRef.current -= (forwardSpeed * dt) / WHEEL_RADIUS;
    for (let i = 0; i < 4; i++) {
      const w = wheelSpinRefs.current[i];
      if (w) w.rotation.x = wheelSpinAngleRef.current;
    }

    const targetRoll = THREE.MathUtils.clamp(
      -steerInput * speedSteerFactor * 0.045 - lateralSpeed * 0.008,
      -0.07,
      0.07,
    );
    bodyRollRef.current = THREE.MathUtils.damp(bodyRollRef.current, targetRoll, 10, dt);
    bodyPitchRef.current = THREE.MathUtils.damp(bodyPitchRef.current, targetPitch, 10, dt);

    if (chassisVisualRef.current) {
      chassisVisualRef.current.rotation.z = bodyRollRef.current;
      chassisVisualRef.current.rotation.x = bodyPitchRef.current;
    }

    // 7. Update Live Telemetry (zero React re-renders)
    const totalHorizSpeed = Math.hypot(newVx, newVz);
    const speedKph = Math.round(totalHorizSpeed * 3.6);

    let gear = 'N';
    let rpmRatio = 0.14;
    if (forwardSpeed < -0.5) {
      gear = 'R';
      currentGearRef.current = 0;
      rpmRatio = THREE.MathUtils.clamp(Math.abs(forwardSpeed) / maxReverseSpeed, 0.2, 0.94);
    } else if (speedKph < 2 && !keys.forward) {
      gear = 'N';
      currentGearRef.current = 0;
      rpmRatio = 0.14;
    } else {
      let g = currentGearRef.current;
      if (g < 1) g = 1;
      const speedFrac = THREE.MathUtils.clamp(Math.max(0, forwardSpeed) / maxForwardSpeed, 0, 1.02);

      // Upshift near redline, downshift with 16% hysteresis to avoid hunting
      while (g < 6 && speedFrac >= GEAR_MAX_SPEED_FRACS[g - 1]) {
        g += 1;
      }
      while (g > 1 && speedFrac < GEAR_MAX_SPEED_FRACS[g - 2] * 0.84) {
        g -= 1;
      }

      if (g !== currentGearRef.current) {
        if (currentGearRef.current >= 1) {
          engineAudio.triggerGearShift(g > currentGearRef.current ? 'up' : 'down');
        }
        currentGearRef.current = g;
      }

      gear = String(g);
      rpmRatio = THREE.MathUtils.clamp(
        (speedFrac / GEAR_MAX_SPEED_FRACS[g - 1]) * 0.82 + 0.14,
        0.16,
        0.98,
      );
    }

    const isAccelerating = Boolean(keys.forward) || (Boolean(keys.backward) && forwardSpeed <= 0.8);
    const isDeceleratingCoasting =
      !isAccelerating && !isTryingToBrake && absSpeed > 0.8 && Math.abs(forwardSpeed) < Math.abs(prevForwardSpeed);

    engineAudio.update({
      active: isInteractive && !(view === 'RACE' && raceState === 'finished'),
      speedKph,
      speedRatio: THREE.MathUtils.clamp(totalHorizSpeed / maxForwardSpeed, 0, 1),
      rpmRatio,
      isAccelerating,
      isDeceleratingCoasting,
      isBraking: isTryingToBrake,
      isHandbrake: Boolean(keys.brake),
    });

    carTelemetry.x = posX;
    carTelemetry.y = rawPos.y;
    carTelemetry.z = posZ;
    carTelemetry.fx = _forward.x;
    carTelemetry.fz = _forward.z;
    carTelemetry.headingRad = Math.atan2(_forward.x, -_forward.z);
    carTelemetry.speedKph = speedKph;
    carTelemetry.forwardSpeed = forwardSpeed;
    carTelemetry.isBraking = isTryingToBrake;
    carTelemetry.isDrifting = Boolean(keys.brake) && Math.abs(lateralSpeed) > 2.2;
    carTelemetry.gear = gear;
    carTelemetry.rpmRatio = rpmRatio;
    carTelemetry.zeroToSixtySplitSec = launch.lastSplit;

    // 8. Smooth, Frame-Rate Independent, Gimbal-Lock-Free Chase Camera
    // Updated LAST after car position and steering velocity are computed.
    const latestRot = rb.rotation();
    _quat.set(latestRot.x, latestRot.y, latestRot.z, latestRot.w);
    _forward.set(0, 0, -1).applyQuaternion(_quat);
    _forward.y = 0;
    if (_forward.lengthSq() > 1e-6) _forward.normalize();

    // Extract planar heading directly in [-PI, PI] to avoid Euler gimbal lock
    const carYaw = Math.atan2(-_forward.x, -_forward.z);
    _targetPos.set(posX, rawPos.y, posZ);

    if (!camInitializedRef.current) {
      camYawRef.current = carYaw;
      camTargetPosRef.current.copy(_targetPos);
      _camQuat.setFromAxisAngle(_spawnYAxis, carYaw);

      _camOffset.set(0, 2.75, 6.7).applyQuaternion(_camQuat);
      state.camera.position.copy(_targetPos).add(_camOffset);

      _lookOffset.set(0, 0.95, -5.5).applyQuaternion(_camQuat);
      camLookAtRef.current.copy(_targetPos).add(_lookOffset);
      state.camera.lookAt(camLookAtRef.current);
      camInitializedRef.current = true;
    } else {
      // Shortest-angle wrapping prevents violent 180 <-> -180 degree camera snaps
      let yawDelta = carYaw - camYawRef.current;
      while (yawDelta > Math.PI) yawDelta -= Math.PI * 2;
      while (yawDelta < -Math.PI) yawDelta += Math.PI * 2;

      const yawAlpha = 1 - Math.exp(-8.5 * dt);
      camYawRef.current += yawDelta * yawAlpha;
      while (camYawRef.current > Math.PI) camYawRef.current -= Math.PI * 2;
      while (camYawRef.current < -Math.PI) camYawRef.current += Math.PI * 2;

      // Pure Y-axis camera orientation keeps horizon steady over curb/barrier bumps
      _camQuat.setFromAxisAngle(_spawnYAxis, camYawRef.current);

      // Smooth anchor eliminates Rapier fixed-timestep sub-frame quantization jitter
      const targetAlpha = 1 - Math.exp(-22 * dt);
      camTargetPosRef.current.lerp(_targetPos, targetAlpha);

      _camOffset.set(0, 2.75, 6.7).applyQuaternion(_camQuat);
      _desiredCamPos.copy(camTargetPosRef.current).add(_camOffset);
      const posAlpha = 1 - Math.exp(-12 * dt);
      state.camera.position.lerp(_desiredCamPos, posAlpha);

      // Smooth BOTH camera position AND lookAt target so turns never shake
      _lookOffset.set(0, 0.95, -5.5).applyQuaternion(_camQuat);
      _lookAtPos.copy(camTargetPosRef.current).add(_lookOffset);
      const lookAlpha = 1 - Math.exp(-16 * dt);
      camLookAtRef.current.lerp(_lookAtPos, lookAlpha);
      state.camera.lookAt(camLookAtRef.current);
    }

    // 9. Closed-circuit lap tracking, live placement vs AI bots, & race finish trigger
    if (view === 'RACE' && raceState === 'racing') {
      const lp = lapProgressRef.current;
      const n = activeTrack.samples.length;
      const nextIdx = findNearestTrackSample(activeTrack, posX, posZ, lp.sampleIdx);
      const idxDelta = nextIdx - lp.sampleIdx;

      if (idxDelta < -n / 2) {
        lp.lap += 1;
      } else if (idxDelta > n / 2) {
        lp.lap -= 1;
      }
      lp.sampleIdx = nextIdx;

      const playerProgressMeters = Math.max(
        0,
        lp.lap * activeTrack.totalLength + activeTrack.samples[nextIdx].s,
      );

      let placement = 1;
      if (raceTelemetry.bots[0].progressMeters > playerProgressMeters) placement += 1;
      if (!activeTrack.isBoss && raceTelemetry.bots[1].progressMeters > playerProgressMeters) {
        placement += 1;
      }

      raceTelemetry.playerLap = THREE.MathUtils.clamp(lp.lap + 1, 1, activeTrack.laps);
      raceTelemetry.playerProgressMeters = playerProgressMeters;
      raceTelemetry.placement = placement;

      if (lp.lap >= activeTrack.laps) {
        finishRace(placement);
      }
    }
  });

  return (
    <RigidBody
      ref={bodyRef}
      colliders={false}
      mass={120}
      position={[0, 0.08, 0]}
      type={isInteractive ? 'dynamic' : 'kinematicPosition'}
      enabledRotations={[false, true, false]}
      linearDamping={0}
      angularDamping={0}
      friction={0}
      restitution={0.1}
    >
      <CuboidCollider args={[0.98, 0.44, 2.22]} position={[0, 0.44, 0]} friction={0} />

      {/* Root Car Visuals (Tires touch Y = 0) */}
      <group>
        {/* Suspended Chassis & Aero Body Group */}
        <group ref={chassisVisualRef}>
          {/* Sculpted Central Monocoque */}
          <mesh geometry={geometries.centerBody} castShadow receiveShadow>
            <meshPhysicalMaterial
              color={carSettings.color}
              metalness={0.68}
              roughness={0.22}
              clearcoat={1.0}
              clearcoatRoughness={0.08}
            />
          </mesh>

          {/* Left & Right Sculpted Fender Sidepods */}
          <mesh
            geometry={geometries.sideFender}
            position={[-0.78, 0, 0]}
            castShadow
            receiveShadow
          >
            <meshPhysicalMaterial
              color={carSettings.color}
              metalness={0.68}
              roughness={0.22}
              clearcoat={1.0}
              clearcoatRoughness={0.08}
            />
          </mesh>
          <mesh
            geometry={geometries.sideFender}
            position={[0.78, 0, 0]}
            castShadow
            receiveShadow
          >
            <meshPhysicalMaterial
              color={carSettings.color}
              metalness={0.68}
              roughness={0.22}
              clearcoat={1.0}
              clearcoatRoughness={0.08}
            />
          </mesh>

          {/* Tinted Wrap-Around Cabin Glass Canopy */}
          <mesh geometry={geometries.cabinGlass} castShadow>
            <meshPhysicalMaterial
              color="#0b1322"
              metalness={0.15}
              roughness={0.06}
              clearcoat={1.0}
              clearcoatRoughness={0.04}
            />
          </mesh>

          {/* Painted Roof & Pillars */}
          <mesh geometry={geometries.roofCap} castShadow receiveShadow>
            <meshPhysicalMaterial
              color={carSettings.color}
              metalness={0.68}
              roughness={0.22}
              clearcoat={1.0}
              clearcoatRoughness={0.08}
            />
          </mesh>

          {/* Carbon Front Splitter */}
          <mesh position={[0, 0.19, -2.06]} castShadow receiveShadow>
            <boxGeometry args={[1.92, 0.05, 0.42]} />
            <meshStandardMaterial color="#18181b" roughness={0.65} metalness={0.2} />
          </mesh>
          {/* Splitter Aero Canards */}
          {[-0.95, 0.95].map((x, i) => (
            <mesh key={`canard-${i}`} position={[x, 0.25, -2.02]} castShadow>
              <boxGeometry args={[0.04, 0.12, 0.28]} />
              <meshStandardMaterial color="#18181b" roughness={0.6} metalness={0.25} />
            </mesh>
          ))}

          {/* Front Recessed Grille Intake */}
          <mesh position={[0, 0.31, -2.18]}>
            <boxGeometry args={[1.28, 0.16, 0.08]} />
            <meshStandardMaterial color="#09090b" roughness={0.9} metalness={0.1} />
          </mesh>

          {/* Hood Aero Vent / Mid Engine Louvers */}
          {currentModelId === 'supercar' ? (
            <group position={[0, 0.72, 0.95]}>
              {/* Mid-engine intake manifolds & carbon louvers */}
              <mesh position={[0, -0.05, 0]}>
                <boxGeometry args={[0.78, 0.08, 0.92]} />
                <meshStandardMaterial color="#111215" roughness={0.8} metalness={0.5} />
              </mesh>
              {[-0.22, 0.22].map((x, i) => (
                <mesh key={`manifold-${i}`} position={[x, 0.02, 0]}>
                  <boxGeometry args={[0.18, 0.08, 0.72]} />
                  <meshStandardMaterial color="#ef4444" roughness={0.3} metalness={0.7} />
                </mesh>
              ))}
            </group>
          ) : currentModelId === 'tuner' ? (
            <group position={[0, 0.64, -1.35]} rotation={[0.16, 0, 0]}>
              {/* Twin Aggressive Tuner Hood Vents */}
              {[-0.32, 0.32].map((x, i) => (
                <mesh key={`tuner-vent-${i}`} position={[x, 0, 0]}>
                  <boxGeometry args={[0.26, 0.04, 0.42]} />
                  <meshStandardMaterial color="#09090b" roughness={0.85} metalness={0.3} />
                </mesh>
              ))}
            </group>
          ) : (
            <mesh position={[0, 0.65, -1.35]} rotation={[0.16, 0, 0]}>
              <boxGeometry args={[0.54, 0.03, 0.36]} />
              <meshStandardMaterial color="#111114" roughness={0.75} metalness={0.2} />
            </mesh>
          )}

          {/* Carbon Side Skirts */}
          {[-0.91, 0.91].map((x, i) => (
            <mesh key={`skirt-${i}`} position={[x, 0.20, 0]} castShadow receiveShadow>
              <boxGeometry args={[0.12, 0.055, 1.88]} />
              <meshStandardMaterial color="#18181b" roughness={0.65} metalness={0.2} />
            </mesh>
          ))}

          {/* Side Air Intake Scoops Behind Doors */}
          {[-0.92, 0.92].map((x, i) => (
            <mesh key={`intake-${i}`} position={[x, 0.54, 0.68]} castShadow>
              <boxGeometry args={[0.06, 0.26, 0.42]} />
              <meshStandardMaterial color="#0d0d10" roughness={0.85} metalness={0.15} />
            </mesh>
          ))}

          {/* Flared Carbon Wheel Arch Lips (4x) */}
          {(
            [
              [-0.91, 0.35, -1.35],
              [0.91, 0.35, -1.35],
              [-0.92, 0.36, 1.35],
              [0.92, 0.36, 1.35],
            ] as [number, number, number][]
          ).map((pos, i) => (
            <mesh
              key={`arch-${i}`}
              geometry={geometries.archFlare}
              position={pos}
              castShadow
            >
              <meshStandardMaterial color="#18181b" roughness={0.6} metalness={0.25} />
            </mesh>
          ))}

          {/* Aerodynamic Side Mirrors */}
          {[-1, 1].map((dir, i) => (
            <group key={`mirror-${i}`} position={[dir * 0.78, 0.83, -0.58]}>
              <mesh position={[dir * 0.07, -0.02, 0]} rotation={[0, 0, dir * -0.45]}>
                <boxGeometry args={[0.14, 0.03, 0.06]} />
                <meshStandardMaterial color="#18181b" roughness={0.6} metalness={0.25} />
              </mesh>
              <mesh position={[dir * 0.14, 0.01, 0.02]} castShadow>
                <boxGeometry args={[0.16, 0.08, 0.11]} />
                <meshPhysicalMaterial
                  color={carSettings.color}
                  metalness={0.68}
                  roughness={0.22}
                  clearcoat={1.0}
                />
              </mesh>
            </group>
          ))}

          {/* Rear Finned Carbon Diffuser */}
          <mesh position={[0, 0.25, 2.13]} castShadow receiveShadow>
            <boxGeometry args={[1.64, 0.16, 0.18]} />
            <meshStandardMaterial color="#141418" roughness={0.75} metalness={0.2} />
          </mesh>
          {[-0.55, -0.25, 0, 0.25, 0.55].map((x, i) => (
            <mesh key={`fin-${i}`} position={[x, 0.22, 2.20]}>
              <boxGeometry args={[0.03, 0.14, 0.12]} />
              <meshStandardMaterial color="#27272a" roughness={0.5} metalness={0.4} />
            </mesh>
          ))}

          {/* Exhaust Tips */}
          {currentModelId === 'tuner' ? (
            // Tuner dual angled big-bore titanium cannons
            <group position={[0, 0.24, 2.18]}>
              {[-0.62, 0.62].map((x, i) => (
                <group
                  key={`tuner-ex-${i}`}
                  position={[x, 0, 0]}
                  rotation={[Math.PI / 2, 0, (x < 0 ? 1 : -1) * 0.12]}
                >
                  <mesh castShadow>
                    <cylinderGeometry args={[0.065, 0.065, 0.20, 20]} />
                    <meshStandardMaterial color="#38bdf8" metalness={0.92} roughness={0.15} />
                  </mesh>
                  <mesh position={[0, 0.095, 0]}>
                    <cylinderGeometry args={[0.052, 0.052, 0.02, 20]} />
                    <meshStandardMaterial color="#050508" roughness={0.95} />
                  </mesh>
                </group>
              ))}
            </group>
          ) : currentModelId === 'supercar' ? (
            // Supercar central quad cluster
            <group position={[0, 0.36, 2.22]} rotation={[Math.PI / 2, 0, 0]}>
              {[-0.15, -0.05, 0.05, 0.15].map((x, i) => (
                <group key={`super-ex-${i}`} position={[x, 0, 0]}>
                  <mesh castShadow>
                    <cylinderGeometry args={[0.042, 0.042, 0.16, 18]} />
                    <meshStandardMaterial color="#d4d4d8" metalness={0.96} roughness={0.12} />
                  </mesh>
                  <mesh position={[0, 0.075, 0]}>
                    <cylinderGeometry args={[0.032, 0.032, 0.02, 18]} />
                    <meshStandardMaterial color="#09090b" roughness={0.95} />
                  </mesh>
                </group>
              ))}
            </group>
          ) : (
            [-0.58, -0.44, 0.44, 0.58].map((x, i) => (
              <group key={`exhaust-${i}`} position={[x, 0.24, 2.20]} rotation={[Math.PI / 2, 0, 0]}>
                <mesh castShadow>
                  <cylinderGeometry args={[0.048, 0.048, 0.14, 16]} />
                  <meshStandardMaterial color="#d4d4d8" metalness={0.95} roughness={0.14} />
                </mesh>
                <mesh position={[0, 0.065, 0]}>
                  <cylinderGeometry args={[0.036, 0.036, 0.02, 16]} />
                  <meshStandardMaterial color="#09090b" roughness={0.95} />
                </mesh>
              </group>
            ))
          )}

          {/* GT Rear Wing / Spoiler */}
          <group position={[0, 0.85, 1.92]}>
            {/* Dual Upright Struts */}
            {[-0.48, 0.48].map((x, i) => (
              <mesh key={`strut-${i}`} position={[x, 0.13, 0]} rotation={[0.18, 0, 0]} castShadow>
                <boxGeometry args={[0.045, 0.28, 0.16]} />
                <meshStandardMaterial color="#18181b" roughness={0.5} metalness={0.4} />
              </mesh>
            ))}
            {/* Wing Airfoil Blade */}
            <mesh geometry={geometries.rearWingBlade} position={[0, 0.26, 0.03]} castShadow>
              <meshPhysicalMaterial
                color="#18181b"
                metalness={0.45}
                roughness={0.32}
                clearcoat={0.7}
              />
            </mesh>
            {/* Wing Endplates */}
            {[-0.94, 0.94].map((x, i) => (
              <mesh key={`endplate-${i}`} position={[x, 0.26, 0.03]} castShadow>
                <boxGeometry args={[0.03, 0.17, 0.44]} />
                <meshPhysicalMaterial
                  color={carSettings.color}
                  metalness={0.68}
                  roughness={0.22}
                  clearcoat={1.0}
                />
              </mesh>
            ))}
          </group>

          {/* LED Headlights (Front Corners) */}
          {[-0.66, 0.66].map((x, i) => (
            <group key={`headlight-${i}`} position={[x, 0.50, -2.11]}>
              <mesh rotation={[-0.22, x < 0 ? 0.14 : -0.14, 0]}>
                <boxGeometry args={[0.36, 0.08, 0.10]} />
                <meshStandardMaterial
                  color="#e0f2fe"
                  emissive="#bae6fd"
                  emissiveIntensity={2.6}
                  roughness={0.1}
                />
              </mesh>
            </group>
          ))}

          {/* Full-Width LED Taillight Bar + Outer Brake Blades */}
          <mesh position={[0, 0.66, 2.18]}>
            <boxGeometry args={[1.66, 0.045, 0.04]} />
            <meshStandardMaterial
              ref={tailBarMatRef}
              color="#ff1e1e"
              emissive="#ff1a1a"
              emissiveIntensity={1.8}
              roughness={0.15}
            />
          </mesh>
          {[-0.72, 0.72].map((x, i) => (
            <mesh key={`tail-${i}`} position={[x, 0.63, 2.18]}>
              <boxGeometry args={[0.32, 0.09, 0.05]} />
              <meshStandardMaterial
                ref={i === 0 ? tailLeftMatRef : tailRightMatRef}
                color="#ef4444"
                emissive="#ff1111"
                emissiveIntensity={2.07}
                roughness={0.15}
              />
            </mesh>
          ))}

          {/* Livery / Vinyls (with polygonOffset to eliminate Z-fighting) */}
          {carSettings.vinyl === 'stripes' && (
            <group>
              {[-0.17, 0.17].map((x, i) => (
                <group key={`stripe-${i}`}>
                  {/* Hood stripe */}
                  <mesh position={[x, 0.69, -1.46]} rotation={[0.14, 0, 0]}>
                    <boxGeometry args={[0.18, 0.015, 1.24]} />
                    <meshStandardMaterial
                      color="#f8fafc"
                      roughness={0.35}
                      polygonOffset
                      polygonOffsetFactor={-1}
                    />
                  </mesh>
                  {/* Roof stripe */}
                  <mesh position={[x, 1.21, -0.18]}>
                    <boxGeometry args={[0.18, 0.015, 0.78]} />
                    <meshStandardMaterial
                      color="#f8fafc"
                      roughness={0.35}
                      polygonOffset
                      polygonOffsetFactor={-1}
                    />
                  </mesh>
                  {/* Rear deck stripe */}
                  <mesh position={[x, 0.86, 1.56]}>
                    <boxGeometry args={[0.18, 0.015, 0.95]} />
                    <meshStandardMaterial
                      color="#f8fafc"
                      roughness={0.35}
                      polygonOffset
                      polygonOffsetFactor={-1}
                    />
                  </mesh>
                </group>
              ))}
            </group>
          )}

          {carSettings.vinyl === 'flames' && (
            <group>
              {/* Hood Flame Decal (shooting back along hood towards windshield) */}
              <mesh
                position={[0, 0.69, -1.45]}
                rotation={[-Math.PI / 2 + 0.14, 0, Math.PI / 2]}
              >
                <planeGeometry args={[1.25, 1.35]} />
                <meshStandardMaterial
                  map={flameTexture}
                  transparent
                  opacity={0.96}
                  roughness={0.25}
                  metalness={0.1}
                  polygonOffset
                  polygonOffsetFactor={-2}
                  polygonOffsetUnits={-2}
                />
              </mesh>

              {/* Left Door / Haunch Flame Decal */}
              <mesh
                position={[-0.935, 0.53, 0.0]}
                rotation={[0, -Math.PI / 2, 0]}
              >
                <planeGeometry args={[2.1, 0.44]} />
                <meshStandardMaterial
                  map={flameTexture}
                  transparent
                  opacity={0.96}
                  roughness={0.25}
                  metalness={0.1}
                  polygonOffset
                  polygonOffsetFactor={-2}
                  polygonOffsetUnits={-2}
                />
              </mesh>

              {/* Right Door / Haunch Flame Decal */}
              <mesh
                position={[0.935, 0.53, 0.0]}
                rotation={[0, Math.PI / 2, 0]}
                scale={[-1, 1, 1]}
              >
                <planeGeometry args={[2.1, 0.44]} />
                <meshStandardMaterial
                  map={flameTexture}
                  transparent
                  opacity={0.96}
                  roughness={0.25}
                  metalness={0.1}
                  polygonOffset
                  polygonOffsetFactor={-2}
                  polygonOffsetUnits={-2}
                />
              </mesh>
            </group>
          )}
        </group>

        {/* 4x Detailed Multi-Part Wheels (Front wheels steer; all 4 spin) */}
        <WheelAssembly
          position={[-0.86, 0.355, -1.35]}
          isLeft={true}
          isRear={false}
          tireGeo={geometries.tire}
          rimLipGeo={geometries.rimLip}
          wheelColor={carSettings.wheelsColor}
          steerRef={frontLeftSteerRef}
          spinRef={(el) => {
            wheelSpinRefs.current[0] = el;
          }}
        />
        <WheelAssembly
          position={[0.86, 0.355, -1.35]}
          isLeft={false}
          isRear={false}
          tireGeo={geometries.tire}
          rimLipGeo={geometries.rimLip}
          wheelColor={carSettings.wheelsColor}
          steerRef={frontRightSteerRef}
          spinRef={(el) => {
            wheelSpinRefs.current[1] = el;
          }}
        />
        <WheelAssembly
          position={[-0.88, 0.37, 1.35]}
          isLeft={true}
          isRear={true}
          tireGeo={geometries.tire}
          rimLipGeo={geometries.rimLip}
          wheelColor={carSettings.wheelsColor}
          spinRef={(el) => {
            wheelSpinRefs.current[2] = el;
          }}
        />
        <WheelAssembly
          position={[0.88, 0.37, 1.35]}
          isLeft={false}
          isRear={true}
          tireGeo={geometries.tire}
          rimLipGeo={geometries.rimLip}
          wheelColor={carSettings.wheelsColor}
          spinRef={(el) => {
            wheelSpinRefs.current[3] = el;
          }}
        />
      </group>
    </RigidBody>
  );
}
