import type { Adjustments } from "../domain/adjustments";
import type { BatchImage } from "../domain/batch";
import { adjustImage, type OutputOptions } from "./adjust-image";
import { createPdfBuilder, type PageSize } from "./build-pdf";
import { eachInOrder } from "./each-in-order";
import type { ImageCodec } from "./ports";

export interface MakePdfOptions {
  readonly adjustments: Adjustments;
  readonly compression: OutputOptions;
  readonly pageSize: PageSize;
}

/** Pages processed at once: each one in flight holds its decoded pixels. */
const PARALLEL_PAGES = 4;

/**
 * Builds the PDF from a batch: adjusts and compresses up to 4 pages at once, adding each to the PDF in order
 * as soon as it is ready, so processed copies don't pile up. `onPage` reports how many pages are in.
 */
export const makePdf = async (
  batch: readonly BatchImage[],
  { adjustments, compression, pageSize }: MakePdfOptions,
  codec: ImageCodec,
  onPage?: (done: number, total: number) => void,
): Promise<Uint8Array> => {
  const builder = await createPdfBuilder({ pageSize });
  await eachInOrder(
    batch,
    PARALLEL_PAGES,
    (image) => adjustImage(image, adjustments, codec, compression),
    async (page, index) => {
      await builder.addPage(page);
      onPage?.(index + 1, batch.length);
    },
  );
  return builder.save();
};
