import { PDFDocument } from "pdf-lib";
import type { BatchImage, BatchPdf, ImageFormat } from "../domain/batch";
import { readExifDate, readExifOrientation } from "../domain/exif";
import type { ImageCodec } from "./ports";

/** An image or PDF file as read by any platform: browser File or file on disk. */
export interface ImageSource {
  readonly name: string;
  readonly bytes: Uint8Array<ArrayBuffer>;
  /** Last-modified time, ms since epoch. */
  readonly lastModified: number;
  /** MIME type when the platform knows it. */
  readonly type?: string;
}

export class UnsupportedImageError extends Error {
  constructor(readonly fileName: string) {
    super(`${fileName} could not be read as an image.`);
    this.name = "UnsupportedImageError";
  }
}

/** Why a PDF can't be added: it needs a password, or it isn't a valid PDF. */
export type UnreadablePdfReason = "protected" | "damaged";

export class UnreadablePdfError extends Error {
  constructor(
    readonly fileName: string,
    readonly reason: UnreadablePdfReason,
  ) {
    super(reason === "protected" ? `${fileName} is password-protected.` : `${fileName} could not be read as a PDF.`);
    this.name = "UnreadablePdfError";
  }
}

const startsWith = (bytes: Uint8Array, signature: readonly number[]) =>
  signature.every((byte, i) => bytes[i] === byte);

/** Formats pdf-lib can embed, recognized by their signature so file names and MIME types can't mislead. */
const embeddableFormat = (bytes: Uint8Array): ImageFormat | null => {
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return "jpg";
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "png";
  return null;
};

const PDF_SIGNATURE = [0x25, 0x50, 0x44, 0x46, 0x2d]; // "%PDF-"

const isPdf = (bytes: Uint8Array) => startsWith(bytes, PDF_SIGNATURE);

/** Opens the PDF to count its pages and read its creation date; its bytes go in unchanged. */
const loadPdf = async (source: ImageSource): Promise<BatchPdf> => {
  let pdf: PDFDocument;
  let pages: number;
  try {
    pdf = await PDFDocument.load(source.bytes, { ignoreEncryption: true, updateMetadata: false });
    pages = pdf.getPageCount();
  } catch {
    throw new UnreadablePdfError(source.name, "damaged");
  }
  if (pdf.isEncrypted) throw new UnreadablePdfError(source.name, "protected");
  if (pages === 0) throw new UnreadablePdfError(source.name, "damaged");
  const created = pdf.getCreationDate()?.getTime();
  return {
    id: crypto.randomUUID(),
    name: source.name,
    bytes: source.bytes,
    format: "pdf",
    pages,
    takenAt: created !== undefined && !Number.isNaN(created) ? created : source.lastModified,
  };
};

const decodeOrReject = (source: ImageSource, codec: ImageCodec, type: string | undefined) =>
  codec.decode(source.bytes, type).catch(() => {
    throw new UnsupportedImageError(source.name);
  });

/**
 * Turns an image file into a batch image, converting formats pdf-lib cannot embed (WebP, GIF, BMP…) to PNG.
 * JPEGs stored sideways or mirrored (EXIF orientation other than 1) are re-encoded upright, since pdf-lib ignores
 * the tag; upright JPEGs are kept as they are. The date comes from the JPEG's EXIF capture date, falling back to the
 * file's last-modified time. PDFs keep their bytes and are dated by their creation date, else the file's date;
 * password-protected or damaged ones reject with UnreadablePdfError.
 */
export const loadImage = async (source: ImageSource, codec: ImageCodec): Promise<BatchImage> => {
  if (isPdf(source.bytes)) return loadPdf(source);
  const base = { id: crypto.randomUUID(), name: source.name, takenAt: source.lastModified };
  const format = embeddableFormat(source.bytes);
  if (format === "jpg") {
    const takenAt = readExifDate(source.bytes) ?? source.lastModified;
    if (readExifOrientation(source.bytes) === 1) return { ...base, format, bytes: source.bytes, takenAt };
    // Both codecs apply the orientation when decoding and write no EXIF when encoding, so it isn't applied twice.
    const raw = await decodeOrReject(source, codec, "image/jpeg");
    return { ...base, format, bytes: await codec.encode(raw, "jpg"), takenAt };
  }
  if (format === "png") return { ...base, format, bytes: source.bytes };

  const raw = await decodeOrReject(source, codec, source.type);
  return { ...base, format: "png", bytes: await codec.encode(raw, "png") };
};
