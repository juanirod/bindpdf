import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import type { PresetStore } from "../../application/ports";

/** `$XDG_CONFIG_HOME/bindpdf/presets.json`, or `~/.config/bindpdf/presets.json`. */
export const defaultPresetsPath = (env: NodeJS.ProcessEnv = process.env, home = homedir()) =>
  join(env.XDG_CONFIG_HOME || join(home, ".config"), "bindpdf", "presets.json");

/** User presets in a JSON file. A missing or corrupt file means no presets yet. */
export const createFilePresetStore = (path = defaultPresetsPath()): PresetStore => ({
  load: () => {
    try {
      const stored = JSON.parse(readFileSync(path, "utf8"));
      return Array.isArray(stored) ? stored : [];
    } catch {
      return [];
    }
  },

  store: (presets) => {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, `${JSON.stringify(presets, null, 2)}\n`);
  },
});
