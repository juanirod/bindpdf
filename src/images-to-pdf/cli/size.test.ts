import { describe, expect, it } from "vitest";
import { compressionChoices, formatBytes, sizeTip, SMALLER } from "./size";

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

describe("sizeTip", () => {
  it("suggests compressing a large PDF, with the estimated result", () => {
    expect(sizeTip("book.pdf", 85 * MB, 8.5 * MB)).toBe(
      "Tip: book.pdf is 85 MB. Add --max-size 1600 --quality 75 to make it about 8.5 MB.",
    );
  });

  it("says nothing when compressing wouldn't save much", () => {
    expect(sizeTip("book.pdf", 85 * MB, 80 * MB)).toBeNull();
  });
});
