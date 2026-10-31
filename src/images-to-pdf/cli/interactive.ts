import { confirm, input, number, select } from "@inquirer/prompts";
import type { PageSize } from "../application/build-pdf";
import type { PresetStore } from "../application/ports";
import { ADJUSTMENT_RANGES, sameAdjustments, type Adjustments } from "../domain/adjustments";
import { BUILT_IN_PRESETS, savePreset } from "../domain/presets";
import { withPdfExtension } from "./args";
import { describeAdjustments } from "./presets";
import { reorderPrompt } from "./reorder";
import { CancelledError, type Session } from "./run";

const CUSTOM = "";
const LABELS: Record<keyof Adjustments, string> = {
  brightness: "Brightness",
  contrast: "Contrast",
  saturation: "Saturation",
};
const PAGE_SIZES: readonly { name: string; value: PageSize }[] = [
  { name: "Image size", value: "image" },
  { name: "A4", value: "a4" },
  { name: "Letter", value: "letter" },
];

const askValues = async (start: Adjustments): Promise<Adjustments> => {
  let values = start;
  for (const key of Object.keys(LABELS) as (keyof Adjustments)[]) {
    const [min, max] = ADJUSTMENT_RANGES[key];
    const value = await number({
      message: `${LABELS[key]} (${min}–${max}, 100 unchanged)`,
      default: values[key],
      min,
      max,
      step: 1,
      required: true,
    });
    values = { ...values, [key]: value };
  }
  return values;
};

const offerToSave = async (adjustments: Adjustments, store: PresetStore) => {
  const userPresets = store.load();
  const known = [...BUILT_IN_PRESETS, ...userPresets].some((preset) => sameAdjustments(preset.adjustments, adjustments));
  if (known || !(await confirm({ message: "Save these adjustments as a preset?", default: false }))) return;

  const name = await input({
    message: "Preset name",
    validate: (value) => {
      try {
        savePreset(userPresets, value, adjustments);
        return true;
      } catch (error) {
        return (error as Error).message;
      }
    },
  });
  store.store(savePreset(userPresets, name, adjustments));
};

const chooseAdjustments = async (current: Adjustments, store: PresetStore): Promise<Adjustments> => {
  const presets = [...BUILT_IN_PRESETS, ...store.load()];
  const choice = await select({
    message: "Adjustments for every page",
    choices: [
      ...presets.map((preset) => ({ name: preset.name, value: preset.name, description: describeAdjustments(preset) })),
      { name: "Custom values…", value: CUSTOM },
    ],
    default: presets.find((preset) => sameAdjustments(preset.adjustments, current))?.name ?? CUSTOM,
  });

  const preset = presets.find((candidate) => candidate.name === choice);
  if (preset && !(await confirm({ message: "Fine-tune brightness, contrast or saturation?", default: false }))) {
    return preset.adjustments;
  }
  const adjustments = await askValues(preset?.adjustments ?? current);
  await offerToSave(adjustments, store);
  return adjustments;
};

const steps = async (session: Session, store: PresetStore): Promise<Session> => {
  const batch = await reorderPrompt({ message: "Page order", pages: session.batch });
  const adjustments = await chooseAdjustments(session.adjustments, store);
  const pageSize = await select({ message: "Page size", choices: PAGE_SIZES, default: session.pageSize });
  const output = await input({
    message: "Save PDF as",
    default: session.output,
    validate: (value) => value.trim() !== "" || "Give the PDF a file name.",
  });
  return { batch, adjustments, pageSize, output: withPdfExtension(output.trim()) };
};

/** Walks through order, adjustments, page size and file name, starting from what the flags chose. */
export const interact = async (session: Session, store: PresetStore): Promise<Session> => {
  try {
    return await steps(session, store);
  } catch (error) {
    // Ctrl+C inside a prompt.
    if ((error as Error).name === "ExitPromptError") throw new CancelledError();
    throw error;
  }
};
