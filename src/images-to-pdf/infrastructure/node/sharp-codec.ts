import sharp from "sharp";
import type { ImageCodec } from "../../application/ports";

const JPEG_QUALITY = 92;

/** Copies into a standalone, exactly sized ArrayBuffer, which the `Uint8Array<ArrayBuffer>` port type requires. */
const toBytes = (buffer: Buffer) => new Uint8Array(buffer);

/** Decodes and encodes with sharp (libvips): JPEG, PNG, WebP, GIF, TIFF, AVIF and more. */
export const sharpCodec: ImageCodec = {
  decode: async (bytes) => {
    const { data, info } = await sharp(bytes).rotate().ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    // A view, not a copy: sharp hands back each output in its own allocation, and pixels are the largest buffer here.
    return { width: info.width, height: info.height, data: new Uint8ClampedArray(data.buffer, data.byteOffset, data.length) };
  },

  encode: async ({ width, height, data }, format) => {
    const image = sharp(data, { raw: { width, height, channels: 4 } });
    const encoded = format === "png" ? image.png() : image.jpeg({ quality: JPEG_QUALITY });
    return toBytes(await encoded.toBuffer());
  },
};
