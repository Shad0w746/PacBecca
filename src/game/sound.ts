export const PACBECCA_SOUND_CHANGE_EVENT = "pacbecca:sound-enabled-change";
export const PACBECCA_SOUND_STORAGE_KEY = "pacbecca:sound-enabled";

export type PacBeccaSoundName =
  | "ui"
  | "start"
  | "levelStart"
  | "pellet"
  | "power"
  | "heart"
  | "burst"
  | "ghost"
  | "rearGhost"
  | "hit"
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
      { durationMs: 120, frequency: 196, endFrequency: 392, gain: 0.09, type: "sawtooth" },
      { offsetMs: 70, durationMs: 150, frequency: 523.25, endFrequency: 1046.5, gain: 0.08, type: "triangle" },
      { offsetMs: 140, durationMs: 140, frequency: 1567.98, endFrequency: 1174.66, gain: 0.055, type: "sine" }
    ],
    noise: [{ durationMs: 110, gain: 0.018, filterFrequency: 1400 }]
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
  rage: {
    tones: [
      { durationMs: 180, frequency: 233.08, endFrequency: 466.16, gain: 0.12, type: "sawtooth" },
      { offsetMs: 120, durationMs: 190, frequency: 523.25, endFrequency: 1046.5, gain: 0.1, type: "square" },
      { offsetMs: 260, durationMs: 190, frequency: 932.33, endFrequency: 466.16, gain: 0.075, type: "triangle" }
    ],
    noise: [{ offsetMs: 40, durationMs: 290, gain: 0.03, filterFrequency: 1800 }]
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
      { durationMs: 150, frequency: 392, endFrequency: 349.23, gain: 0.085, type: "triangle" },
      { offsetMs: 130, durationMs: 170, frequency: 261.63, endFrequency: 220, gain: 0.09, type: "triangle" },
      { offsetMs: 280, durationMs: 260, frequency: 164.81, endFrequency: 82.41, gain: 0.095, type: "sawtooth" }
    ]
  }
};

type WindowWithWebkitAudio = Window & {
  webkitAudioContext?: new () => AudioContext;
};

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
  private readonly lastPlayedAt = new Map<PacBeccaSoundName, number>();

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    writeStoredSoundEnabled(enabled);

    if (!this.context || !this.master) {
      return;
    }

    const now = this.context.currentTime;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setTargetAtTime(enabled ? MASTER_GAIN : 0, now, 0.02);

    if (enabled && this.context.state === "suspended") {
      void this.context.resume();
    }
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
    this.lastPlayedAt.clear();
    if (!this.context) {
      return;
    }

    void this.context.close();
    this.context = undefined;
    this.master = undefined;
    this.noiseBuffer = undefined;
  }

  private ensureContext(): AudioContext | null {
    if (this.context) {
      return this.context;
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
    master.gain.value = this.enabled ? MASTER_GAIN : 0;
    master.connect(context.destination);

    this.context = context;
    this.master = master;
    return context;
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
