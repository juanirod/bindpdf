import { PDFDocument } from "pdf-lib";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { NEUTRAL } from "../domain/adjustments";
import type { BatchImage } from "../domain/batch";
import { sharpCodec } from "../infrastructure/node/sharp-codec";
import { EmptyBatchError } from "./build-pdf";
import { makePdf } from "./make-pdf";

const jpg = async (id: string, width: number): Promise<BatchImage> => ({
  id,
  name: `${id}.jpg`,
  bytes: new Uint8Array(
    await sharp({ create: { width, height: 100, channels: 3, background: "#c84" } }).jpeg().toBuffer(),
  ),
  format: "jpg",
  takenAt: 0,
});

describe("makePdf", () => {
  it("adds one page per image in order, applying adjustments and compression, and reports each page", async () => {
    const batch = [await jpg("a", 400), await jpg("b", 200), await jpg("c", 300)];
    const reported: string[] = [];
    const bytes = await makePdf(
      batch,
      { adjustments: { ...NEUTRAL, contrast: 130 }, compression: { maxSize: 200 }, pageSize: "image" },
      sharpCodec,
      (done, total) => reported.push(`${done}/${total}`),
    );

    const widths = (await PDFDocument.load(bytes)).getPages().map((page) => page.getWidth());
    expect(widths).toEqual([200, 200, 200]);
    expect(reported).toEqual(["1/3", "2/3", "3/3"]);
  });

  it("keeps images as they are without adjustments or compression", async () => {
    const batch = [await jpg("a", 400)];
    const bytes = await makePdf(batch, { adjustments: NEUTRAL, compression: {}, pageSize: "a4" }, sharpCodec);
    const [page] = (await PDFDocument.load(bytes)).getPages();
    expect(page.getWidth()).toBeGreaterThan(page.getHeight());
  });

  it("rejects an empty batch", async () => {
    await expect(
      makePdf([], { adjustments: NEUTRAL, compression: {}, pageSize: "image" }, sharpCodec),
    ).rejects.toBeInstanceOf(EmptyBatchError);
  });
});
