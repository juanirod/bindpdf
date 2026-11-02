import { parseArgs } from "node:util";
import type { PageSize } from "../application/build-pdf";
import { ADJUSTMENT_RANGES, type Adjustments } from "../domain/adjustments";

export type Order =
  | { readonly kind: "given" }
  | { readonly kind: "date" }
  /** 0-based positions of the listed images, in page order. */
  | { readonly kind: "manual"; readonly positions: readonly number[] };

export interface BindOptions {
  readonly files: readonly string[];
  readonly order: Order;
  /** Preset to start from, by name or slug. */
  readonly preset?: string;
  /** Explicit values, applied over the preset. */
  readonly adjustments: Partial<Adjustments>;
  readonly savePreset?: string;
  readonly output: string;
  readonly pageSize: PageSize;
  /** JPEG quality, 1 to 100, for re-encoded pages. */
  readonly quality?: number;
  /** Longest side, in pixels, that pages are shrunk to. */
  readonly maxSize?: number;
  readonly interactive: boolean;
}

export type CliCommand =
  | { readonly kind: "help" }
  | { readonly kind: "version" }
  | { readonly kind: "list-presets" }
  | { readonly kind: "delete-preset"; readonly name: string }
  | { readonly kind: "bind"; readonly options: BindOptions };

export class UsageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UsageError";
  }
}

export const HELP = `Usage: bindpdf [options] <files...>

Turn images into one PDF, one page per image, in the order you list them.
PDFs can be listed too: their pages go in as they are, whatever the adjustments and output options.

Order:
  -s, --sort date            Sort by when each photo was taken or PDF created, else the file's date
      --order <list>         Manual order of the listed files, e.g. 3,1,2

Adjustments (applied to every image):
  -p, --preset <name>        Start from a preset (see --list-presets)
  -b, --brightness <n>       50 to 150, 100 leaves the image unchanged
  -c, --contrast <n>         50 to 200, 100 leaves the image unchanged
      --saturation <n>       0 to 200, 0 is black & white
      --save-preset <name>   Save the resulting adjustments as a preset

Output:
  -o, --output <file>        PDF to write (default: images.pdf)
      --page-size <size>     image (default), a4 or letter
      --max-size <px>        Shrink images whose longest side is larger (100 to 20000)
      --quality <n>          JPEG quality from 1 to 100 (default 92); re-encodes every JPEG

Other:
  -i, --interactive          Choose order, adjustments, PDF size and output step by step
      --list-presets         List built-in and saved presets
      --delete-preset <name> Delete a saved preset
  -h, --help                 Show this help
  -v, --version              Show the version

Examples:
  bindpdf *.jpg --sort date --preset scanned-black-white -o book.pdf
  bindpdf cover.png page-*.jpg --brightness 110 --contrast 130
  bindpdf cover.jpg contract.pdf scans/*.jpg -o all.pdf
  bindpdf *.jpg --max-size 1600 --quality 75 -o smaller.pdf
  bindpdf -i *.jpg
`;

const SORTS = ["date"] as const;
const PAGE_SIZES: readonly PageSize[] = ["image", "a4", "letter"];

const oneOf = <T extends string>(value: string, allowed: readonly T[], label: string): T => {
  if ((allowed as readonly string[]).includes(value)) return value as T;
  throw new UsageError(`Unknown ${label} "${value}". Use: ${allowed.join(", ")}.`);
};

const wholeNumber = (flag: string, raw: string, [min, max]: readonly [number, number]) => {
  const value = Number(raw);
  if (!/^\d+$/.test(raw.trim()) || value < min || value > max) {
    throw new UsageError(`--${flag} must be a whole number from ${min} to ${max}.`);
  }
  return value;
};

const QUALITY_RANGE = [1, 100] as const;
const MAX_SIZE_RANGE = [100, 20000] as const;

const adjustment = (key: keyof Adjustments, raw: string | undefined) =>
  raw === undefined ? {} : { [key]: wholeNumber(key, raw, ADJUSTMENT_RANGES[key]) };

const manualOrder = (raw: string, count: number): Order => {
  const positions = raw.split(",").map((part) => Number(part.trim()) - 1);
  const valid =
    positions.length === count &&
    new Set(positions).size === count &&
    positions.every((position) => Number.isInteger(position) && position >= 0 && position < count);
  if (!valid) {
    const example = Array.from({ length: count }, (_, i) => count - i).join(",");
    throw new UsageError(`--order must list each of the ${count} images once, e.g. ${example}.`);
  }
  return { kind: "manual", positions };
};

export const withPdfExtension = (file: string) => (/\.pdf$/i.test(file) ? file : `${file}.pdf`);

const parse = (argv: readonly string[]) => {
  try {
    return parseArgs({
      args: [...argv],
      allowPositionals: true,
      options: {
        sort: { type: "string", short: "s" },
        order: { type: "string" },
        preset: { type: "string", short: "p" },
        brightness: { type: "string", short: "b" },
        contrast: { type: "string", short: "c" },
        saturation: { type: "string" },
        "save-preset": { type: "string" },
        output: { type: "string", short: "o", default: "images.pdf" },
        "page-size": { type: "string", default: "image" },
        "max-size": { type: "string" },
        quality: { type: "string" },
        interactive: { type: "boolean", short: "i", default: false },
        "list-presets": { type: "boolean", default: false },
        "delete-preset": { type: "string" },
        help: { type: "boolean", short: "h", default: false },
        version: { type: "boolean", short: "v", default: false },
      },
    });
  } catch (error) {
    throw new UsageError((error as Error).message);
  }
};

export const parseCliArgs = (argv: readonly string[]): CliCommand => {
  if (argv.length === 0) return { kind: "help" };
  const { values, positionals: files } = parse(argv);

  if (values.help) return { kind: "help" };
  if (values.version) return { kind: "version" };
  if (values["list-presets"]) return { kind: "list-presets" };
  if (values["delete-preset"] !== undefined) return { kind: "delete-preset", name: values["delete-preset"] };

  if (files.length === 0) throw new UsageError("Pass at least one image.");
  if (values.sort !== undefined && values.order !== undefined) {
    throw new UsageError("Use either --sort or --order, not both.");
  }

  const order: Order =
    values.order !== undefined
      ? manualOrder(values.order, files.length)
      : values.sort !== undefined
        ? { kind: oneOf(values.sort, SORTS, "sort") }
        : { kind: "given" };

  return {
    kind: "bind",
    options: {
      files,
      order,
      ...(values.preset !== undefined && { preset: values.preset }),
      adjustments: {
        ...adjustment("brightness", values.brightness),
        ...adjustment("contrast", values.contrast),
        ...adjustment("saturation", values.saturation),
      },
      ...(values["save-preset"] !== undefined && { savePreset: values["save-preset"] }),
      output: withPdfExtension(values.output),
      pageSize: oneOf(values["page-size"], PAGE_SIZES, "page size"),
      ...(values.quality !== undefined && { quality: wholeNumber("quality", values.quality, QUALITY_RANGE) }),
      ...(values["max-size"] !== undefined && {
        maxSize: wholeNumber("max-size", values["max-size"], MAX_SIZE_RANGE),
      }),
      interactive: values.interactive,
    },
  };
};
