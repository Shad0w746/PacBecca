import { describe, expect, it } from "vitest";
import {
  PACBECCA_SOUND_STORAGE_KEY,
  getSoundToggleLabel,
  normalizeStoredSoundEnabled,
  readStoredSoundEnabled,
  writeStoredSoundEnabled
} from "./sound";

class MemoryStorage {
  private readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

describe("sound preferences", () => {
  it("defaults sound to enabled when no preference is stored", () => {
    expect(normalizeStoredSoundEnabled(null)).toBe(true);
  });

  it("recognizes muted stored values", () => {
    expect(normalizeStoredSoundEnabled("false")).toBe(false);
    expect(normalizeStoredSoundEnabled("0")).toBe(false);
    expect(normalizeStoredSoundEnabled("off")).toBe(false);
  });

  it("writes and reads the sound preference", () => {
    const storage = new MemoryStorage();

    writeStoredSoundEnabled(false, storage);

    expect(storage.getItem(PACBECCA_SOUND_STORAGE_KEY)).toBe("false");
    expect(readStoredSoundEnabled(storage)).toBe(false);
  });

  it("formats the sound toggle label", () => {
    expect(getSoundToggleLabel(true)).toBe("Sound On");
    expect(getSoundToggleLabel(false)).toBe("Sound Off");
  });
});
