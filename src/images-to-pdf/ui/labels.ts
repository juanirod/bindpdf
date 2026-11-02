// Texts the web app shows about the batch, kept apart from the DOM so they can be tested.

const pages = (count: number) => `${count} ${count === 1 ? "page" : "pages"}`;

/** Caption of a PDF's card, which shows a PDF logo instead of a preview. */
export const pdfLabel = (count: number) => `PDF · ${pages(count)}`;

/** File names left out of the batch, by why. */
export interface Skipped {
  readonly images: readonly string[];
  readonly protectedPdfs: readonly string[];
  readonly damagedPdfs: readonly string[];
}

/** One sentence per reason, or null when nothing was skipped. */
export const skippedNotice = ({ images, protectedPdfs, damagedPdfs }: Skipped): string | null => {
  const sentences = [
    images.length > 0 &&
      `Skipped ${images.join(", ")}: this browser can't open that format. Convert it to JPG or PNG and add it again.`,
    protectedPdfs.length > 0 && `Skipped ${protectedPdfs.join(", ")}: it is password-protected.`,
    damagedPdfs.length > 0 && `Skipped ${damagedPdfs.join(", ")}: it could not be read as a PDF.`,
  ].filter(Boolean);
  return sentences.length > 0 ? sentences.join(" ") : null;
};
