/** Formats pdf-lib can embed natively. Anything else is converted before entering the batch. */
export type ImageFormat = "png" | "jpg";

/** Clockwise quarter turns, in degrees. */
export type Rotation = 0 | 90 | 180 | 270;

interface BatchFile {
  readonly id: string;
  readonly name: string;
  readonly bytes: Uint8Array<ArrayBuffer>;
  /** When the photo was taken or the PDF created (ms since epoch), or the file's last-modified time when unknown. */
  readonly takenAt: number;
  /** Clockwise turn of its pages in the PDF; missing means upright. */
  readonly rotation?: Rotation;
}

/** An image, which becomes one page. */
export interface BatchPicture extends BatchFile {
  readonly format: ImageFormat;
}

/** An existing PDF, whose pages go in as they are and move together. */
export interface BatchPdf extends BatchFile {
  readonly format: "pdf";
  /** Pages in the whole PDF file. */
  readonly pages: number;
  /** 0-based pages of the file this item adds, in order; missing means all of them. */
  readonly pageIndexes?: readonly number[];
}

/** One file of the batch: an image or a PDF. */
export type BatchImage = BatchPicture | BatchPdf;

/** Pages one item adds to the PDF: one for an image, the picked pages (or all) of a PDF. */
export const itemPages = (item: BatchImage): number =>
  item.format === "pdf" ? (item.pageIndexes?.length ?? item.pages) : 1;

/** Pages the batch adds to the PDF. */
export const pageCount = (batch: readonly BatchImage[]): number =>
  batch.reduce((sum, item) => sum + itemPages(item), 0);

/** The 0-based pages of the file a PDF item adds, in order. */
export const pickedPages = (item: BatchPdf): readonly number[] =>
  item.pageIndexes ?? Array.from({ length: item.pages }, (_, page) => page);

/**
 * Replaces a PDF with one item per page it adds, in its place, so each page can move, turn and go on its own.
 * Each page keeps the PDF's date and turn. Images, single pages and unknown ids are left as they are.
 */
export const splitPdf = (
  batch: readonly BatchImage[],
  id: string,
  newId: () => string = () => crypto.randomUUID(),
): BatchImage[] =>
  batch.flatMap((item) =>
    item.id === id && item.format === "pdf" && itemPages(item) > 1
      ? pickedPages(item).map((page) => ({ ...item, id: newId(), pageIndexes: [page] }))
      : [item],
  );

/** Oldest first. Array.prototype.sort is stable, so images with the same date keep their order. */
export const sortByDate = (batch: readonly BatchImage[]): BatchImage[] =>
  [...batch].sort((a, b) => a.takenAt - b.takenAt);

export const addImages = (
  batch: readonly BatchImage[],
  images: readonly BatchImage[],
): BatchImage[] => [...batch, ...images];

/** Turns one item a further 90° clockwise; four turns bring it back upright. */
export const rotateImage = (batch: readonly BatchImage[], id: string): BatchImage[] =>
  batch.map((item) => (item.id === id ? { ...item, rotation: (((item.rotation ?? 0) + 90) % 360) as Rotation } : item));

export const removeImage = (batch: readonly BatchImage[], id: string): BatchImage[] =>
  batch.filter((image) => image.id !== id);

export const moveImage = (
  batch: readonly BatchImage[],
  id: string,
  targetIndex: number,
): BatchImage[] => {
  const from = batch.findIndex((image) => image.id === id);
  if (from === -1) return [...batch];

  const next = [...batch];
  const [image] = next.splice(from, 1);
  const to = Math.min(Math.max(targetIndex, 0), next.length);
  next.splice(to, 0, image);
  return next;
};
