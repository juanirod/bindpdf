import { PageSizes, PDFDocument } from "pdf-lib";
import type { BatchImage } from "../domain/batch";

export type PageSize = "image" | "a4" | "letter";

export interface BuildPdfOptions {
  /** "image" sizes each page to its image; paper sizes turn to match the image's orientation. */
  readonly pageSize?: PageSize;
}

interface Size {
  readonly width: number;
  readonly height: number;
}

const PAPER: Record<Exclude<PageSize, "image">, readonly [number, number]> = {
  a4: PageSizes.A4,
  letter: PageSizes.Letter,
};

export class EmptyBatchError extends Error {
  constructor() {
    super("Add at least one image before generating the PDF.");
    this.name = "EmptyBatchError";
  }
}

/** Scales the image to fit inside the page, keeping its proportions, and centers it. */
export const fitImage = (image: Size, page: Size) => {
  const scale = Math.min(page.width / image.width, page.height / image.height);
  const width = image.width * scale;
  const height = image.height * scale;
  return { x: (page.width - width) / 2, y: (page.height - height) / 2, width, height };
};

const pageFor = (image: Size, pageSize: PageSize): Size => {
  if (pageSize === "image") return image;
  const [short, long] = PAPER[pageSize];
  return image.width > image.height ? { width: long, height: short } : { width: short, height: long };
};

/** Builds a PDF with one page per image, in batch order. */
export const buildPdf = async (
  batch: readonly BatchImage[],
  { pageSize = "image" }: BuildPdfOptions = {},
): Promise<Uint8Array> => {
  if (batch.length === 0) throw new EmptyBatchError();

  const pdf = await PDFDocument.create();
  for (const image of batch) {
    const embedded =
      image.format === "png" ? await pdf.embedPng(image.bytes) : await pdf.embedJpg(image.bytes);
    const size = pageFor(embedded, pageSize);
    const page = pdf.addPage([size.width, size.height]);
    page.drawImage(embedded, fitImage(embedded, size));
  }
  return pdf.save();
};
