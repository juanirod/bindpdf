import { describe, expect, it } from "vitest";
import { adjustPixels, isNeutral, NEUTRAL, sameAdjustments, toCssFilter } from "./adjustments";

const pixels = (...rgba: number[]) => new Uint8ClampedArray(rgba);

describe("adjustPixels", () => {
  it("leaves pixels unchanged with neutral adjustments", () => {
    const data = pixels(10, 128, 250, 255);
    adjustPixels(data, NEUTRAL);
    expect([...data]).toEqual([10, 128, 250, 255]);
  });

  it("scales brightness and clamps at white", () => {
    const data = pixels(100, 200, 0, 255);
    adjustPixels(data, { ...NEUTRAL, brightness: 150 });
    expect([...data]).toEqual([150, 255, 0, 255]);
  });

  it("pushes values away from mid-gray with more contrast, and flattens them with none", () => {
    const strong = pixels(0, 64, 255, 255);
    adjustPixels(strong, { ...NEUTRAL, contrast: 200 });
    expect([...strong]).toEqual([0, 0, 255, 255]);

    const flat = pixels(0, 64, 255, 255);
    adjustPixels(flat, { ...NEUTRAL, contrast: 0 });
    expect([...flat]).toEqual([128, 128, 128, 255]);
  });

  it("turns pixels into their luminance gray with zero saturation", () => {
    const data = pixels(255, 0, 0, 255);
    adjustPixels(data, { ...NEUTRAL, saturation: 0 });
    expect([...data]).toEqual([54, 54, 54, 255]);
  });

  it("never touches the alpha channel", () => {
    const data = pixels(100, 100, 100, 37);
    adjustPixels(data, { brightness: 180, contrast: 160, saturation: 0 });
    expect(data[3]).toBe(37);
  });
});

describe("isNeutral", () => {
  it("is true only when every adjustment is at 100", () => {
    expect(isNeutral(NEUTRAL)).toBe(true);
    expect(isNeutral({ ...NEUTRAL, saturation: 99 })).toBe(false);
  });
});

describe("toCssFilter", () => {
  it("builds a CSS filter in the same order the pixels are processed", () => {
    expect(toCssFilter({ brightness: 110, contrast: 135, saturation: 0 })).toBe(
      "brightness(1.1) contrast(1.35) saturate(0)",
    );
    expect(toCssFilter(NEUTRAL)).toBe("none");
  });
});

describe("sameAdjustments", () => {
  it("compares every value", () => {
    expect(sameAdjustments(NEUTRAL, { brightness: 100, contrast: 100, saturation: 100 })).toBe(true);
    expect(sameAdjustments(NEUTRAL, { ...NEUTRAL, saturation: 99 })).toBe(false);
  });
});
