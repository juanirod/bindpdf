import { adjustPixels, isNeutral, type Adjustments } from "../domain/adjustments";
import type { BatchImage } from "../domain/batch";
import type { DecodeOptions, EncodeOptions, ImageCodec } from "./ports";

/** How pages are re-encoded; leaving both out keeps images that need no adjustment as they are. */
export type OutputOptions = DecodeOptions & EncodeOptions;

const MIME = { png: "image/png", jpg: "image/jpeg" } as const;

/**
 * Returns a copy of the image with the adjustments baked into its pixels, keeping its format,
 * shrunk to `maxSize` and encoded at `quality` when given. PDFs are returned as they are.
 */
export const adjustImage = async (
  image: BatchImage,
  adjustments: Adjustments,
  codec: ImageCodec,
  { maxSize, quality }: OutputOptions = {},
): Promise<BatchImage> => {
  if (image.format === "pdf") return image;
  if (isNeutral(adjustments) && maxSize === undefined && quality === undefined) return image;

  // Shrinking while decoding means fewer pixels to adjust and encode.
  const raw = await codec.decode(image.bytes, MIME[image.format], { maxSize });
  adjustPixels(raw.data, adjustments);
  return { ...image, bytes: await codec.encode(raw, image.format, { quality }) };
};
