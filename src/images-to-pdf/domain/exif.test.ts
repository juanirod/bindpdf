import { describe, expect, it } from "vitest";
import { readExifDate, readExifOrientation } from "./exif";

const ORIENTATION = 0x0112;
const DATE_TIME = 0x0132;
const EXIF_IFD_POINTER = 0x8769;
const DATE_TIME_ORIGINAL = 0x9003;

interface Tags {
  dateTime?: string;
  dateTimeOriginal?: string;
  orientation?: number;
}

// Builds a minimal JPEG whose APP1 segment holds a TIFF/EXIF block with the given tags.
const makeJpeg = (tags: Tags, littleEndian = true): Uint8Array => {
  const tiff = new DataView(new ArrayBuffer(256));
  const u16 = (at: number, value: number) => tiff.setUint16(at, value, littleEndian);
  const u32 = (at: number, value: number) => tiff.setUint32(at, value, littleEndian);
  const ascii = (at: number, text: string) =>
    [...text, "\0"].forEach((char, i) => tiff.setUint8(at + i, char.charCodeAt(0)));

  tiff.setUint16(0, littleEndian ? 0x4949 : 0x4d4d);
  u16(2, 42);
  u32(4, 8); // IFD0 offset

  // IFD0 at 8: DateTime and the pointer to the Exif IFD.
  // A SHORT value sits in the first two bytes of its 4-byte field, so its 32-bit form depends on byte order.
  const short = (value: number) => (littleEndian ? value : value << 16);
  const ifd0 = [
    ...(tags.orientation !== undefined ? [[ORIENTATION, 3, 1, short(tags.orientation)]] : []),
    ...(tags.dateTime ? [[DATE_TIME, 2, 20, 100]] : []),
    [EXIF_IFD_POINTER, 4, 1, 50],
  ];
  u16(8, ifd0.length);
  ifd0.forEach(([tag, type, count, value], i) => {
    const entry = 10 + i * 12;
    u16(entry, tag);
    u16(entry + 2, type);
    u32(entry + 4, count);
    u32(entry + 8, value);
  });

  // Exif IFD at 50: DateTimeOriginal.
  const exif = tags.dateTimeOriginal ? [[DATE_TIME_ORIGINAL, 2, 20, 130]] : [];
  u16(50, exif.length);
  exif.forEach(([tag, type, count, value], i) => {
    const entry = 52 + i * 12;
    u16(entry, tag);
    u16(entry + 2, type);
    u32(entry + 4, count);
    u32(entry + 8, value);
  });

  if (tags.dateTime) ascii(100, tags.dateTime);
  if (tags.dateTimeOriginal) ascii(130, tags.dateTimeOriginal);

  const app1 = [...new TextEncoder().encode("Exif"), 0, 0, ...new Uint8Array(tiff.buffer)];
  const size = app1.length + 2;
  return new Uint8Array([0xff, 0xd8, 0xff, 0xe1, size >> 8, size & 0xff, ...app1, 0xff, 0xd9]);
};

const local = (...parts: [number, number, number, number, number, number]) => {
  const [year, month, ...rest] = parts;
  return new Date(year, month - 1, ...rest).getTime();
};

describe("readExifDate", () => {
  it("reads the capture date (DateTimeOriginal) as local time", () => {
    const jpeg = makeJpeg({ dateTimeOriginal: "2024:03:15 14:30:05" });
    expect(readExifDate(jpeg)).toBe(local(2024, 3, 15, 14, 30, 5));
  });

  it("prefers the capture date over the last-edited date", () => {
    const jpeg = makeJpeg({ dateTime: "2025:01:01 00:00:00", dateTimeOriginal: "2024:03:15 14:30:05" });
    expect(readExifDate(jpeg)).toBe(local(2024, 3, 15, 14, 30, 5));
  });

  it("falls back to DateTime when there is no capture date", () => {
    const jpeg = makeJpeg({ dateTime: "2023:12:31 23:59:59" });
    expect(readExifDate(jpeg)).toBe(local(2023, 12, 31, 23, 59, 59));
  });

  it("reads big-endian (Motorola) EXIF blocks", () => {
    const jpeg = makeJpeg({ dateTimeOriginal: "2024:03:15 14:30:05" }, false);
    expect(readExifDate(jpeg)).toBe(local(2024, 3, 15, 14, 30, 5));
  });

  it("returns null when there is no usable date", () => {
    expect(readExifDate(makeJpeg({}))).toBeNull();
    expect(readExifDate(makeJpeg({ dateTimeOriginal: "0000:00:00 00:00:00" }))).toBeNull();
    expect(readExifDate(new Uint8Array([0x89, 0x50, 0x4e, 0x47]))).toBeNull();
    expect(readExifDate(makeJpeg({ dateTimeOriginal: "2024:03:15 14:30:05" }).slice(0, 40))).toBeNull();
  });
});

describe("readExifOrientation", () => {
  it("reads the orientation tag, in either byte order", () => {
    expect(readExifOrientation(makeJpeg({ orientation: 6 }))).toBe(6);
    expect(readExifOrientation(makeJpeg({ orientation: 8 }, false))).toBe(8);
  });

  it("reads it next to other tags", () => {
    const jpeg = makeJpeg({ orientation: 3, dateTimeOriginal: "2024:03:15 14:30:05" });
    expect(readExifOrientation(jpeg)).toBe(3);
    expect(readExifDate(jpeg)).toBe(local(2024, 3, 15, 14, 30, 5));
  });

  it("treats a missing, invalid or unreadable orientation as upright (1)", () => {
    expect(readExifOrientation(makeJpeg({}))).toBe(1);
    expect(readExifOrientation(makeJpeg({ orientation: 0 }))).toBe(1);
    expect(readExifOrientation(makeJpeg({ orientation: 9 }))).toBe(1);
    expect(readExifOrientation(new Uint8Array([0x89, 0x50, 0x4e, 0x47]))).toBe(1);
    expect(readExifOrientation(makeJpeg({ orientation: 6 }).slice(0, 20))).toBe(1);
  });
});
