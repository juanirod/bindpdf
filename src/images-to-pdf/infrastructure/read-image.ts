import type { BatchImage } from "../domain/batch";
import { readExifDate } from "./exif-date";

export class UnsupportedImageError extends Error {
  constructor(readonly fileName: string) {
    super(`${fileName} could not be read as an image.`);
    this.name = "UnsupportedImageError";
  }
}

const toPng = async (file: File): Promise<Uint8Array<ArrayBuffer>> => {
  const bitmap = await createImageBitmap(file).catch(() => {
    throw new UnsupportedImageError(file.name);
  });
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) throw new UnsupportedImageError(file.name);
  return new Uint8Array(await blob.arrayBuffer());
};

/**
 * Reads a browser File into a batch image, converting formats pdf-lib cannot embed (WebP, GIF, BMP…) to PNG.
 * The date comes from the JPEG's EXIF capture date, falling back to the file's last-modified time.
 */
export const readImage = async (file: File): Promise<BatchImage> => {
  const base = { id: crypto.randomUUID(), name: file.name, takenAt: file.lastModified };
  if (file.type === "image/jpeg") {
    const bytes = new Uint8Array(await file.arrayBuffer());
    return { ...base, format: "jpg", bytes, takenAt: readExifDate(bytes) ?? file.lastModified };
  }
  if (file.type === "image/png") {
    return { ...base, format: "png", bytes: new Uint8Array(await file.arrayBuffer()) };
  }
  return { ...base, format: "png", bytes: await toPng(file) };
};
