import type { ImageFormat } from "../../domain/batch";
import type { ImageCodec } from "../../application/ports";

const MIME = { png: "image/png", jpg: "image/jpeg" } as const;
const JPEG_QUALITY = 0.92;

const canvasOf = (width: number, height: number) => {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return { canvas, context: canvas.getContext("2d", { willReadFrequently: true })! };
};

/** Decodes with the browser's own image support and encodes through a canvas. */
export const canvasCodec: ImageCodec = {
  decode: async (bytes, type) => {
    // Explicit, since older browsers ignored the EXIF orientation by default.
    const bitmap = await createImageBitmap(new Blob([bytes], type ? { type } : {}), { imageOrientation: "from-image" });
    const { context } = canvasOf(bitmap.width, bitmap.height);
    context.drawImage(bitmap, 0, 0);
    bitmap.close();
    const { width, height, data } = context.getImageData(0, 0, bitmap.width, bitmap.height);
    return { width, height, data };
  },

  encode: async ({ width, height, data }, format: ImageFormat) => {
    const { canvas, context } = canvasOf(width, height);
    context.putImageData(new ImageData(new Uint8ClampedArray(data), width, height), 0, 0);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, MIME[format], JPEG_QUALITY),
    );
    if (!blob) throw new Error("The image couldn't be encoded.");
    return new Uint8Array(await blob.arrayBuffer());
  },
};
