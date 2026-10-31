/** Formats pdf-lib can embed natively. Anything else is converted before entering the batch. */
export type ImageFormat = "png" | "jpg";

export interface BatchImage {
  readonly id: string;
  readonly name: string;
  readonly bytes: Uint8Array<ArrayBuffer>;
  readonly format: ImageFormat;
  /** When the photo was taken (ms since epoch), or the file's last-modified time when unknown. */
  readonly takenAt: number;
}

/** Oldest first. Array.prototype.sort is stable, so images with the same date keep their order. */
export const sortByDate = (batch: readonly BatchImage[]): BatchImage[] =>
  [...batch].sort((a, b) => a.takenAt - b.takenAt);

export const addImages = (
  batch: readonly BatchImage[],
  images: readonly BatchImage[],
): BatchImage[] => [...batch, ...images];

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
