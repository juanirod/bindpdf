import { BUILT_IN_PRESETS, type Preset } from "../domain/presets";

/** Shell-friendly preset id: "Scanned (black & white)" → "scanned-black-white". */
export const presetSlug = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

/** Finds a preset by its name (any case) or its slug. */
export const findPreset = (presets: readonly Preset[], query: string) =>
  presets.find(
    (preset) => preset.name.toLowerCase() === query.toLowerCase() || presetSlug(preset.name) === presetSlug(query),
  );

export const isBuiltIn = (preset: Preset) => BUILT_IN_PRESETS.includes(preset);

export const describeAdjustments = ({ adjustments: { brightness, contrast, saturation } }: Preset) =>
  `brightness ${brightness}, contrast ${contrast}, saturation ${saturation}`;
