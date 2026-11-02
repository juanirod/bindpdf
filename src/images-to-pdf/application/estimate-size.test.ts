import { describe, expect, it } from "vitest";
import { NEUTRAL } from "../domain/adjustments";
import type { BatchImage } from "../domain/batch";
import { estimatePdfSize } from "./estimate-size";
import type { ImageCodec } from "./ports";

const jpg = (id: string, size: number): BatchImage => ({
  id,
  name: `${id}.jpg`,
  bytes: new Uint8Array(size),
  format: "jpg",
  takenAt: 0,
});

// Encodes every image to a quarter of its original size, and records which ones it saw.
const quarterCodec = (seen: number[] = []): ImageCodec => ({
  decode: async (bytes) => {
    seen.push(bytes.length);
    // Carries the original size in `width`, so encode can return a quarter of it.
    return { width: bytes.length, height: 1, data: new Uint8ClampedArray(4) };
  },
  encode: async (raw) => new Uint8Array(raw.width / 4),
});

const failingCodec: ImageCodec = {
  decode: () => Promise.reject(new Error("should not decode")),
  encode: () => Promise.reject(new Error("should not encode")),
};

describe("estimatePdfSize", () => {
  it("adds up the image sizes when pages go in as they are, without decoding", async () => {
    const batch = [jpg("a", 100), jpg("b", 60)];
    await expect(estimatePdfSize(batch, NEUTRAL, {}, failingCodec)).resolves.toBe(160);
  });

  it("extrapolates from at most 3 samples spread over the batch", async () => {
    const seen: number[] = [];
    const batch = [10, 20, 30, 40, 50, 60, 70].map((size, i) => jpg(String(i), size * 4));
    const estimate = await estimatePdfSize(batch, NEUTRAL, { quality: 50 }, quarterCodec(seen));
    expect(seen).toEqual([40, 160, 280]);
    expect(estimate).toBe(280);
  });

  it("samples every image of a small batch, and counts adjustments as re-encoding", async () => {
    const seen: number[] = [];
    const batch = [jpg("a", 40), jpg("b", 80)];
    const adjusted = { ...NEUTRAL, contrast: 130 };
    await expect(estimatePdfSize(batch, adjusted, {}, quarterCodec(seen))).resolves.toBe(30);
    expect(seen).toEqual([40, 80]);
  });

  it("estimates an empty batch as 0", async () => {
    await expect(estimatePdfSize([], NEUTRAL, { quality: 50 }, failingCodec)).resolves.toBe(0);
  });
});

describe("estimatePdfSize with PDFs", () => {
  const pdf = (id: string, size: number): BatchImage => ({
    id,
    name: `${id}.pdf`,
    bytes: new Uint8Array(size),
    format: "pdf",
    pages: 1,
    takenAt: 0,
  });

  it("counts PDFs as they are and samples only the images", async () => {
    const seen: number[] = [];
    const batch = [pdf("p", 1000), jpg("a", 40), jpg("b", 80)];
    await expect(estimatePdfSize(batch, NEUTRAL, { quality: 50 }, quarterCodec(seen))).resolves.toBe(1030);
    expect(seen).toEqual([40, 80]);
  });

  it("counts a batch of only PDFs as they are, without decoding", async () => {
    await expect(estimatePdfSize([pdf("p", 500)], NEUTRAL, { quality: 50 }, failingCodec)).resolves.toBe(500);
  });
});
