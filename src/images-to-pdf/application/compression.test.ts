import { describe, expect, it } from "vitest";
import { compressionChoices, formatBytes, SMALLER } from "./compression";

const MB = 1024 * 1024;

describe("formatBytes", () => {
  it("rounds to whole units, keeping one decimal below 10", () => {
    expect(formatBytes(512)).toBe("1 KB");
    expect(formatBytes(300 * 1024)).toBe("300 KB");
    expect(formatBytes(8.46 * MB)).toBe("8.5 MB");
    expect(formatBytes(85.24 * MB)).toBe("85 MB");
    expect(formatBytes(2.5 * 1024 * MB)).toBe("2.5 GB");
  });
});

describe("compressionChoices", () => {
  it("offers original, smaller and smallest", () => {
    expect(compressionChoices({}).map((choice) => choice.name)).toEqual(["Original", "Smaller", "Smallest"]);
  });

  it("puts what the flags chose first when it is none of them", () => {
    const choices = compressionChoices({ maxSize: 2000 });
    expect(choices[0]).toEqual({ name: "As given", description: "Up to 2000 px", value: { maxSize: 2000 } });
    expect(choices).toHaveLength(4);
    expect(compressionChoices({ quality: 60 })[0].description).toBe("Quality 60");
    expect(compressionChoices(SMALLER)).toHaveLength(3);
  });
});
