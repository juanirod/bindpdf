import { describe, expect, it } from "vitest";
import { NEUTRAL } from "./adjustments";
import { BUILT_IN_PRESETS, deletePreset, InvalidPresetNameError, savePreset } from "./presets";

const book = { brightness: 105, contrast: 140, saturation: 20 };

describe("presets", () => {
  it("ships an Original preset with neutral adjustments", () => {
    expect(BUILT_IN_PRESETS.find((preset) => preset.name === "Original")?.adjustments).toEqual(NEUTRAL);
  });

  it("saves a new preset with a trimmed name", () => {
    expect(savePreset([], "  Book  ", book)).toEqual([{ name: "Book", adjustments: book }]);
  });

  it("replaces a saved preset with the same name, ignoring case", () => {
    const presets = savePreset([{ name: "Book", adjustments: NEUTRAL }], "book", book);
    expect(presets).toEqual([{ name: "book", adjustments: book }]);
  });

  it("rejects empty names and names taken by built-in presets", () => {
    expect(() => savePreset([], "   ", book)).toThrow(InvalidPresetNameError);
    expect(() => savePreset([], "original", book)).toThrow(InvalidPresetNameError);
  });

  it("deletes a saved preset by name", () => {
    const presets = [
      { name: "Book", adjustments: book },
      { name: "Notes", adjustments: NEUTRAL },
    ];
    expect(deletePreset(presets, "Book")).toEqual([{ name: "Notes", adjustments: NEUTRAL }]);
  });
});
