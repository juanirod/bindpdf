import { describe, expect, it } from "vitest";
import { addImages, moveImage, pageCount, removeImage, sortByDate, type BatchImage } from "./batch";

const image = (id: string, takenAt = 0): BatchImage => ({
  id,
  name: `${id}.png`,
  bytes: new Uint8Array(),
  format: "png",
  takenAt,
});

const ids = (batch: readonly BatchImage[]) => batch.map((item) => item.id);

describe("batch", () => {
  it("appends new images at the end, keeping their order", () => {
    const batch = addImages([image("a")], [image("b"), image("c")]);
    expect(ids(batch)).toEqual(["a", "b", "c"]);
  });

  it("removes an image by id", () => {
    const batch = removeImage([image("a"), image("b"), image("c")], "b");
    expect(ids(batch)).toEqual(["a", "c"]);
  });

  it("moves an image to a new position", () => {
    const batch = [image("a"), image("b"), image("c")];
    expect(ids(moveImage(batch, "c", 0))).toEqual(["c", "a", "b"]);
    expect(ids(moveImage(batch, "a", 2))).toEqual(["b", "c", "a"]);
  });

  it("clamps out-of-range targets and ignores unknown ids", () => {
    const batch = [image("a"), image("b")];
    expect(ids(moveImage(batch, "a", 99))).toEqual(["b", "a"]);
    expect(ids(moveImage(batch, "b", -5))).toEqual(["b", "a"]);
    expect(ids(moveImage(batch, "zzz", 0))).toEqual(["a", "b"]);
  });

  it("never mutates the original batch", () => {
    const batch = [image("a"), image("b")];
    moveImage(batch, "a", 1);
    removeImage(batch, "a");
    addImages(batch, [image("c")]);
    expect(ids(batch)).toEqual(["a", "b"]);
  });

  it("sorts images from oldest to newest, keeping ties in their current order", () => {
    const batch = [image("noon", 1200), image("dawn", 600), image("tie-a", 900), image("tie-b", 900)];
    expect(ids(sortByDate(batch))).toEqual(["dawn", "tie-a", "tie-b", "noon"]);
    expect(ids(batch)).toEqual(["noon", "dawn", "tie-a", "tie-b"]);
  });
});

describe("pageCount", () => {
  it("counts one page per image and every page of each PDF", () => {
    const pdf: BatchImage = { id: "p", name: "p.pdf", bytes: new Uint8Array(), format: "pdf", pages: 5, takenAt: 0 };
    expect(pageCount([image("a"), pdf, image("b")])).toBe(7);
    expect(pageCount([])).toBe(0);
  });
});
