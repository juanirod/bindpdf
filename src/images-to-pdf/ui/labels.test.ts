import { describe, expect, it } from "vitest";
import { pdfLabel, skippedNotice } from "./labels";

describe("pdfLabel", () => {
  it("names the page count of a PDF card", () => {
    expect(pdfLabel(5)).toBe("PDF · 5 pages");
    expect(pdfLabel(1)).toBe("PDF · 1 page");
  });
});

describe("skippedNotice", () => {
  it("is null when nothing was skipped", () => {
    expect(skippedNotice({ images: [], protectedPdfs: [], damagedPdfs: [] })).toBeNull();
  });

  it("keeps the message for images the browser can't open", () => {
    expect(skippedNotice({ images: ["a.heic", "b.tiff"], protectedPdfs: [], damagedPdfs: [] })).toBe(
      "Skipped a.heic, b.tiff: this browser can't open that format. Convert it to JPG or PNG and add it again.",
    );
  });

  it("names password-protected and damaged PDFs, each with its reason", () => {
    expect(skippedNotice({ images: ["a.heic"], protectedPdfs: ["secret.pdf"], damagedPdfs: ["broken.pdf"] })).toBe(
      "Skipped a.heic: this browser can't open that format. Convert it to JPG or PNG and add it again. " +
        "Skipped secret.pdf: it is password-protected. " +
        "Skipped broken.pdf: it could not be read as a PDF.",
    );
  });
});
