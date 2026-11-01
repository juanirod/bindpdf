import { describe, expect, it } from "vitest";
import { sizeTip } from "./size";

const MB = 1024 * 1024;

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
