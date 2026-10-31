import { describe, expect, it } from "vitest";
import { NEUTRAL } from "../domain/adjustments";
import type { BatchImage } from "../domain/batch";
import type { ImageCodec, RawImage } from "./ports";
import { adjustImage } from "./adjust-image";

const image: BatchImage = {
  id: "1",
  name: "a.jpg",
  bytes: new Uint8Array([0xff, 0xd8]),
  format: "jpg",
  takenAt: 5,
};

describe("adjustImage", () => {
  it("returns the same image without touching the codec when adjustments are neutral", async () => {
    const codec: ImageCodec = {
      decode: () => Promise.reject(new Error("should not decode")),
      encode: () => Promise.reject(new Error("should not encode")),
    };
    await expect(adjustImage(image, NEUTRAL, codec)).resolves.toBe(image);
  });

  it("bakes the adjustments into the pixels and re-encodes in the image's format", async () => {
    let encoded: { raw: RawImage; format: string } | null = null;
    const codec: ImageCodec = {
      decode: async (_bytes, type) => {
        expect(type).toBe("image/jpeg");
        return { width: 1, height: 1, data: new Uint8ClampedArray([100, 150, 200, 255]) };
      },
      encode: async (raw, format) => {
        encoded = { raw, format };
        return new Uint8Array([9]);
      },
    };

    const adjusted = await adjustImage(image, { brightness: 100, contrast: 100, saturation: 0 }, codec);

    expect(adjusted).toEqual({ ...image, bytes: new Uint8Array([9]) });
    expect(encoded!.format).toBe("jpg");
    const [r, g, b, a] = encoded!.raw.data;
    expect(r).toBe(g);
    expect(g).toBe(b);
    expect(a).toBe(255);
  });

  it("re-encodes at the requested size and quality even without adjustments", async () => {
    const calls: unknown[] = [];
    const raw: RawImage = { width: 1, height: 1, data: new Uint8ClampedArray([1, 2, 3, 255]) };
    const codec: ImageCodec = {
      decode: async (_bytes, type, options) => {
        calls.push(["decode", type, options]);
        return raw;
      },
      encode: async (_raw, format, options) => {
        calls.push(["encode", format, options]);
        return new Uint8Array([7]);
      },
    };

    const resized = await adjustImage(image, NEUTRAL, codec, { maxSize: 1000, quality: 60 });

    expect(resized).toEqual({ ...image, bytes: new Uint8Array([7]) });
    expect(calls).toEqual([
      ["decode", "image/jpeg", { maxSize: 1000 }],
      ["encode", "jpg", { quality: 60 }],
    ]);
  });
});
