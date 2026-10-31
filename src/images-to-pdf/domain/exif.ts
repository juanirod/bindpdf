const ORIENTATION = 0x0112;
const DATE_TIME = 0x0132;
const EXIF_IFD_POINTER = 0x8769;
const DATE_TIME_ORIGINAL = 0x9003;
const EXIF_DATE = /^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})/;

interface Entry {
  readonly count: number;
  /** The 4-byte value field, read as LONG (offsets and pointers). */
  readonly value: number;
  /** The same field read as SHORT, which sits in its first two bytes in either byte order. */
  readonly short: number;
}

const readIfd = (tiff: DataView, offset: number, le: boolean) => {
  const entries = new Map<number, Entry>();
  const total = tiff.getUint16(offset, le);
  for (let i = 0; i < total; i++) {
    const at = offset + 2 + i * 12;
    entries.set(tiff.getUint16(at, le), {
      count: tiff.getUint32(at + 4, le),
      value: tiff.getUint32(at + 8, le),
      short: tiff.getUint16(at + 8, le),
    });
  }
  return entries;
};

const readDate = (tiff: DataView, entry: Entry | undefined): number | null => {
  if (!entry) return null;
  let text = "";
  for (let i = 0; i < Math.min(entry.count, 19); i++) {
    text += String.fromCharCode(tiff.getUint8(entry.value + i));
  }
  const match = EXIF_DATE.exec(text);
  if (!match) return null;
  const [year, month, day, hour, minute, second] = match.slice(1).map(Number);
  if (year === 0 || month === 0 || day === 0) return null;
  // EXIF dates carry no timezone: they are the camera's local time.
  return new Date(year, month - 1, day, hour, minute, second).getTime();
};

const readTiffDate = (tiff: DataView): number | null => {
  const le = tiff.getUint16(0) === 0x4949;
  const ifd0 = readIfd(tiff, tiff.getUint32(4, le), le);
  const exifPointer = ifd0.get(EXIF_IFD_POINTER);
  const exif = exifPointer ? readIfd(tiff, exifPointer.value, le) : new Map<number, Entry>();
  return readDate(tiff, exif.get(DATE_TIME_ORIGINAL)) ?? readDate(tiff, ifd0.get(DATE_TIME));
};

const isExifHeader = (view: DataView, at: number) =>
  view.getUint32(at) === 0x45786966 && view.getUint16(at + 4) === 0; // "Exif\0\0"

/** Finds the TIFF block inside a JPEG's EXIF segment and reads it, or returns null when there is none. */
const readTiff = <T>(bytes: Uint8Array, read: (tiff: DataView) => T): T | null => {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  try {
    if (view.getUint16(0) !== 0xffd8) return null;
    let offset = 2;
    while (offset + 4 <= view.byteLength) {
      const marker = view.getUint16(offset);
      // Metadata segments come before the image data (start of scan).
      if ((marker & 0xff00) !== 0xff00 || marker === 0xffda) return null;
      const size = view.getUint16(offset + 2);
      if (marker === 0xffe1 && isExifHeader(view, offset + 4)) {
        const tiffStart = offset + 10;
        return read(new DataView(bytes.buffer, bytes.byteOffset + tiffStart, size - 8));
      }
      offset += 2 + size;
    }
    return null;
  } catch {
    // Truncated or malformed metadata: reading past the buffer throws a RangeError.
    return null;
  }
};

/** Returns when a JPEG was taken, from its EXIF metadata, or null when it has no usable date. */
export const readExifDate = (bytes: Uint8Array): number | null => readTiff(bytes, readTiffDate);

/** EXIF orientation: 1 is upright; 2 to 8 are the mirrored and rotated ways a camera may store the pixels. */
export type Orientation = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

const isOrientation = (value: number): value is Orientation => Number.isInteger(value) && value >= 1 && value <= 8;

/** Returns how a JPEG's pixels must be turned to display upright, or 1 when it has no valid orientation tag. */
export const readExifOrientation = (bytes: Uint8Array): Orientation => {
  const value = readTiff(bytes, (tiff) => {
    const le = tiff.getUint16(0) === 0x4949;
    return readIfd(tiff, tiff.getUint32(4, le), le).get(ORIENTATION)?.short;
  });
  return value != null && isOrientation(value) ? value : 1;
};
