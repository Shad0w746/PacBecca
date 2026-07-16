export const PACBECCA_SOUND_CHANGE_EVENT = "pacbecca:sound-enabled-change";
export const PACBECCA_AUDIO_PAUSE_EVENT = "pacbecca:audio-paused-change";
export const PACBECCA_SOUND_STORAGE_KEY = "pacbecca:sound-enabled";

export type PacBeccaSoundName =
  | "ui"
  | "start"
  | "levelStart"
  | "pellet"
  | "power"
  | "powerModeStart"
  | "heart"
  | "burst"
  | "ghost"
  | "rearGhost"
  | "hit"
  | "death"
  | "rage"
  | "levelClear"
  | "win"
  | "gameOver";

type SoundStorage = Pick<Storage, "getItem" | "setItem">;

interface ToneStep {
  offsetMs?: number;
  durationMs: number;
  frequency: number;
  endFrequency?: number;
  gain?: number;
  type?: OscillatorType;
  attackMs?: number;
}

interface NoiseStep {
  offsetMs?: number;
  durationMs: number;
  gain?: number;
  filterFrequency?: number;
}

interface SoundCue {
  throttleMs?: number;
  tones?: ToneStep[];
  noise?: NoiseStep[];
}

const MASTER_GAIN = 0.34;
const MIN_GAIN = 0.0001;
const BACKGROUND_MUSIC_STEP_MS = 240;
const POWER_MODE_STEP_MS = 116;
const BACKGROUND_BASS_NOTES = [110, 82.41, 98, 73.42] as const;
const BACKGROUND_BELL_NOTES = new Map<number, number>([
  [0, 440],
  [3, 523.25],
  [7, 659.25],
  [11, 587.33],
  [16, 392],
  [19, 493.88],
  [23, 587.33],
  [28, 783.99]
]);
const BACKGROUND_SHIMMER_STEPS = new Set([6, 14, 22, 30]);
const POWER_MODE_SPARKLE_NOTES = [
  987.77,
  1318.51,
  1567.98,
  1975.53,
  1760,
  1567.98,
  1318.51,
  1174.66
] as const;
const RAGE_MODE_SIREN_NOTES = [
  196,
  246.94,
  293.66,
  392,
  493.88,
  392,
  293.66,
  246.94
] as const;

const SOUND_CUES: Record<PacBeccaSoundName, SoundCue> = {
  ui: {
    tones: [{ durationMs: 70, frequency: 660, endFrequency: 880, gain: 0.08, type: "sine" }]
  },
  start: {
    tones: [
      { durationMs: 90, frequency: 392, gain: 0.09, type: "triangle" },
      { offsetMs: 80, durationMs: 100, frequency: 523.25, gain: 0.09, type: "triangle" },
      { offsetMs: 170, durationMs: 130, frequency: 783.99, gain: 0.1, type: "square" }
    ]
  },
  levelStart: {
    tones: [
      { durationMs: 75, frequency: 523.25, gain: 0.08, type: "triangle" },
      { offsetMs: 70, durationMs: 90, frequency: 659.25, gain: 0.08, type: "triangle" },
      { offsetMs: 150, durationMs: 120, frequency: 880, gain: 0.09, type: "square" }
    ]
  },
  pellet: {
    throttleMs: 45,
    tones: [{ durationMs: 45, frequency: 740, endFrequency: 620, gain: 0.045, type: "square" }]
  },
  power: {
    tones: [
      { durationMs: 90, frequency: 329.63, endFrequency: 493.88, gain: 0.085, type: "triangle" },
      { offsetMs: 70, durationMs: 95, frequency: 493.88, endFrequency: 659.25, gain: 0.075, type: "triangle" },
      { offsetMs: 140, durationMs: 110, frequency: 659.25, endFrequency: 987.77, gain: 0.075, type: "square" },
      { offsetMs: 220, durationMs: 160, frequency: 1318.51, endFrequency: 1975.53, gain: 0.06, type: "sine" }
    ],
    noise: [{ durationMs: 130, gain: 0.018, filterFrequency: 1800 }]
  },
  powerModeStart: {
    tones: [
      { durationMs: 95, frequency: 523.25, endFrequency: 783.99, gain: 0.088, type: "square" },
      { offsetMs: 74, durationMs: 95, frequency: 659.25, endFrequency: 987.77, gain: 0.084, type: "triangle" },
      { offsetMs: 148, durationMs: 115, frequency: 783.99, endFrequency: 1318.51, gain: 0.08, type: "square" },
      { offsetMs: 228, durationMs: 155, frequency: 1046.5, endFrequency: 2093, gain: 0.066, type: "sine" },
      { offsetMs: 330, durationMs: 185, frequency: 1567.98, endFrequency: 2349.32, gain: 0.052, type: "triangle" }
    ],
    noise: [{ offsetMs: 40, durationMs: 210, gain: 0.014, filterFrequency: 2600 }]
  },
  heart: {
    tones: [
      { durationMs: 80, frequency: 987.77, gain: 0.065, type: "sine" },
      { offsetMs: 64, durationMs: 90, frequency: 1318.51, gain: 0.06, type: "sine" },
      { offsetMs: 130, durationMs: 120, frequency: 1760, gain: 0.052, type: "triangle" }
    ]
  },
  burst: {
    tones: [
      { durationMs: 220, frequency: 110, endFrequency: 55, gain: 0.12, type: "sawtooth" },
      { offsetMs: 20, durationMs: 240, frequency: 440, endFrequency: 1046.5, gain: 0.085, type: "square" },
      { offsetMs: 80, durationMs: 220, frequency: 659.25, endFrequency: 1318.51, gain: 0.05, type: "triangle" }
    ],
    noise: [{ durationMs: 190, gain: 0.03, filterFrequency: 900 }]
  },
  ghost: {
    tones: [
      { durationMs: 80, frequency: 880, endFrequency: 440, gain: 0.075, type: "square" },
      { offsetMs: 70, durationMs: 110, frequency: 1320, endFrequency: 660, gain: 0.06, type: "triangle" }
    ]
  },
  rearGhost: {
    tones: [
      { durationMs: 70, frequency: 330, endFrequency: 660, gain: 0.08, type: "square" },
      { offsetMs: 62, durationMs: 100, frequency: 660, endFrequency: 990, gain: 0.055, type: "triangle" }
    ]
  },
  hit: {
    tones: [
      { durationMs: 190, frequency: 196, endFrequency: 98, gain: 0.11, type: "sawtooth" },
      { offsetMs: 40, durationMs: 160, frequency: 130.81, endFrequency: 82.41, gain: 0.08, type: "square" }
    ],
    noise: [{ durationMs: 120, gain: 0.024, filterFrequency: 520 }]
  },
  death: {
    tones: [
      { durationMs: 120, frequency: 783.99, endFrequency: 392, gain: 0.085, type: "square" },
      { offsetMs: 95, durationMs: 110, frequency: 587.33, endFrequency: 880, gain: 0.055, type: "triangle" },
      { offsetMs: 190, durationMs: 135, frequency: 440, endFrequency: 659.25, gain: 0.05, type: "sine" }
    ],
    noise: [{ offsetMs: 20, durationMs: 80, gain: 0.014, filterFrequency: 1200 }]
  },
  rage: {
    tones: [
      { durationMs: 210, frequency: 155.56, endFrequency: 311.13, gain: 0.13, type: "sawtooth" },
      { offsetMs: 95, durationMs: 260, frequency: 233.08, endFrequency: 932.33, gain: 0.11, type: "square" },
      { offsetMs: 220, durationMs: 190, frequency: 1244.51, endFrequency: 622.25, gain: 0.09, type: "triangle" },
      { offsetMs: 360, durationMs: 260, frequency: 466.16, endFrequency: 1864.66, gain: 0.075, type: "square" },
      { offsetMs: 540, durationMs: 360, frequency: 932.33, endFrequency: 233.08, gain: 0.055, type: "sawtooth" }
    ],
    noise: [
      { offsetMs: 30, durationMs: 360, gain: 0.04, filterFrequency: 1700 },
      { offsetMs: 430, durationMs: 190, gain: 0.025, filterFrequency: 3200 }
    ]
  },
  levelClear: {
    tones: [
      { durationMs: 80, frequency: 523.25, gain: 0.08, type: "triangle" },
      { offsetMs: 75, durationMs: 80, frequency: 659.25, gain: 0.08, type: "triangle" },
      { offsetMs: 150, durationMs: 90, frequency: 783.99, gain: 0.08, type: "triangle" },
      { offsetMs: 230, durationMs: 160, frequency: 1046.5, gain: 0.09, type: "square" }
    ]
  },
  win: {
    tones: [
      { durationMs: 95, frequency: 523.25, gain: 0.08, type: "triangle" },
      { offsetMs: 90, durationMs: 95, frequency: 659.25, gain: 0.08, type: "triangle" },
      { offsetMs: 180, durationMs: 95, frequency: 783.99, gain: 0.08, type: "triangle" },
      { offsetMs: 270, durationMs: 120, frequency: 1046.5, gain: 0.08, type: "square" },
      { offsetMs: 390, durationMs: 220, frequency: 1318.51, gain: 0.075, type: "triangle" }
    ]
  },
  gameOver: {
    tones: [
      { durationMs: 230, frequency: 392, endFrequency: 293.66, gain: 0.085, type: "triangle" },
      { offsetMs: 160, durationMs: 260, frequency: 261.63, endFrequency: 196, gain: 0.085, type: "triangle" },
      { offsetMs: 340, durationMs: 430, frequency: 164.81, endFrequency: 82.41, gain: 0.1, type: "sawtooth" },
      { offsetMs: 430, durationMs: 520, frequency: 98, endFrequency: 49, gain: 0.075, type: "sine" }
    ],
    noise: [{ offsetMs: 190, durationMs: 520, gain: 0.018, filterFrequency: 260 }]
  }
};

type WindowWithWebkitAudio = Window & {
  webkitAudioContext?: new () => AudioContext;
};

interface AudioRuntime {
  context: AudioContext;
  master: GainNode;
}

let sharedContext: AudioContext | undefined;
let sharedMaster: GainNode | undefined;

export function primePacBeccaAudio(enabled = readStoredSoundEnabled()): void {
  if (!enabled) {
    return;
  }

  const runtime = ensureAudioRuntime(enabled);
  if (runtime?.context.state === "suspended") {
    void runtime.context.resume();
  }
}

export function normalizeStoredSoundEnabled(value: string | null): boolean {
  if (value === null) {
    return true;
  }

  return !["0", "false", "off"].includes(value.toLowerCase());
}

export function readStoredSoundEnabled(storage = getLocalStorage()): boolean {
  if (!storage) {
    return true;
  }

  try {
    return normalizeStoredSoundEnabled(storage.getItem(PACBECCA_SOUND_STORAGE_KEY));
  } catch {
    return true;
  }
}

export function writeStoredSoundEnabled(
  enabled: boolean,
  storage: SoundStorage | null = getLocalStorage()
): void {
  if (!storage) {
    return;
  }

  try {
    storage.setItem(PACBECCA_SOUND_STORAGE_KEY, String(enabled));
  } catch {
    // Storage may be unavailable in private or embedded contexts; sound still works in memory.
  }
}

export function getSoundToggleLabel(enabled: boolean): string {
  return enabled ? "Sound On" : "Sound Off";
}

export class PacBeccaAudio {
  private context?: AudioContext;
  private master?: GainNode;
  private noiseBuffer?: AudioBuffer;
  private enabled = readStoredSoundEnabled();
  private gameplayPaused = false;
  private backgroundMusicRequested = false;
  private backgroundMusicTimerId?: number;
  private backgroundMusicStep = 0;
  private powerModeTimerId?: number;
  private powerModeStopTimerId?: number;
  private powerModeStep = 0;
  private powerModeUntilMs = 0;
  private powerModePausedRemainingMs = 0;
  private rageModeUntilMs = 0;
  private rageModePausedRemainingMs = 0;
  private readonly lastPlayedAt = new Map<PacBeccaSoundName, number>();

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    writeStoredSoundEnabled(enabled);

    if (!enabled) {
      this.clearBackgroundMusicTimer();
      this.clearPowerModeTimer();
    }

    if (!this.context || !this.master) {
      return;
    }

    const runtime = getAudioRuntime();
    if (!runtime) {
      return;
    }

    const now = runtime.context.currentTime;
    runtime.master.gain.cancelScheduledValues(now);
    runtime.master.gain.setTargetAtTime(enabled ? MASTER_GAIN : 0, now, 0.02);

    if (enabled && runtime.context.state === "suspended") {
      void runtime.context.resume();
    }

    if (enabled) {
      this.maybeStartBackgroundMusic();
      this.maybeStartPowerModeLoop();
    }
  }

  setGameplayPaused(paused: boolean): void {
    this.gameplayPaused = paused;

    if (paused) {
      this.powerModePausedRemainingMs = Math.max(0, this.powerModeUntilMs - performance.now());
      this.rageModePausedRemainingMs = Math.max(0, this.rageModeUntilMs - performance.now());
      this.clearBackgroundMusicTimer();
      this.clearPowerModeTimer();
      this.clearPowerModeStopTimer();
      return;
    }

    if (this.powerModePausedRemainingMs > 0) {
      this.powerModeUntilMs = Math.max(
        this.powerModeUntilMs,
        performance.now() + this.powerModePausedRemainingMs
      );
      this.powerModePausedRemainingMs = 0;
      this.schedulePowerModeStop();
    }

    if (this.rageModePausedRemainingMs > 0) {
      this.rageModeUntilMs = Math.max(
        this.rageModeUntilMs,
        performance.now() + this.rageModePausedRemainingMs
      );
      this.rageModePausedRemainingMs = 0;
    }

    this.maybeStartBackgroundMusic();
    this.maybeStartPowerModeLoop();
  }

  startBackgroundMusic(): void {
    this.backgroundMusicRequested = true;
    this.maybeStartBackgroundMusic();
  }

  stopBackgroundMusic(): void {
    this.backgroundMusicRequested = false;
    this.clearBackgroundMusicTimer();
  }

  startPowerMode(durationMs: number): void {
    this.powerModeUntilMs = Math.max(this.powerModeUntilMs, performance.now() + durationMs);
    this.play("powerModeStart");
    this.maybeStartPowerModeLoop();
    this.schedulePowerModeStop();
  }

  startRageMode(durationMs: number): void {
    this.powerModeUntilMs = Math.max(this.powerModeUntilMs, performance.now() + durationMs);
    this.rageModeUntilMs = Math.max(this.rageModeUntilMs, performance.now() + durationMs);
    this.powerModePausedRemainingMs = 0;
    this.rageModePausedRemainingMs = 0;
    this.play("rage");
    this.maybeStartPowerModeLoop();
    this.schedulePowerModeStop();
  }

  stopPowerMode(): void {
    this.powerModeUntilMs = 0;
    this.powerModePausedRemainingMs = 0;
    this.rageModeUntilMs = 0;
    this.rageModePausedRemainingMs = 0;
    this.clearPowerModeTimer();
    this.clearPowerModeStopTimer();
  }

  play(name: PacBeccaSoundName): void {
    if (!this.enabled) {
      return;
    }

    const cue = SOUND_CUES[name];
    const context = this.ensureContext();
    if (!context || !this.master || this.isThrottled(name, cue, context.currentTime)) {
      return;
    }

    if (context.state === "suspended") {
      void context.resume();
    }

    const startAt = context.currentTime + 0.012;
    cue.tones?.forEach((tone) => this.playTone(context, tone, startAt));
    cue.noise?.forEach((noise) => this.playNoise(context, noise, startAt));
  }

  dispose(): void {
    this.stopBackgroundMusic();
    this.stopPowerMode();
    this.lastPlayedAt.clear();
    this.context = undefined;
    this.master = undefined;
    this.noiseBuffer = undefined;
  }

  private maybeStartBackgroundMusic(): void {
    if (
      !this.enabled ||
      this.gameplayPaused ||
      !this.backgroundMusicRequested ||
      this.backgroundMusicTimerId !== undefined
    ) {
      return;
    }

    const context = this.ensureContext();
    if (!context || !this.master) {
      return;
    }

    if (context.state === "suspended") {
      void context.resume();
    }

    this.tickBackgroundMusic();
    this.backgroundMusicTimerId = window.setInterval(
      () => this.tickBackgroundMusic(),
      BACKGROUND_MUSIC_STEP_MS
    );
  }

  private tickBackgroundMusic(): void {
    if (!this.enabled || this.gameplayPaused || !this.backgroundMusicRequested) {
      return;
    }

    const context = this.ensureContext();
    if (!context || !this.master) {
      return;
    }

    const step = this.backgroundMusicStep % 32;
    const startAt = context.currentTime + 0.018;

    if (step % 8 === 0) {
      const bassFrequency = BACKGROUND_BASS_NOTES[Math.floor(step / 8)];
      this.playTone(
        context,
        {
          durationMs: 720,
          frequency: bassFrequency,
          gain: 0.018,
          type: "triangle",
          attackMs: 70
        },
        startAt
      );

      this.playTone(
        context,
        {
          offsetMs: 28,
          durationMs: 760,
          frequency: bassFrequency * 2,
          gain: 0.0075,
          type: "sine",
          attackMs: 90
        },
        startAt
      );
    }

    if (step === 0 || step === 16) {
      this.playTone(
        context,
        {
          durationMs: 1560,
          frequency: step === 0 ? 220 : 196,
          gain: 0.008,
          type: "sine",
          attackMs: 160
        },
        startAt
      );
    }

    const bellFrequency = BACKGROUND_BELL_NOTES.get(step);
    if (bellFrequency) {
      this.playTone(
        context,
        {
          durationMs: 170,
          frequency: bellFrequency,
          gain: 0.019,
          type: "triangle",
          attackMs: 14
        },
        startAt + 0.01
      );

      this.playTone(
        context,
        {
          offsetMs: 95,
          durationMs: 210,
          frequency: bellFrequency * 1.5,
          gain: 0.006,
          type: "sine",
          attackMs: 20
        },
        startAt
      );
    }

    if (BACKGROUND_SHIMMER_STEPS.has(step)) {
      this.playNoise(
        context,
        {
          durationMs: 34,
          gain: 0.004,
          filterFrequency: 2100
        },
        startAt
      );
    }

    this.backgroundMusicStep += 1;
  }

  private maybeStartPowerModeLoop(): void {
    if (
      !this.enabled ||
      this.gameplayPaused ||
      this.powerModeUntilMs <= performance.now() ||
      this.powerModeTimerId !== undefined
    ) {
      return;
    }

    const context = this.ensureContext();
    if (!context || !this.master) {
      return;
    }

    if (context.state === "suspended") {
      void context.resume();
    }

    this.tickPowerModeLoop();
    this.powerModeTimerId = window.setInterval(
      () => this.tickPowerModeLoop(),
      POWER_MODE_STEP_MS
    );
  }

  private tickPowerModeLoop(): void {
    if (!this.enabled || this.gameplayPaused || this.powerModeUntilMs <= performance.now()) {
      this.stopPowerMode();
      return;
    }

    const context = this.ensureContext();
    if (!context || !this.master) {
      return;
    }

    const step = this.powerModeStep % 8;
    const startAt = context.currentTime + 0.01;
    const rageActive = this.rageModeUntilMs > performance.now();

    this.playTone(
      context,
      {
        durationMs: rageActive ? 92 : 82,
        frequency: POWER_MODE_SPARKLE_NOTES[step],
        gain: rageActive ? 0.031 : step % 2 === 0 ? 0.038 : 0.03,
        type: step % 2 === 0 ? "square" : "triangle",
        attackMs: 4
      },
      startAt
    );

    this.playTone(
      context,
      {
        offsetMs: 42,
        durationMs: 74,
        frequency: POWER_MODE_SPARKLE_NOTES[(step + 2) % POWER_MODE_SPARKLE_NOTES.length],
        gain: rageActive ? 0.014 : 0.019,
        type: "sine",
        attackMs: 5
      },
      startAt
    );

    if (step === 0 || step === 4) {
      this.playTone(
        context,
        {
          durationMs: 116,
          frequency: 493.88,
          gain: rageActive ? 0.017 : 0.024,
          type: "square",
          attackMs: 8
        },
        startAt
      );
    }

    if (rageActive) {
      this.playTone(
        context,
        {
          durationMs: 130,
          frequency: RAGE_MODE_SIREN_NOTES[step],
          endFrequency: RAGE_MODE_SIREN_NOTES[(step + 1) % RAGE_MODE_SIREN_NOTES.length],
          gain: step % 2 === 0 ? 0.038 : 0.029,
          type: "sawtooth",
          attackMs: 6
        },
        startAt
      );

      if (step % 2 === 0) {
        this.playNoise(
          context,
          {
            durationMs: 46,
            gain: 0.008,
            filterFrequency: 1650 + step * 140
          },
          startAt
        );
      }
    }

    this.powerModeStep += 1;
  }

  private clearBackgroundMusicTimer(): void {
    if (this.backgroundMusicTimerId === undefined) {
      return;
    }

    window.clearInterval(this.backgroundMusicTimerId);
    this.backgroundMusicTimerId = undefined;
  }

  private clearPowerModeTimer(): void {
    if (this.powerModeTimerId === undefined) {
      return;
    }

    window.clearInterval(this.powerModeTimerId);
    this.powerModeTimerId = undefined;
  }

  private clearPowerModeStopTimer(): void {
    if (this.powerModeStopTimerId === undefined) {
      return;
    }

    window.clearTimeout(this.powerModeStopTimerId);
    this.powerModeStopTimerId = undefined;
  }

  private schedulePowerModeStop(): void {
    this.clearPowerModeStopTimer();
    const remainingMs = Math.max(0, this.powerModeUntilMs - performance.now());
    this.powerModeStopTimerId = window.setTimeout(() => {
      this.powerModeStopTimerId = undefined;
      this.stopPowerMode();
    }, remainingMs + POWER_MODE_STEP_MS);
  }

  private ensureContext(): AudioContext | null {
    if (this.context) {
      return this.context;
    }

    if (typeof window === "undefined") {
      return null;
    }

    const runtime = ensureAudioRuntime(this.enabled);
    if (!runtime) {
      return null;
    }

    this.context = runtime.context;
    this.master = runtime.master;
    return runtime.context;
  }

  private isThrottled(
    name: PacBeccaSoundName,
    cue: SoundCue,
    currentTimeSeconds: number
  ): boolean {
    const throttleMs = cue.throttleMs ?? 0;
    if (throttleMs === 0) {
      return false;
    }

    const currentTimeMs = currentTimeSeconds * 1000;
    const lastPlayedAt = this.lastPlayedAt.get(name) ?? -Number.POSITIVE_INFINITY;
    if (currentTimeMs - lastPlayedAt < throttleMs) {
      return true;
    }

    this.lastPlayedAt.set(name, currentTimeMs);
    return false;
  }

  private playTone(context: AudioContext, tone: ToneStep, baseTime: number): void {
    if (!this.master) {
      return;
    }

    const oscillator = context.createOscillator();
    const envelope = context.createGain();
    const startAt = baseTime + (tone.offsetMs ?? 0) / 1000;
    const endAt = startAt + tone.durationMs / 1000;
    const attackEndAt = startAt + (tone.attackMs ?? 8) / 1000;
    const peakGain = tone.gain ?? 0.08;

    oscillator.type = tone.type ?? "square";
    oscillator.frequency.setValueAtTime(tone.frequency, startAt);
    if (tone.endFrequency) {
      oscillator.frequency.exponentialRampToValueAtTime(
        Math.max(20, tone.endFrequency),
        endAt
      );
    }

    envelope.gain.setValueAtTime(MIN_GAIN, startAt);
    envelope.gain.linearRampToValueAtTime(peakGain, attackEndAt);
    envelope.gain.exponentialRampToValueAtTime(MIN_GAIN, endAt);
    oscillator.connect(envelope).connect(this.master);
    oscillator.start(startAt);
    oscillator.stop(endAt + 0.025);
    oscillator.addEventListener("ended", () => {
      oscillator.disconnect();
      envelope.disconnect();
    });
  }

  private playNoise(context: AudioContext, noise: NoiseStep, baseTime: number): void {
    if (!this.master) {
      return;
    }

    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const envelope = context.createGain();
    const startAt = baseTime + (noise.offsetMs ?? 0) / 1000;
    const endAt = startAt + noise.durationMs / 1000;

    source.buffer = this.getNoiseBuffer(context);
    filter.type = "bandpass";
    filter.frequency.value = noise.filterFrequency ?? 1000;
    filter.Q.value = 0.9;
    envelope.gain.setValueAtTime(noise.gain ?? 0.02, startAt);
    envelope.gain.exponentialRampToValueAtTime(MIN_GAIN, endAt);

    source.connect(filter).connect(envelope).connect(this.master);
    source.start(startAt);
    source.stop(endAt + 0.01);
    source.addEventListener("ended", () => {
      source.disconnect();
      filter.disconnect();
      envelope.disconnect();
    });
  }

  private getNoiseBuffer(context: AudioContext): AudioBuffer {
    if (this.noiseBuffer && this.noiseBuffer.sampleRate === context.sampleRate) {
      return this.noiseBuffer;
    }

    const buffer = context.createBuffer(
      1,
      Math.floor(context.sampleRate * 0.45),
      context.sampleRate
    );
    const channel = buffer.getChannelData(0);
    for (let index = 0; index < channel.length; index += 1) {
      channel[index] = Math.random() * 2 - 1;
    }

    this.noiseBuffer = buffer;
    return buffer;
  }
}

function getLocalStorage(): SoundStorage | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function getAudioRuntime(): AudioRuntime | null {
  if (!sharedContext || !sharedMaster) {
    return null;
  }

  return {
    context: sharedContext,
    master: sharedMaster
  };
}

function ensureAudioRuntime(enabled: boolean): AudioRuntime | null {
  const existingRuntime = getAudioRuntime();
  if (existingRuntime) {
    existingRuntime.master.gain.value = enabled ? MASTER_GAIN : 0;
    return existingRuntime;
  }

  if (typeof window === "undefined") {
    return null;
  }

  const AudioContextCtor =
    window.AudioContext ?? (window as WindowWithWebkitAudio).webkitAudioContext;
  if (!AudioContextCtor) {
    return null;
  }

  const context = new AudioContextCtor();
  const master = context.createGain();
  master.gain.value = enabled ? MASTER_GAIN : 0;
  master.connect(context.destination);

  sharedContext = context;
  sharedMaster = master;

  return {
    context,
    master
  };
}
