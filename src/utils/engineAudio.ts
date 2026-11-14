export interface EngineAudioUpdate {
  active: boolean;
  speedKph: number;
  speedRatio: number; // 0..1 of current tier max forward speed
  rpmRatio: number; // 0.12..1.0
  isAccelerating: boolean;
  isDeceleratingCoasting: boolean;
  isBraking: boolean;
  isHandbrake: boolean;
}

function createSoftClipCurve(amount = 1.6): Float32Array<ArrayBuffer> {
  const samples = 1024;
  const buffer = new ArrayBuffer(samples * 4);
  const curve = new Float32Array(buffer);
  for (let i = 0; i < samples; i++) {
    const x = (i * 2) / samples - 1;
    curve[i] = Math.tanh(x * amount) / Math.tanh(amount);
  }
  return curve;
}

function createNoiseBuffer(ctx: AudioContext, seconds = 2): AudioBuffer {
  const sampleRate = ctx.sampleRate;
  const length = Math.floor(sampleRate * seconds);
  const buffer = ctx.createBuffer(1, length, sampleRate);
  const data = buffer.getChannelData(0);
  // Subtle pink-ish noise filter for warmer tire/pad texture
  let b0 = 0;
  let b1 = 0;
  let b2 = 0;
  for (let i = 0; i < length; i++) {
    const white = Math.random() * 2 - 1;
    b0 = 0.99765 * b0 + white * 0.099046;
    b1 = 0.963 * b1 + white * 0.2965164;
    b2 = 0.57 * b2 + white * 1.0526913;
    data[i] = (b0 + b1 + b2 + white * 0.1848) * 0.22;
  }
  return buffer;
}

class EngineAudioController {
  private ctx: AudioContext | null = null;
  private initialized = false;
  private muted = false;
  private masterVolume = 0.75;

  private masterGain: GainNode | null = null;

  // Layer 1: Engine / Acceleration synthesis
  private engineSubOsc: OscillatorNode | null = null;
  private engineMainOsc: OscillatorNode | null = null;
  private engineHarmOsc: OscillatorNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;
  private shiftCutGain: GainNode | null = null;
  private engineGain: GainNode | null = null;

  // Layer 2: Coasting deceleration (transmission whine + exhaust overrun burble)
  private decelWhineOsc: OscillatorNode | null = null;
  private decelWhineFilter: BiquadFilterNode | null = null;
  private decelOverrunFilter: BiquadFilterNode | null = null;
  private decelOverrunModGain: GainNode | null = null;
  private decelGain: GainNode | null = null;

  // Layer 3: Dedicated Brake friction & squeal
  private brakePadFilter: BiquadFilterNode | null = null;
  private brakeSquealFilter: BiquadFilterNode | null = null;
  private brakeGain: GainNode | null = null;
  private brakeSquealGain: GainNode | null = null;

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;

    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
    }

    if (!this.initialized && this.ctx) {
      this.buildGraph(this.ctx);
      this.initialized = true;
    }

    return this.ctx;
  }

  private buildGraph(ctx: AudioContext) {
    const now = ctx.currentTime;

    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -14;
    compressor.knee.value = 18;
    compressor.ratio.value = 4;
    compressor.attack.value = 0.005;
    compressor.release.value = 0.12;

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(this.muted ? 0 : this.masterVolume, now);
    compressor.connect(masterGain);
    masterGain.connect(ctx.destination);
    this.masterGain = masterGain;

    // --- Layer 1: Continuous Engine / Acceleration Synth ---
    const engineSubOsc = ctx.createOscillator();
    engineSubOsc.type = 'triangle';
    engineSubOsc.frequency.setValueAtTime(28, now);

    const engineMainOsc = ctx.createOscillator();
    engineMainOsc.type = 'sawtooth';
    engineMainOsc.frequency.setValueAtTime(56, now);

    const engineHarmOsc = ctx.createOscillator();
    engineHarmOsc.type = 'sawtooth';
    engineHarmOsc.frequency.setValueAtTime(84, now);

    const subGain = ctx.createGain();
    subGain.gain.value = 0.55;
    const mainGain = ctx.createGain();
    mainGain.gain.value = 0.42;
    const harmGain = ctx.createGain();
    harmGain.gain.value = 0.24;

    const shaper = ctx.createWaveShaper();
    shaper.curve = createSoftClipCurve(1.65);
    shaper.oversample = '2x';

    const engineFilter = ctx.createBiquadFilter();
    engineFilter.type = 'lowpass';
    engineFilter.frequency.setValueAtTime(260, now);
    engineFilter.Q.setValueAtTime(2.6, now);

    const shiftCutGain = ctx.createGain();
    shiftCutGain.gain.setValueAtTime(1.0, now);

    const engineGain = ctx.createGain();
    engineGain.gain.setValueAtTime(0, now);

    engineSubOsc.connect(subGain);
    engineMainOsc.connect(mainGain);
    engineHarmOsc.connect(harmGain);

    subGain.connect(shaper);
    mainGain.connect(shaper);
    harmGain.connect(shaper);

    shaper.connect(engineFilter);
    engineFilter.connect(shiftCutGain);
    shiftCutGain.connect(engineGain);
    engineGain.connect(compressor);

    engineSubOsc.start(now);
    engineMainOsc.start(now);
    engineHarmOsc.start(now);

    this.engineSubOsc = engineSubOsc;
    this.engineMainOsc = engineMainOsc;
    this.engineHarmOsc = engineHarmOsc;
    this.engineFilter = engineFilter;
    this.shiftCutGain = shiftCutGain;
    this.engineGain = engineGain;

    // Shared noise buffer for overrun burble & brake friction
    const noiseBuffer = createNoiseBuffer(ctx, 2);

    // --- Layer 2: Distinct Coasting Deceleration Sound ---
    const decelWhineOsc = ctx.createOscillator();
    decelWhineOsc.type = 'triangle';
    decelWhineOsc.frequency.setValueAtTime(260, now);

    const decelWhineFilter = ctx.createBiquadFilter();
    decelWhineFilter.type = 'bandpass';
    decelWhineFilter.frequency.setValueAtTime(480, now);
    decelWhineFilter.Q.setValueAtTime(2.4, now);

    const decelWhineGain = ctx.createGain();
    decelWhineGain.gain.value = 0.45;

    const decelNoise = ctx.createBufferSource();
    decelNoise.buffer = noiseBuffer;
    decelNoise.loop = true;

    const decelOverrunFilter = ctx.createBiquadFilter();
    decelOverrunFilter.type = 'lowpass';
    decelOverrunFilter.frequency.setValueAtTime(280, now);
    decelOverrunFilter.Q.setValueAtTime(3.8, now);

    const decelOverrunModGain = ctx.createGain();
    decelOverrunModGain.gain.setValueAtTime(0.65, now);

    const decelPulseLfo = ctx.createOscillator();
    decelPulseLfo.type = 'sine';
    decelPulseLfo.frequency.setValueAtTime(16, now);
    const decelLfoDepth = ctx.createGain();
    decelLfoDepth.gain.value = 0.35;
    decelPulseLfo.connect(decelLfoDepth);
    decelLfoDepth.connect(decelOverrunModGain.gain);

    const decelGain = ctx.createGain();
    decelGain.gain.setValueAtTime(0, now);

    decelWhineOsc.connect(decelWhineFilter);
    decelWhineFilter.connect(decelWhineGain);
    decelWhineGain.connect(decelGain);

    decelNoise.connect(decelOverrunFilter);
    decelOverrunFilter.connect(decelOverrunModGain);
    decelOverrunModGain.connect(decelGain);

    decelGain.connect(compressor);

    decelWhineOsc.start(now);
    decelNoise.start(now);
    decelPulseLfo.start(now);

    this.decelWhineOsc = decelWhineOsc;
    this.decelWhineFilter = decelWhineFilter;
    this.decelOverrunFilter = decelOverrunFilter;
    this.decelOverrunModGain = decelOverrunModGain;
    this.decelGain = decelGain;

    // --- Layer 3: Dedicated Brake Friction & Squeal ---
    const brakeNoise = ctx.createBufferSource();
    brakeNoise.buffer = noiseBuffer;
    brakeNoise.loop = true;

    const brakePadFilter = ctx.createBiquadFilter();
    brakePadFilter.type = 'bandpass';
    brakePadFilter.frequency.setValueAtTime(1100, now);
    brakePadFilter.Q.setValueAtTime(1.6, now);

    const brakeGain = ctx.createGain();
    brakeGain.gain.setValueAtTime(0, now);

    const brakeSquealFilter = ctx.createBiquadFilter();
    brakeSquealFilter.type = 'bandpass';
    brakeSquealFilter.frequency.setValueAtTime(2150, now);
    brakeSquealFilter.Q.setValueAtTime(12.0, now);

    const brakeSquealGain = ctx.createGain();
    brakeSquealGain.gain.setValueAtTime(0, now);

    brakeNoise.connect(brakePadFilter);
    brakePadFilter.connect(brakeGain);
    brakeGain.connect(compressor);

    brakeNoise.connect(brakeSquealFilter);
    brakeSquealFilter.connect(brakeSquealGain);
    brakeSquealGain.connect(compressor);

    brakeNoise.start(now);

    this.brakePadFilter = brakePadFilter;
    this.brakeSquealFilter = brakeSquealFilter;
    this.brakeGain = brakeGain;
    this.brakeSquealGain = brakeSquealGain;
  }

  public unlock() {
    const ctx = this.ensureContext();
    if (ctx && ctx.state === 'suspended') {
      void ctx.resume();
    }
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public getMasterVolume(): number {
    return this.masterVolume;
  }

  public setMasterVolume(vol: number) {
    this.masterVolume = Math.max(0, Math.min(1, vol));
    if (this.ctx && this.masterGain && !this.muted) {
      this.masterGain.gain.setTargetAtTime(this.masterVolume, this.ctx.currentTime, 0.03);
    }
  }

  public setMuted(muted: boolean) {
    this.muted = muted;
    if (this.ctx && this.masterGain) {
      this.masterGain.gain.setTargetAtTime(
        muted ? 0 : this.masterVolume,
        this.ctx.currentTime,
        0.03,
      );
    }
  }

  public toggleMute(): boolean {
    this.setMuted(!this.muted);
    return this.muted;
  }

  public playUiHover() {
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx || ctx.state !== 'running' || !this.masterGain) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(620, now);
    osc.frequency.exponentialRampToValueAtTime(340, now + 0.025);
    gain.gain.setValueAtTime(0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.028);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.03);
  }

  public playUiClick() {
    this.unlock();
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;
    if (ctx.state === 'suspended') {
      void ctx.resume();
    }
    if (ctx.state !== 'running') return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(920, now);
    osc.frequency.exponentialRampToValueAtTime(220, now + 0.042);
    gain.gain.setValueAtTime(0.11, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.046);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.05);
  }

  public playCountdownTone(step: 3 | 2 | 1 | 0) {
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;
    if (ctx.state === 'suspended') {
      void ctx.resume();
    }
    if (ctx.state !== 'running') return;

    const now = ctx.currentTime;
    if (step === 0) {
      // High-pitch dual-harmonic GO! launch tone
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();
      osc1.type = 'sawtooth';
      osc2.type = 'triangle';
      osc1.frequency.setValueAtTime(880, now);
      osc2.frequency.setValueAtTime(1320, now);

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(2800, now);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.24, now + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.36);

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.38);
      osc2.stop(now + 0.38);
    } else {
      // Crisp low start-light tone for 3, 2, 1
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, now);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.22, now + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.18);
    }
  }

  public triggerGearShift(direction: 'up' | 'down') {
    if (!this.ctx || !this.initialized || this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;

    if (direction === 'up') {
      // Quick torque-cut dip on upshift followed by crisp engagement
      if (this.shiftCutGain) {
        this.shiftCutGain.gain.cancelScheduledValues(now);
        this.shiftCutGain.gain.setValueAtTime(this.shiftCutGain.gain.value, now);
        this.shiftCutGain.gain.linearRampToValueAtTime(0.32, now + 0.022);
        this.shiftCutGain.gain.linearRampToValueAtTime(1.0, now + 0.085);
      }
      // Subtle exhaust pop thump
      if (this.masterGain) {
        const thumpOsc = this.ctx.createOscillator();
        const thumpGain = this.ctx.createGain();
        thumpOsc.type = 'triangle';
        thumpOsc.frequency.setValueAtTime(105, now);
        thumpOsc.frequency.exponentialRampToValueAtTime(42, now + 0.075);
        thumpGain.gain.setValueAtTime(0.14, now);
        thumpGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        thumpOsc.connect(thumpGain);
        thumpGain.connect(this.masterGain);
        thumpOsc.start(now);
        thumpOsc.stop(now + 0.09);
      }
    } else {
      // Crisp rev-match throttle blip on downshift
      if (this.shiftCutGain) {
        this.shiftCutGain.gain.cancelScheduledValues(now);
        this.shiftCutGain.gain.setValueAtTime(1.0, now);
        this.shiftCutGain.gain.linearRampToValueAtTime(1.32, now + 0.03);
        this.shiftCutGain.gain.linearRampToValueAtTime(1.0, now + 0.11);
      }
      if (this.engineFilter) {
        const cur = this.engineFilter.frequency.value;
        this.engineFilter.frequency.cancelScheduledValues(now);
        this.engineFilter.frequency.setValueAtTime(cur, now);
        this.engineFilter.frequency.linearRampToValueAtTime(Math.min(2800, cur + 520), now + 0.035);
      }
    }
  }

  public update(state: EngineAudioUpdate) {
    if (!state.active) {
      this.stopAll();
      return;
    }

    const ctx = this.ctx;
    if (!ctx || !this.initialized) return;

    // Keep context unlocked if user is driving
    if (ctx.state === 'suspended' && (state.isAccelerating || state.isBraking)) {
      void ctx.resume();
    }
    if (ctx.state !== 'running') return;

    const now = ctx.currentTime;
    const rpm = Math.max(0.12, Math.min(1.0, state.rpmRatio));
    const speedRatio = Math.max(0, Math.min(1.0, state.speedRatio));

    // 1. Engine frequency modulated smoothly by both RPM (gear ratio synced) & vehicle speed
    const f0 = 42 + Math.pow(rpm, 1.12) * 142 + speedRatio * 20;
    this.engineSubOsc?.frequency.setTargetAtTime(f0 * 0.5, now, 0.03);
    this.engineMainOsc?.frequency.setTargetAtTime(f0, now, 0.03);
    this.engineHarmOsc?.frequency.setTargetAtTime(f0 * 1.503, now, 0.03);

    // Filter brightness opens cleanly with throttle & RPM
    const filterCutoff = state.isAccelerating
      ? 360 + rpm * 1850 + speedRatio * 300
      : 220 + rpm * 650;
    this.engineFilter?.frequency.setTargetAtTime(filterCutoff, now, 0.045);

    // Continuous engine loop gain: loud & punchy when accelerating, low purr when coasting/idle
    let targetEngineGain = 0.045; // idle purr
    if (state.isAccelerating) {
      targetEngineGain = 0.25 + rpm * 0.23;
    } else if (state.isBraking) {
      targetEngineGain = 0.035 + rpm * 0.04;
    } else if (state.isDeceleratingCoasting) {
      targetEngineGain = 0.06 + rpm * 0.06;
    } else if (state.speedKph > 2) {
      targetEngineGain = 0.09 + rpm * 0.08;
    }
    this.engineGain?.gain.setTargetAtTime(targetEngineGain, now, 0.04);

    // 2. Distinct Coasting Deceleration Layer (when losing speed without braking)
    if (state.isDeceleratingCoasting && state.speedKph > 3) {
      const decelStrength = Math.min(1, 0.25 + speedRatio * 0.85);
      const whineFreq = 210 + speedRatio * 460 + rpm * 140;
      this.decelWhineOsc?.frequency.setTargetAtTime(whineFreq, now, 0.05);
      this.decelWhineFilter?.frequency.setTargetAtTime(whineFreq * 1.15, now, 0.05);
      this.decelOverrunFilter?.frequency.setTargetAtTime(220 + rpm * 340, now, 0.05);
      this.decelGain?.gain.setTargetAtTime(0.24 * decelStrength, now, 0.06);
    } else {
      this.decelGain?.gain.setTargetAtTime(0, now, 0.06);
    }

    // 3. Dedicated Brake Pad Friction & Squeal Layer (when brakes are actively applied)
    if (state.isBraking && state.speedKph > 2) {
      const brakeIntensity = Math.min(1, 0.2 + speedRatio * 0.9);
      const padFreq = 820 + speedRatio * 900 + (state.isHandbrake ? 350 : 0);
      const squealFreq = 1850 + speedRatio * 650 + (state.isHandbrake ? 450 : 0);
      this.brakePadFilter?.frequency.setTargetAtTime(padFreq, now, 0.04);
      this.brakeSquealFilter?.frequency.setTargetAtTime(squealFreq, now, 0.04);
      this.brakeGain?.gain.setTargetAtTime(0.28 * brakeIntensity, now, 0.035);
      this.brakeSquealGain?.gain.setTargetAtTime(
        (state.isHandbrake ? 0.16 : 0.1) * brakeIntensity,
        now,
        0.045,
      );
    } else {
      this.brakeGain?.gain.setTargetAtTime(0, now, 0.04);
      this.brakeSquealGain?.gain.setTargetAtTime(0, now, 0.04);
    }
  }

  public stopAll() {
    if (!this.ctx || !this.initialized) return;
    const now = this.ctx.currentTime;
    this.engineGain?.gain.setTargetAtTime(0, now, 0.05);
    this.decelGain?.gain.setTargetAtTime(0, now, 0.05);
    this.brakeGain?.gain.setTargetAtTime(0, now, 0.05);
    this.brakeSquealGain?.gain.setTargetAtTime(0, now, 0.05);
  }
}

export const engineAudio = new EngineAudioController();
