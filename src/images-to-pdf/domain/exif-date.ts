const DATE_TIME = 0x0132;
const EXIF_IFD_POINTER = 0x8769;
const DATE_TIME_ORIGINAL = 0x9003;
const EXIF_DATE = /^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})/;

interface Entry {
  readonly count: number;
  readonly value: number;
}

const readIfd = (tiff: DataView, offset: number, le: boolean) => {
  const entries = new Map<number, Entry>();
  const total = tiff.getUint16(offset, le);
  for (let i = 0; i < total; i++) {
    const at = offset + 2 + i * 12;
    entries.set(tiff.getUint16(at, le), {
      count: tiff.getUint32(at + 4, le),
      value: tiff.getUint32(at + 8, le),
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

/** Returns when a JPEG was taken, from its EXIF metadata, or null when it has no usable date. */
export const readExifDate = (bytes: Uint8Array): number | null => {
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
        return readTiffDate(new DataView(bytes.buffer, bytes.byteOffset + tiffStart, size - 8));
      }
      offset += 2 + size;
    }
    return null;
  } catch {
    // Truncated or malformed metadata: reading past the buffer throws a RangeError.
    return null;
  }
};
