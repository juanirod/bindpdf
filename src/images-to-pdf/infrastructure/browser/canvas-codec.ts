import type { ImageFormat } from "../../domain/batch";
import type { ImageCodec } from "../../application/ports";

const MIME = { png: "image/png", jpg: "image/jpeg" } as const;
const JPEG_QUALITY = 92;

const canvasOf = (width: number, height: number) => {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return { canvas, context: canvas.getContext("2d", { willReadFrequently: true })! };
};

/** Decodes with the browser's own image support and encodes through a canvas. */
export const canvasCodec: ImageCodec = {
  decode: async (bytes, type, { maxSize } = {}) => {
    // Explicit, since older browsers ignored the EXIF orientation by default.
    const bitmap = await createImageBitmap(new Blob([bytes], type ? { type } : {}), { imageOrientation: "from-image" });
    const scale = maxSize === undefined ? 1 : Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
    const { context, canvas } = canvasOf(
      Math.max(1, Math.round(bitmap.width * scale)),
      Math.max(1, Math.round(bitmap.height * scale)),
    );
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const { width, height, data } = context.getImageData(0, 0, canvas.width, canvas.height);
    return { width, height, data };
  },

  encode: async ({ width, height, data }, format: ImageFormat, { quality = JPEG_QUALITY } = {}) => {
    const { canvas, context } = canvasOf(width, height);
    context.putImageData(new ImageData(new Uint8ClampedArray(data), width, height), 0, 0);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, MIME[format], quality / 100),
    );
    if (!blob) throw new Error("The image couldn't be encoded.");
    return new Uint8Array(await blob.arrayBuffer());
  },
};
