import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { loadImage, UnsupportedImageError } from "../../application/load-image";
import { sharpCodec } from "./sharp-codec";

const solid = (format: "webp" | "jpeg", options: object = {}) =>
  sharp({ create: { width: 3, height: 2, channels: 3, background: { r: 200, g: 40, b: 10 } } })
    [format](options)
    .toBuffer()
    .then((buffer) => new Uint8Array(buffer));

describe("sharpCodec", () => {
  it("decodes to RGBA pixels and encodes them back to PNG and JPEG", async () => {
    const raw = await sharpCodec.decode(await solid("webp", { lossless: true }));
    expect(raw).toMatchObject({ width: 3, height: 2 });
    expect(raw.data.length).toBe(3 * 2 * 4);
    expect([...raw.data.slice(0, 4)]).toEqual([200, 40, 10, 255]);

    const png = await sharpCodec.encode(raw, "png");
    expect((await sharp(png).metadata()).format).toBe("png");
    const jpg = await sharpCodec.encode(raw, "jpg");
    expect((await sharp(jpg).metadata()).format).toBe("jpeg");
  });

  it("shrinks to fit maxSize on its longest side, keeping proportions, and never enlarges", async () => {
    const big = new Uint8Array(
      await sharp({ create: { width: 400, height: 200, channels: 3, background: "#c84" } }).png().toBuffer(),
    );
    expect(await sharpCodec.decode(big, undefined, { maxSize: 100 })).toMatchObject({ width: 100, height: 50 });
    expect(await sharpCodec.decode(big, undefined, { maxSize: 1000 })).toMatchObject({ width: 400, height: 200 });
  });

  it("encodes JPEG at the requested quality", async () => {
    const noisy = await sharp({ create: { width: 64, height: 64, channels: 3, background: "#808080", noise: { type: "gaussian", mean: 128, sigma: 60 } } })
      .png()
      .toBuffer();
    const raw = await sharpCodec.decode(new Uint8Array(noisy));
    const low = await sharpCodec.encode(raw, "jpg", { quality: 20 });
    const normal = await sharpCodec.encode(raw, "jpg");
    expect(low.length).toBeLessThan(normal.length);
  });

  it("rejects bytes that aren't an image", async () => {
    await expect(sharpCodec.decode(new Uint8Array([1, 2, 3]))).rejects.toThrow();
  });

  it("lets loadImage convert WebP to PNG and report unreadable files", async () => {
    const image = await loadImage({ name: "a.webp", bytes: await solid("webp"), lastModified: 1 }, sharpCodec);
    expect(image.format).toBe("png");
    expect((await sharp(image.bytes).metadata()).format).toBe("png");

    await expect(
      loadImage({ name: "notes.txt", bytes: new Uint8Array([1, 2, 3]), lastModified: 0 }, sharpCodec),
    ).rejects.toThrow(UnsupportedImageError);
  });

  it("lets loadImage date a real JPEG by its EXIF capture date", async () => {
    const bytes = await sharp(await solid("jpeg"))
      .withExif({ IFD2: { DateTimeOriginal: "2023:04:05 06:07:08" } })
      .jpeg()
      .toBuffer();
    const image = await loadImage({ name: "a.jpg", bytes: new Uint8Array(bytes), lastModified: 1 }, sharpCodec);
    expect(image.takenAt).toBe(new Date(2023, 3, 5, 6, 7, 8).getTime());
  });
});
