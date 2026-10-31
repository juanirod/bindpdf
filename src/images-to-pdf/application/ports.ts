import type { ImageFormat } from "../domain/batch";
import type { Preset } from "../domain/presets";

/** Decoded image: RGBA pixels, 4 bytes per pixel, row by row. */
export interface RawImage {
  readonly width: number;
  readonly height: number;
  readonly data: Uint8ClampedArray;
}

/** Decodes and encodes images. Each platform (browser canvas, Node sharp) provides its own. */
export interface ImageCodec {
  /** Rejects when the bytes aren't an image this platform can open. `type` is a MIME hint when known. */
  decode(bytes: Uint8Array<ArrayBuffer>, type?: string): Promise<RawImage>;
  encode(image: RawImage, format: ImageFormat): Promise<Uint8Array<ArrayBuffer>>;
}

/** Where user presets are kept. Failures are silent: presets still work for the session. */
export interface PresetStore {
  load(): Preset[];
  store(presets: readonly Preset[]): void;
}
