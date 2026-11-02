import { crc32, deflateSync } from "node:zlib";
import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";
import type { BatchImage } from "../domain/batch";
import { buildPdf, createPdfBuilder, EmptyBatchError, fitImage } from "./build-pdf";
import { makePdfFixture } from "./pdf-fixture";

// Builds a valid grayscale PNG of the given size, so fixtures stay readable.
const makePng = (width: number, height: number): Uint8Array<ArrayBuffer> => {
  const chunk = (type: string, data: Buffer) => {
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(body));
    return Buffer.concat([length, body, crc]);
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8; // bit depth
  header[9] = 0; // grayscale
  const rows = Buffer.alloc((width + 1) * height); // filter byte + pixels per row
  return new Uint8Array(
    Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      chunk("IHDR", header),
      chunk("IDAT", deflateSync(rows)),
      chunk("IEND", Buffer.alloc(0)),
    ]),
  );
};

const png = (id: string, width: number, height: number): BatchImage => ({
  id,
  name: `${id}.png`,
  bytes: makePng(width, height),
  format: "png",
  takenAt: 0,
});

describe("buildPdf", () => {
  it("creates one page per image, in batch order, sized to each image", async () => {
    const bytes = await buildPdf([png("wide", 2, 1), png("square", 1, 1)]);

    const pdf = await PDFDocument.load(bytes);
    const sizes = pdf.getPages().map((page) => page.getSize());
    expect(sizes).toEqual([
      { width: 2, height: 1 },
      { width: 1, height: 1 },
    ]);
  });

  it("rejects an empty batch", async () => {
    await expect(buildPdf([])).rejects.toBeInstanceOf(EmptyBatchError);
  });

  it("uses A4 pages, turned to match each image's orientation", async () => {
    const bytes = await buildPdf([png("tall", 1, 2), png("wide", 2, 1), png("square", 1, 1)], {
      pageSize: "a4",
    });

    const pdf = await PDFDocument.load(bytes);
    const sizes = pdf.getPages().map((page) => page.getSize());
    expect(sizes).toEqual([
      { width: 595.28, height: 841.89 },
      { width: 841.89, height: 595.28 },
      { width: 595.28, height: 841.89 },
    ]);
  });

  it("uses Letter pages", async () => {
    const pdf = await PDFDocument.load(await buildPdf([png("tall", 1, 2)], { pageSize: "letter" }));
    expect(pdf.getPage(0).getSize()).toEqual({ width: 612, height: 792 });
  });
});

describe("createPdfBuilder", () => {
  it("adds pages one at a time, in the order they are added", async () => {
    const builder = await createPdfBuilder({ pageSize: "a4" });
    await builder.addPage(png("tall", 1, 2));
    await builder.addPage(png("wide", 2, 1));

    const pdf = await PDFDocument.load(await builder.save());
    expect(pdf.getPages().map((page) => page.getWidth() > page.getHeight())).toEqual([false, true]);
  });

  it("rejects saving with no pages", async () => {
    const builder = await createPdfBuilder();
    await expect(builder.save()).rejects.toBeInstanceOf(EmptyBatchError);
  });
});

describe("fitImage", () => {
  it("scales the image to fit the page without distortion and centers it", () => {
    expect(fitImage({ width: 100, height: 50 }, { width: 400, height: 400 })).toEqual({
      x: 0,
      y: 100,
      width: 400,
      height: 200,
    });
    expect(fitImage({ width: 1000, height: 2000 }, { width: 300, height: 300 })).toEqual({
      x: 75,
      y: 0,
      width: 150,
      height: 300,
    });
  });
});

describe("buildPdf with PDFs", () => {
  const pdf = async (id: string, sizes: readonly (readonly [number, number])[]): Promise<BatchImage> => ({
    id,
    name: `${id}.pdf`,
    bytes: await makePdfFixture(sizes),
    format: "pdf",
    pages: sizes.length,
    takenAt: 0,
  });

  it("copies every page of each PDF in place, keeping their own sizes even on paper sizes", async () => {
    const batch = [png("cover", 2, 1), await pdf("contract", [[300, 400], [500, 200]]), png("end", 1, 1)];
    const built = await PDFDocument.load(await buildPdf(batch, { pageSize: "a4" }));
    const sizes = built.getPages().map((page) => page.getSize());
    expect(sizes).toEqual([
      { width: 841.89, height: 595.28 },
      { width: 300, height: 400 },
      { width: 500, height: 200 },
      { width: 595.28, height: 841.89 },
    ]);
  });

  it("builds a PDF from PDFs alone", async () => {
    const built = await PDFDocument.load(await buildPdf([await pdf("a", [[100, 100]]), await pdf("b", [[200, 100]])]));
    expect(built.getPageCount()).toBe(2);
  });
});
