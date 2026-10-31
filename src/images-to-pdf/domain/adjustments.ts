/** Percentages where 100 leaves the image unchanged. */
export interface Adjustments {
  readonly brightness: number;
  readonly contrast: number;
  readonly saturation: number;
}

export const NEUTRAL: Adjustments = { brightness: 100, contrast: 100, saturation: 100 };

export const isNeutral = (adjustments: Adjustments) =>
  adjustments.brightness === 100 && adjustments.contrast === 100 && adjustments.saturation === 100;

/** CSS equivalent, so previews match the exported pixels. */
export const toCssFilter = ({ brightness, contrast, saturation }: Adjustments) =>
  isNeutral({ brightness, contrast, saturation })
    ? "none"
    : `brightness(${brightness / 100}) contrast(${contrast / 100}) saturate(${saturation / 100})`;

const clamp = (value: number) => Math.min(255, Math.max(0, value));

/**
 * Applies brightness, then contrast, then saturation to RGBA pixels in place.
 * Same formulas and order as the CSS filters, clamping after each step like browsers do.
 */
export const adjustPixels = (data: Uint8ClampedArray, adjustments: Adjustments) => {
  if (isNeutral(adjustments)) return;
  const brightness = adjustments.brightness / 100;
  const contrast = adjustments.contrast / 100;
  const saturation = adjustments.saturation / 100;
  const tone = (value: number) => clamp((clamp(value * brightness) - 127.5) * contrast + 127.5);

  for (let i = 0; i < data.length; i += 4) {
    const r = tone(data[i]);
    const g = tone(data[i + 1]);
    const b = tone(data[i + 2]);
    // Rec. 709 luminance, the weights CSS saturate() uses.
    const gray = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    data[i] = gray + (r - gray) * saturation;
    data[i + 1] = gray + (g - gray) * saturation;
    data[i + 2] = gray + (b - gray) * saturation;
  }
};

/** Allowed values for each adjustment, the same the web sliders offer. */
export const ADJUSTMENT_RANGES: Readonly<Record<keyof Adjustments, readonly [min: number, max: number]>> = {
  brightness: [50, 150],
  contrast: [50, 200],
  saturation: [0, 200],
};
