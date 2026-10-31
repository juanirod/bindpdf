import type { Preset } from "../domain/presets";

const KEY = "bindpdf.presets";

/** User presets live in this browser only. Storage can be unavailable (private mode), so failures are silent. */
export const loadPresets = (): Preset[] => {
  try {
    const stored = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(stored) ? stored : [];
  } catch {
    return [];
  }
};

export const storePresets = (presets: readonly Preset[]) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(presets));
  } catch {
    // Presets still work for this session.
  }
};
