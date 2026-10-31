import sharp from "sharp";
import { describe, expect, it } from "vitest";
import type { ImageCodec, RawImage } from "./ports";
import { loadImage, UnsupportedImageError } from "./load-image";

const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 2]);
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0]);
const WEBP = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]);
const RAW: RawImage = { width: 1, height: 1, data: new Uint8ClampedArray([1, 2, 3, 255]) };
const ENCODED = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 1]);

const fakeCodec = (calls: string[] = []): ImageCodec => ({
  decode: async (_bytes, type) => {
    calls.push(`decode ${type}`);
    return RAW;
  },
  encode: async (image, format) => {
    calls.push(`encode ${format} ${image === RAW}`);
    return ENCODED;
  },
});

const brokenCodec: ImageCodec = {
  decode: () => Promise.reject(new Error("unknown format")),
  encode: () => Promise.reject(new Error("unused")),
};

describe("loadImage", () => {
  it("keeps JPEG bytes as they are and falls back to the file date without EXIF", async () => {
    const calls: string[] = [];
    const image = await loadImage({ name: "a.jpg", bytes: JPEG, lastModified: 42 }, fakeCodec(calls));
    expect(image).toMatchObject({ name: "a.jpg", format: "jpg", bytes: JPEG, takenAt: 42 });
    expect(image.id).toEqual(expect.any(String));
    expect(calls).toEqual([]);
  });

  it("turns rotated JPEGs upright through the codec, keeping their EXIF date", async () => {
    const calls: string[] = [];
    const rotated = new Uint8Array(
      await sharp({ create: { width: 4, height: 2, channels: 3, background: "#c84" } })
        .jpeg()
        .withExif({ IFD2: { DateTimeOriginal: "2024:03:15 14:30:05" } })
        .withMetadata({ orientation: 6 })
        .toBuffer(),
    );
    const image = await loadImage({ name: "r.jpg", bytes: rotated, lastModified: 0 }, fakeCodec(calls));
    expect(image).toMatchObject({ format: "jpg", bytes: ENCODED, takenAt: new Date(2024, 2, 15, 14, 30, 5).getTime() });
    expect(calls).toEqual(["decode image/jpeg", "encode jpg true"]);
  });

  it("rejects a rotated JPEG the codec can't open with UnsupportedImageError", async () => {
    const rotated = new Uint8Array(
      await sharp({ create: { width: 4, height: 2, channels: 3, background: "#c84" } })
        .jpeg()
        .withMetadata({ orientation: 6 })
        .toBuffer(),
    );
    const loading = loadImage({ name: "r.jpg", bytes: rotated, lastModified: 0 }, brokenCodec);
    await expect(loading).rejects.toMatchObject({ name: "UnsupportedImageError", fileName: "r.jpg" });
  });

  it("keeps PNG bytes as they are, dated by the file", async () => {
    const image = await loadImage({ name: "a.png", bytes: PNG, lastModified: 7 }, fakeCodec());
    expect(image).toMatchObject({ format: "png", bytes: PNG, takenAt: 7 });
  });

  it("detects the format from the bytes, not the name", async () => {
    const image = await loadImage({ name: "photo.png", bytes: JPEG, lastModified: 0 }, fakeCodec());
    expect(image.format).toBe("jpg");
  });

  it("converts other formats to PNG through the codec", async () => {
    const calls: string[] = [];
    const image = await loadImage(
      { name: "a.webp", bytes: WEBP, lastModified: 3, type: "image/webp" },
      fakeCodec(calls),
    );
    expect(image).toMatchObject({ format: "png", bytes: ENCODED, takenAt: 3 });
    expect(calls).toEqual(["decode image/webp", "encode png true"]);
  });

  it("rejects with UnsupportedImageError naming the file when the codec can't open it", async () => {
    const loading = loadImage({ name: "notes.txt", bytes: new Uint8Array([1, 2]), lastModified: 0 }, brokenCodec);
    await expect(loading).rejects.toThrow(UnsupportedImageError);
    await expect(loading).rejects.toMatchObject({ fileName: "notes.txt" });
  });

  it("gives every image its own id", async () => {
    const source = { name: "a.png", bytes: PNG, lastModified: 0 };
    const [a, b] = await Promise.all([loadImage(source, fakeCodec()), loadImage(source, fakeCodec())]);
    expect(a.id).not.toBe(b.id);
  });
});
