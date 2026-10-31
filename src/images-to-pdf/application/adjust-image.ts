import { adjustPixels, isNeutral, type Adjustments } from "../domain/adjustments";
import type { BatchImage } from "../domain/batch";
import type { ImageCodec } from "./ports";

const MIME = { png: "image/png", jpg: "image/jpeg" } as const;

/** Returns a copy of the image with the adjustments baked into its pixels, keeping its format. */
export const adjustImage = async (
  image: BatchImage,
  adjustments: Adjustments,
  codec: ImageCodec,
): Promise<BatchImage> => {
  if (isNeutral(adjustments)) return image;

  const raw = await codec.decode(image.bytes, MIME[image.format]);
  adjustPixels(raw.data, adjustments);
  return { ...image, bytes: await codec.encode(raw, image.format) };
};
