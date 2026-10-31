import { PDFDocument } from "pdf-lib";
import sharp from "sharp";
import { beforeAll, describe, expect, it } from "vitest";
import type { ImageSource } from "../application/load-image";
import type { ImageCodec, PresetStore } from "../application/ports";
import type { Preset } from "../domain/presets";
import { sharpCodec } from "../infrastructure/node/sharp-codec";
import { CancelledError, resolveAdjustments, runCli, type CliDeps, type Session } from "./run";

// Distinct sizes, so page order can be read back from the PDF.
const files = new Map<string, ImageSource>();
const image = async (name: string, width: number, lastModified: number, format: "png" | "jpeg" | "webp") => {
  const buffer = await sharp({ create: { width, height: 10, channels: 3, background: { r: 200, g: 40, b: 10 } } })
    [format]()
    .toBuffer();
  files.set(name, { name, bytes: new Uint8Array(buffer), lastModified });
};

beforeAll(async () => {
  await image("a.png", 10, 300, "png");
  await image("b.jpg", 20, 100, "jpeg");
  await image("c.webp", 30, 200, "webp");
  files.set("notes.txt", { name: "notes.txt", bytes: new Uint8Array([1, 2, 3]), lastModified: 0 });
});

const memoryStore = (initial: Preset[] = []): PresetStore & { saved: Preset[] } => {
  const store = {
    saved: initial,
    load: () => store.saved,
    store: (presets: readonly Preset[]) => {
      store.saved = [...presets];
    },
  };
  return store;
};

const setup = (overrides: Partial<CliDeps> = {}) => {
  const out: string[] = [];
  const err: string[] = [];
  const written = new Map<string, Uint8Array>();
  const encoded: Uint8ClampedArray[] = [];
  const codec: ImageCodec = {
    decode: sharpCodec.decode,
    encode: async (raw, format) => {
      encoded.push(raw.data);
      return sharpCodec.encode(raw, format);
    },
  };
  const deps: CliDeps = {
    codec,
    presets: memoryStore(),
    readImageFile: async (path) => {
      const file = files.get(path);
      if (!file) throw Object.assign(new Error(`ENOENT: ${path}`), { code: "ENOENT" });
      return file;
    },
    writeFile: async (path, bytes) => {
      written.set(path, bytes);
    },
    out: (line) => out.push(line),
    err: (line) => err.push(line),
    version: "1.2.3",
    ...overrides,
  };
  const pageWidths = async (path = "images.pdf") =>
    (await PDFDocument.load(written.get(path)!)).getPages().map((page) => page.getWidth());
  return { deps, out, err, written, encoded, pageWidths };
};

describe("runCli bind", () => {
  it("writes one page per image in the listed order", async () => {
    const { deps, out, err, pageWidths } = setup();
    expect(await runCli(["c.webp", "a.png", "b.jpg"], deps)).toBe(0);
    expect(await pageWidths()).toEqual([30, 10, 20]);
    expect(out).toEqual(["Wrote images.pdf (3 pages)."]);
    expect(err).toEqual([]);
  });

  it("sorts by date with --sort date", async () => {
    const { deps, pageWidths } = setup();
    expect(await runCli(["a.png", "b.jpg", "c.webp", "--sort", "date"], deps)).toBe(0);
    expect(await pageWidths()).toEqual([20, 30, 10]);
  });

  it("follows a manual --order", async () => {
    const { deps, pageWidths } = setup();
    expect(await runCli(["a.png", "b.jpg", "c.webp", "--order", "2,3,1", "-o", "out"], deps)).toBe(0);
    expect(await pageWidths("out.pdf")).toEqual([20, 30, 10]);
  });

  it("keeps a manual --order when a file is skipped", async () => {
    const { deps, pageWidths } = setup();
    expect(await runCli(["a.png", "notes.txt", "b.jpg", "--order", "3,2,1"], deps)).toBe(0);
    expect(await pageWidths()).toEqual([20, 10]);
  });

  it("uses the page size", async () => {
    const { deps, pageWidths } = setup();
    expect(await runCli(["a.png", "--page-size", "a4"], deps)).toBe(0);
    expect((await pageWidths())[0]).toBeCloseTo(595.28);
  });

  it("bakes adjustments into every page", async () => {
    const { deps, encoded } = setup();
    expect(await runCli(["a.png", "b.jpg", "--saturation", "0"], deps)).toBe(0);
    expect(encoded).toHaveLength(2);
    for (const data of encoded) expect(data[0]).toBe(data[1]);
  });

  it("leaves images untouched without adjustments", async () => {
    const { deps, encoded } = setup();
    expect(await runCli(["a.png", "b.jpg"], deps)).toBe(0);
    expect(encoded).toEqual([]);
  });

  it("skips files that aren't images, with a warning", async () => {
    const { deps, out, err, pageWidths } = setup();
    expect(await runCli(["a.png", "notes.txt"], deps)).toBe(0);
    expect(await pageWidths()).toEqual([10]);
    expect(err).toEqual(["Skipped notes.txt: it could not be read as an image."]);
    expect(out).toEqual(["Wrote images.pdf (1 page)."]);
  });

  it("fails when no image could be read", async () => {
    const { deps, err, written } = setup();
    expect(await runCli(["notes.txt"], deps)).toBe(1);
    expect(err.at(-1)).toBe("Error: Add at least one image before generating the PDF.");
    expect(written.size).toBe(0);
  });

  it("fails on a missing file", async () => {
    const { deps, err, written } = setup();
    expect(await runCli(["a.png", "missing.jpg"], deps)).toBe(1);
    expect(err).toEqual(["Error: missing.jpg doesn't exist."]);
    expect(written.size).toBe(0);
  });

  it("fails on an unknown preset", async () => {
    const { deps, err } = setup();
    expect(await runCli(["a.png", "-p", "sepia"], deps)).toBe(2);
    expect(err).toEqual(['Error: Unknown preset "sepia". See bindpdf --list-presets.']);
  });

  it("saves the resulting adjustments with --save-preset", async () => {
    const presets = memoryStore();
    const { deps, out } = setup({ presets });
    expect(await runCli(["a.png", "-p", "scanned-black-white", "-b", "120", "--save-preset", "Mine"], deps)).toBe(0);
    expect(presets.saved).toEqual([{ name: "Mine", adjustments: { brightness: 120, contrast: 145, saturation: 0 } }]);
    expect(out).toContain('Saved preset "Mine".');
  });

  it("refuses a built-in name for --save-preset before doing any work", async () => {
    const { deps, err, written } = setup();
    expect(await runCli(["a.png", "--save-preset", "original"], deps)).toBe(2);
    expect(err).toEqual(['Error: "original" is a built-in preset. Choose another name.']);
    expect(written.size).toBe(0);
  });

  it("lets interactive mode change the session before building", async () => {
    let received: Session | null = null;
    const { deps, pageWidths } = setup({
      interact: async (session) => {
        received = session;
        return { ...session, batch: [...session.batch].reverse(), output: "picked.pdf" };
      },
    });
    expect(await runCli(["a.png", "b.jpg", "-i", "-s", "date"], deps)).toBe(0);
    expect(received!.batch.map((image) => image.name)).toEqual(["b.jpg", "a.png"]);
    expect(received!).toMatchObject({ output: "images.pdf", pageSize: "image" });
    expect(await pageWidths("picked.pdf")).toEqual([10, 20]);
  });

  it("writes nothing when interactive mode is cancelled", async () => {
    const { deps, err, written } = setup({ interact: () => Promise.reject(new CancelledError()) });
    expect(await runCli(["a.png", "-i"], deps)).toBe(130);
    expect(err).toEqual(["Cancelled."]);
    expect(written.size).toBe(0);
  });

  it("refuses interactive mode without a terminal", async () => {
    const { deps, err, written } = setup();
    expect(await runCli(["a.png", "-i"], deps)).toBe(1);
    expect(err).toEqual(["Error: Interactive mode needs a terminal."]);
    expect(written.size).toBe(0);
  });
});

describe("runCli other commands", () => {
  it("prints help, version and usage errors", async () => {
    const { deps, out, err } = setup();
    expect(await runCli([], deps)).toBe(0);
    expect(out[0]).toMatch(/^Usage: bindpdf/);
    expect(await runCli(["-v"], deps)).toBe(0);
    expect(out.at(-1)).toBe("1.2.3");
    expect(await runCli(["--sort", "size", "a.png"], deps)).toBe(2);
    expect(err).toEqual(['Error: Unknown sort "size". Use: date.', "Run bindpdf --help for usage."]);
  });

  it("lists built-in and saved presets", async () => {
    const presets = memoryStore([{ name: "My Look", adjustments: { brightness: 90, contrast: 100, saturation: 50 } }]);
    const { deps, out } = setup({ presets });
    expect(await runCli(["--list-presets"], deps)).toBe(0);
    expect(out).toEqual([
      "Built-in:",
      "  original            Original                 brightness 100, contrast 100, saturation 100",
      "  scanned-black-white Scanned (black & white)  brightness 112, contrast 145, saturation 0",
      "  scanned-color       Scanned (color)          brightness 108, contrast 125, saturation 85",
      "Saved:",
      "  my-look             My Look                  brightness 90, contrast 100, saturation 50",
    ]);
  });

  it("deletes a saved preset by name or slug, and refuses others", async () => {
    const presets = memoryStore([{ name: "My Look", adjustments: { brightness: 90, contrast: 100, saturation: 50 } }]);
    const { deps, out, err } = setup({ presets });
    expect(await runCli(["--delete-preset", "original"], deps)).toBe(1);
    expect(await runCli(["--delete-preset", "nope"], deps)).toBe(1);
    expect(err).toEqual([
      'Error: "Original" is a built-in preset and can\'t be deleted.',
      'Error: No saved preset named "nope".',
    ]);
    expect(await runCli(["--delete-preset", "my-look"], deps)).toBe(0);
    expect(presets.saved).toEqual([]);
    expect(out).toEqual(['Deleted preset "My Look".']);
  });
});

describe("resolveAdjustments", () => {
  it("starts from neutral, then the preset, then explicit values", () => {
    expect(resolveAdjustments([], undefined, {})).toEqual({ brightness: 100, contrast: 100, saturation: 100 });
    expect(resolveAdjustments([], "Scanned (color)", { contrast: 150 })).toEqual({
      brightness: 108,
      contrast: 150,
      saturation: 85,
    });
  });
});
