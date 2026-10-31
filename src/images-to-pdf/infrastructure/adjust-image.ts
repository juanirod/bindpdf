import { adjustPixels, isNeutral, type Adjustments } from "../domain/adjustments";
import type { BatchImage } from "../domain/batch";

const MIME = { png: "image/png", jpg: "image/jpeg" } as const;
const JPEG_QUALITY = 0.92;

/** Returns a copy of the image with the adjustments baked into its pixels, keeping its format. */
export const adjustImage = async (image: BatchImage, adjustments: Adjustments): Promise<BatchImage> => {
  if (isNeutral(adjustments)) return image;

  const bitmap = await createImageBitmap(new Blob([image.bytes], { type: MIME[image.format] }));
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const context = canvas.getContext("2d", { willReadFrequently: true })!;
  context.drawImage(bitmap, 0, 0);
  bitmap.close();

  const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
  adjustPixels(pixels.data, adjustments);
  context.putImageData(pixels, 0, 0);

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, MIME[image.format], JPEG_QUALITY),
  );
  if (!blob) throw new Error(`${image.name} couldn't be adjusted.`);
  return { ...image, bytes: new Uint8Array(await blob.arrayBuffer()) };
};
