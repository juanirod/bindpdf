import type { ImageFormat } from "../domain/batch";
import type { Preset } from "../domain/presets";

/** Decoded image: RGBA pixels, 4 bytes per pixel, row by row. */
export interface RawImage {
  readonly width: number;
  readonly height: number;
  readonly data: Uint8ClampedArray;
}

export interface DecodeOptions {
  /** Shrinks the image so its longest side is at most this many pixels, keeping proportions. Never enlarges. */
  readonly maxSize?: number;
}

export interface EncodeOptions {
  /** JPEG quality from 1 to 100; each codec has its own default. PNG ignores it. */
  readonly quality?: number;
}

/** Decodes and encodes images. Each platform (browser canvas, Node sharp) provides its own. */
export interface ImageCodec {
  /** Rejects when the bytes aren't an image this platform can open. `type` is a MIME hint when known. */
  decode(bytes: Uint8Array<ArrayBuffer>, type?: string, options?: DecodeOptions): Promise<RawImage>;
  encode(image: RawImage, format: ImageFormat, options?: EncodeOptions): Promise<Uint8Array<ArrayBuffer>>;
}

/** Where user presets are kept. A missing or unreadable store loads as no presets. */
export interface PresetStore {
  load(): Preset[];
  store(presets: readonly Preset[]): void;
}
