import type { PresetStore } from "../../application/ports";

const KEY = "bindpdf.presets";

/** User presets live in this browser only. Storage can be unavailable (private mode), so failures are silent. */
export const localPresetStore: PresetStore = {
  load: () => {
    try {
      const stored = JSON.parse(localStorage.getItem(KEY) ?? "[]");
      return Array.isArray(stored) ? stored : [];
    } catch {
      return [];
    }
  },

  store: (presets) => {
    try {
      localStorage.setItem(KEY, JSON.stringify(presets));
    } catch {
      // Presets still work for this session.
    }
  },
};
