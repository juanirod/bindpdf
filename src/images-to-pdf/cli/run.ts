import { adjustImage } from "../application/adjust-image";
import { createPdfBuilder, type PageSize } from "../application/build-pdf";
import { loadImage, UnsupportedImageError, type ImageSource } from "../application/load-image";
import type { ImageCodec, PresetStore } from "../application/ports";
import { NEUTRAL, type Adjustments } from "../domain/adjustments";
import { sortByDate, type BatchImage } from "../domain/batch";
import { BUILT_IN_PRESETS, deletePreset, InvalidPresetNameError, savePreset, type Preset } from "../domain/presets";
import { HELP, parseCliArgs, UsageError, type BindOptions, type Order } from "./args";
import { eachInOrder } from "./each-in-order";
import { describeAdjustments, findPreset, isBuiltIn, presetSlug } from "./presets";
import type { Progress } from "./progress";

/** Pages adjusted at once: sharp works on libuv's 4 threads by default, and each page in flight holds its pixels. */
const PARALLEL_PAGES = 4;

/** What interactive mode can change before the PDF is built. */
export interface Session {
  readonly batch: readonly BatchImage[];
  readonly adjustments: Adjustments;
  readonly pageSize: PageSize;
  readonly output: string;
}

export interface CliDeps {
  readonly codec: ImageCodec;
  readonly presets: PresetStore;
  readImageFile(path: string): Promise<ImageSource>;
  writeFile(path: string, bytes: Uint8Array): Promise<void>;
  out(line: string): void;
  err(line: string): void;
  readonly version: string;
  /** Status line for slow steps; absent when output isn't a terminal. */
  readonly progress?: Progress;
  /** Interactive mode; absent when the terminal can't run it. */
  interact?(session: Session, presets: PresetStore): Promise<Session>;
}

/** Fails the run with exit code 1. */
class CliError extends Error {}

/** The user quit interactive mode: nothing is written. */
export class CancelledError extends Error {
  constructor() {
    super("Cancelled.");
    this.name = "CancelledError";
  }
}

/** Neutral, then the preset (by name or slug), then explicit values. */
export const resolveAdjustments = (
  userPresets: readonly Preset[],
  presetQuery: string | undefined,
  explicit: Partial<Adjustments>,
): Adjustments => {
  let base = NEUTRAL;
  if (presetQuery !== undefined) {
    const preset = findPreset([...BUILT_IN_PRESETS, ...userPresets], presetQuery);
    if (!preset) throw new UsageError(`Unknown preset "${presetQuery}". See bindpdf --list-presets.`);
    base = preset.adjustments;
  }
  return { ...base, ...explicit };
};

const readSource = async (path: string, deps: CliDeps) => {
  try {
    return await deps.readImageFile(path);
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT") throw new CliError(`${path} doesn't exist.`);
    throw new CliError(`Can't read ${path}: ${(error as Error).message}`);
  }
};

/** Manual positions refer to the listed files, so they apply before loading, while unreadable files still have a slot. */
const listedOrder = (files: readonly string[], order: Order) =>
  order.kind === "manual" ? order.positions.map((position) => files[position]) : files;

const loadBatch = async (files: readonly string[], deps: CliDeps): Promise<BatchImage[]> => {
  const sources: ImageSource[] = [];
  for (const file of files) sources.push(await readSource(file, deps));

  const batch: BatchImage[] = [];
  for (const [index, source] of sources.entries()) {
    deps.progress?.show(`Reading images ${index + 1}/${sources.length}…`);
    try {
      batch.push(await loadImage(source, deps.codec));
    } catch (error) {
      if (!(error instanceof UnsupportedImageError)) throw error;
      deps.err(`Skipped ${source.name}: it could not be read as an image.`);
    }
  }
  return batch;
};

const bind = async (options: BindOptions, deps: CliDeps) => {
  const userPresets = deps.presets.load();
  let adjustments = resolveAdjustments(userPresets, options.preset, options.adjustments);
  // Validates the name before doing any work.
  if (options.savePreset !== undefined) savePreset(userPresets, options.savePreset, adjustments);

  const loaded = await loadBatch(listedOrder(options.files, options.order), deps);
  let session: Session = {
    batch: options.order.kind === "date" ? sortByDate(loaded) : loaded,
    adjustments,
    pageSize: options.pageSize,
    output: options.output,
  };
  if (options.interactive) {
    deps.progress?.clear();
    if (!deps.interact) throw new CliError("Interactive mode needs a terminal.");
    session = await deps.interact(session, deps.presets);
    adjustments = session.adjustments;
  }

  // Each adjusted page goes into the PDF as soon as it is ready, so adjusted copies don't pile up.
  const builder = await createPdfBuilder({ pageSize: session.pageSize });
  const pages = session.batch.length;
  await eachInOrder(
    session.batch,
    PARALLEL_PAGES,
    (image) => adjustImage(image, adjustments, deps.codec),
    async (page, index) => {
      deps.progress?.show(`Adjusting page ${index + 1}/${pages}…`);
      await builder.addPage(page);
    },
  );
  deps.progress?.show("Building the PDF…");
  const pdf = await builder.save();
  deps.progress?.show(`Writing ${session.output}…`);
  await deps.writeFile(session.output, pdf);
  deps.progress?.clear();
  deps.out(`Wrote ${session.output} (${pages} ${pages === 1 ? "page" : "pages"}).`);

  if (options.savePreset !== undefined) {
    deps.presets.store(savePreset(deps.presets.load(), options.savePreset, adjustments));
    deps.out(`Saved preset "${options.savePreset.trim()}".`);
  }
};

const listPresets = (deps: CliDeps) => {
  const userPresets = deps.presets.load();
  const all = [...BUILT_IN_PRESETS, ...userPresets];
  const slugWidth = Math.max(...all.map((preset) => presetSlug(preset.name).length));
  const nameWidth = Math.max(...all.map((preset) => preset.name.length));
  const line = (preset: Preset) =>
    `  ${presetSlug(preset.name).padEnd(slugWidth)} ${preset.name.padEnd(nameWidth)}  ${describeAdjustments(preset)}`;

  deps.out("Built-in:");
  BUILT_IN_PRESETS.forEach((preset) => deps.out(line(preset)));
  if (userPresets.length > 0) {
    deps.out("Saved:");
    userPresets.forEach((preset) => deps.out(line(preset)));
  }
};

const removePreset = (query: string, deps: CliDeps) => {
  const userPresets = deps.presets.load();
  const preset = findPreset([...BUILT_IN_PRESETS, ...userPresets], query);
  if (preset && isBuiltIn(preset)) throw new CliError(`"${preset.name}" is a built-in preset and can't be deleted.`);
  if (!preset) throw new CliError(`No saved preset named "${query}".`);
  deps.presets.store(deletePreset(userPresets, preset.name));
  deps.out(`Deleted preset "${preset.name}".`);
};

/** Runs the CLI and returns its exit code: 0 done, 1 failed, 2 wrong usage, 130 cancelled. */
export const runCli = async (argv: readonly string[], deps: CliDeps): Promise<number> => {
  let command;
  try {
    command = parseCliArgs(argv);
  } catch (error) {
    if (!(error instanceof UsageError)) throw error;
    deps.err(`Error: ${error.message}`);
    deps.err("Run bindpdf --help for usage.");
    return 2;
  }

  try {
    if (command.kind === "help") deps.out(HELP);
    if (command.kind === "version") deps.out(deps.version);
    if (command.kind === "list-presets") listPresets(deps);
    if (command.kind === "delete-preset") removePreset(command.name, deps);
    if (command.kind === "bind") await bind(command.options, deps);
    return 0;
  } catch (error) {
    deps.progress?.clear();
    if (error instanceof CancelledError) {
      deps.err(error.message);
      return 130;
    }
    deps.err(`Error: ${(error as Error).message}`);
    return error instanceof UsageError || error instanceof InvalidPresetNameError ? 2 : 1;
  }
};
