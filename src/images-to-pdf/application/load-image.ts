import type { BatchImage, ImageFormat } from "../domain/batch";
import { readExifDate } from "../domain/exif-date";
import type { ImageCodec } from "./ports";

/** An image file as read by any platform: browser File or file on disk. */
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

const startsWith = (bytes: Uint8Array, signature: readonly number[]) =>
  signature.every((byte, i) => bytes[i] === byte);

/** Formats pdf-lib can embed, recognized by their signature so file names and MIME types can't mislead. */
const embeddableFormat = (bytes: Uint8Array): ImageFormat | null => {
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return "jpg";
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "png";
  return null;
};

/**
 * Turns an image file into a batch image, converting formats pdf-lib cannot embed (WebP, GIF, BMP…) to PNG.
 * The date comes from the JPEG's EXIF capture date, falling back to the file's last-modified time.
 */
export const loadImage = async (source: ImageSource, codec: ImageCodec): Promise<BatchImage> => {
  const base = { id: crypto.randomUUID(), name: source.name, takenAt: source.lastModified };
  const format = embeddableFormat(source.bytes);
  if (format === "jpg") {
    return { ...base, format, bytes: source.bytes, takenAt: readExifDate(source.bytes) ?? source.lastModified };
  }
  if (format === "png") return { ...base, format, bytes: source.bytes };

  const raw = await codec.decode(source.bytes, source.type).catch(() => {
    throw new UnsupportedImageError(source.name);
  });
  return { ...base, format: "png", bytes: await codec.encode(raw, "png") };
};
