import { NEUTRAL, type Adjustments } from "./adjustments";

export interface Preset {
  readonly name: string;
  readonly adjustments: Adjustments;
}

export const BUILT_IN_PRESETS: readonly Preset[] = [
  { name: "Original", adjustments: NEUTRAL },
  { name: "Scanned (black & white)", adjustments: { brightness: 112, contrast: 145, saturation: 0 } },
  { name: "Scanned (color)", adjustments: { brightness: 108, contrast: 125, saturation: 85 } },
];

export class InvalidPresetNameError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidPresetNameError";
  }
}

const sameName = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

/** Adds a user preset, replacing any saved preset with the same name. */
export const savePreset = (
  presets: readonly Preset[],
  rawName: string,
  adjustments: Adjustments,
): Preset[] => {
  const name = rawName.trim();
  if (!name) throw new InvalidPresetNameError("Give the preset a name.");
  if (BUILT_IN_PRESETS.some((preset) => sameName(preset.name, name))) {
    throw new InvalidPresetNameError(`"${name}" is a built-in preset. Choose another name.`);
  }
  return [...presets.filter((preset) => !sameName(preset.name, name)), { name, adjustments }];
};

export const deletePreset = (presets: readonly Preset[], name: string): Preset[] =>
  presets.filter((preset) => preset.name !== name);
