import { isNeutral, type Adjustments } from "../domain/adjustments";
import type { BatchImage } from "../domain/batch";
import { adjustImage, type OutputOptions } from "./adjust-image";
import type { ImageCodec } from "./ports";

const SAMPLES = 3;

/** Up to `count` indexes spread evenly from the first image to the last. */
const sampleIndexes = (length: number, count: number) => {
  if (length <= count) return Array.from({ length }, (_, i) => i);
  return Array.from({ length: count }, (_, i) => Math.round((i * (length - 1)) / (count - 1)));
};

/**
 * Estimates the PDF's size in bytes. PDFs and images that go in as they are add up exactly; otherwise a few
 * images spread over the batch are processed and the rest are assumed to shrink by the same ratio.
 */
export const estimatePdfSize = async (
  batch: readonly BatchImage[],
  adjustments: Adjustments,
  output: OutputOptions,
  codec: ImageCodec,
): Promise<number> => {
  const bytesOf = (items: readonly BatchImage[]) => items.reduce((sum, item) => sum + item.bytes.length, 0);
  const images = batch.filter((item) => item.format !== "pdf");
  const pdfs = bytesOf(batch) - bytesOf(images);
  const total = bytesOf(images);
  const unchanged = isNeutral(adjustments) && output.maxSize === undefined && output.quality === undefined;
  if (unchanged || images.length === 0) return pdfs + total;

  let before = 0;
  let after = 0;
  for (const index of sampleIndexes(images.length, SAMPLES)) {
    const image = images[index];
    before += image.bytes.length;
    after += (await adjustImage(image, adjustments, codec, output)).bytes.length;
  }
  return pdfs + (before === 0 ? 0 : Math.round(total * (after / before)));
};
