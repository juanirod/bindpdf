import { PageSizes, PDFDocument } from "pdf-lib";
import type { BatchImage } from "../domain/batch";

export type PageSize = "image" | "a4" | "letter";

export interface BuildPdfOptions {
  /** "image" sizes each page to its image; paper sizes turn to match the image's orientation. PDF pages keep their size. */
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

/** Builds a PDF one file at a time, so each one can be released once it is added. */
export interface PdfBuilder {
  /** Adds an image as one page, or every page of a PDF as it is. */
  addPage(image: BatchImage): Promise<void>;
  /** Rejects with EmptyBatchError when no page was added. */
  save(): Promise<Uint8Array>;
}

export const createPdfBuilder = async ({ pageSize = "image" }: BuildPdfOptions = {}): Promise<PdfBuilder> => {
  const pdf = await PDFDocument.create();
  let pages = 0;
  return {
    async addPage(image) {
      if (image.format === "pdf") {
        const source = await PDFDocument.load(image.bytes);
        for (const page of await pdf.copyPages(source, source.getPageIndices())) pdf.addPage(page);
        pages += source.getPageCount();
        return;
      }
      const embedded =
        image.format === "png" ? await pdf.embedPng(image.bytes) : await pdf.embedJpg(image.bytes);
      const size = pageFor(embedded, pageSize);
      const page = pdf.addPage([size.width, size.height]);
      page.drawImage(embedded, fitImage(embedded, size));
      pages++;
    },
    async save() {
      if (pages === 0) throw new EmptyBatchError();
      return pdf.save();
    },
  };
};

/** Builds a PDF with one page per image and every page of each PDF, in batch order. */
export const buildPdf = async (
  batch: readonly BatchImage[],
  options: BuildPdfOptions = {},
): Promise<Uint8Array> => {
  if (batch.length === 0) throw new EmptyBatchError();

  const builder = await createPdfBuilder(options);
  for (const image of batch) await builder.addPage(image);
  return builder.save();
};
