import { NEUTRAL, type Adjustments } from "../domain/adjustments";
import {
  BUILT_IN_PRESETS,
  deletePreset,
  InvalidPresetNameError,
  savePreset,
  type Preset,
} from "../domain/presets";
import { localPresetStore } from "../infrastructure/browser/local-preset-store";

const SLIDERS = ["brightness", "contrast", "saturation"] as const;
const CUSTOM = "";

const sameAdjustments = (a: Adjustments, b: Adjustments) =>
  SLIDERS.every((key) => a[key] === b[key]);

/** Wires the "Adjust images" panel. Calls onChange with the adjustments every time they change. */
export const mountAdjustmentsPanel = (
  doc: Document,
  onChange: (adjustments: Adjustments) => void,
) => {
  const $ = <T extends HTMLElement>(id: string) => doc.getElementById(id) as T;
  const presetSelect = $<HTMLSelectElement>("preset");
  const presetName = $<HTMLInputElement>("preset-name");
  const savePresetButton = $<HTMLButtonElement>("save-preset");
  const deletePresetButton = $<HTMLButtonElement>("delete-preset");
  const presetError = $<HTMLParagraphElement>("preset-error");
  const sliders = Object.fromEntries(
    SLIDERS.map((key) => [key, $<HTMLInputElement>(key)]),
  ) as Record<(typeof SLIDERS)[number], HTMLInputElement>;

  let userPresets = localPresetStore.load();
  let adjustments: Adjustments = NEUTRAL;

  const allPresets = (): Preset[] => [...BUILT_IN_PRESETS, ...userPresets];
  const isUserPreset = (name: string) => userPresets.some((preset) => preset.name === name);

  const option = (label: string, value: string) => {
    const element = doc.createElement("option");
    element.textContent = label;
    element.value = value;
    return element;
  };

  const group = (label: string, presets: readonly Preset[]) => {
    const element = doc.createElement("optgroup");
    element.label = label;
    element.append(...presets.map((preset) => option(preset.name, preset.name)));
    return element;
  };

  const renderPresetOptions = () => {
    presetSelect.replaceChildren(
      option("Custom", CUSTOM),
      group("Built-in", BUILT_IN_PRESETS),
      ...(userPresets.length ? [group("Your presets", userPresets)] : []),
    );
  };

  const showError = (message: string | null) => {
    presetError.hidden = !message;
    presetError.textContent = message ?? "";
  };

  const render = () => {
    for (const key of SLIDERS) {
      sliders[key].value = String(adjustments[key]);
      sliders[key].nextElementSibling!.textContent = `${adjustments[key]}%`;
    }
    const match = allPresets().find((preset) => sameAdjustments(preset.adjustments, adjustments));
    presetSelect.value = match?.name ?? CUSTOM;
    deletePresetButton.hidden = !isUserPreset(presetSelect.value);
  };

  const apply = (next: Adjustments) => {
    adjustments = next;
    render();
    onChange(adjustments);
  };

  presetSelect.addEventListener("change", () => {
    const preset = allPresets().find((item) => item.name === presetSelect.value);
    if (preset) apply(preset.adjustments);
  });

  for (const key of SLIDERS) {
    sliders[key].addEventListener("input", () =>
      apply({ ...adjustments, [key]: Number(sliders[key].value) }),
    );
  }

  savePresetButton.addEventListener("click", () => {
    try {
      userPresets = savePreset(userPresets, presetName.value, adjustments);
    } catch (error) {
      if (!(error instanceof InvalidPresetNameError)) throw error;
      showError(error.message);
      return;
    }
    localPresetStore.store(userPresets);
    showError(null);
    presetName.value = "";
    renderPresetOptions();
    render();
  });

  deletePresetButton.addEventListener("click", () => {
    userPresets = deletePreset(userPresets, presetSelect.value);
    localPresetStore.store(userPresets);
    renderPresetOptions();
    render();
  });

  renderPresetOptions();
  render();
};
