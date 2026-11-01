// Compression presets offered by both interfaces, and how sizes are shown.
import type { OutputOptions } from "./adjust-image";

export const SMALLER: OutputOptions = { maxSize: 1600, quality: 75 };
export const SMALLEST: OutputOptions = { maxSize: 1200, quality: 70 };

export interface CompressionChoice {
  readonly name: string;
  readonly description: string;
  readonly value: OutputOptions;
}

const UNITS = ["KB", "MB", "GB"] as const;

/** Sizes the way file managers show them: KB whole, larger units with one decimal below 10. */
export const formatBytes = (bytes: number) => {
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < UNITS.length - 1) {
    value /= 1024;
    unit++;
  }
  if (unit === 0) return `${Math.max(1, Math.round(value))} KB`;
  const shown = value < 10 ? value.toFixed(1).replace(/\.0$/, "") : String(Math.round(value));
  return `${shown} ${UNITS[unit]}`;
};

export const sameCompression = (a: OutputOptions, b: OutputOptions) => a.maxSize === b.maxSize && a.quality === b.quality;

export const describeCompression = ({ maxSize, quality }: OutputOptions) => {
  const parts = [maxSize !== undefined && `up to ${maxSize} px`, quality !== undefined && `quality ${quality}`];
  const text = parts.filter(Boolean).join(", ");
  return text.charAt(0).toUpperCase() + text.slice(1);
};

const PRESETS: readonly CompressionChoice[] = [
  { name: "Original", description: "Photos go in as they are", value: {} },
  { name: "Smaller", description: describeCompression(SMALLER), value: SMALLER },
  { name: "Smallest", description: describeCompression(SMALLEST), value: SMALLEST },
];

/** The compression presets, after what the flags chose when it is none of them. */
export const compressionChoices = (current: OutputOptions): CompressionChoice[] =>
  PRESETS.some((choice) => sameCompression(choice.value, current))
    ? [...PRESETS]
    : [{ name: "As given", description: describeCompression(current), value: current }, ...PRESETS];
