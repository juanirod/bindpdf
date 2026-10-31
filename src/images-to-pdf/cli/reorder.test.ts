import { describe, expect, it } from "vitest";
import type { BatchImage } from "../domain/batch";
import { reorder, type ReorderState } from "./reorder";

const page = (name: string, takenAt: number): BatchImage => ({
  id: name,
  name,
  bytes: new Uint8Array(),
  format: "png",
  takenAt,
});
const state = (cursor = 0, grabbed = false): ReorderState => ({
  pages: [page("a", 3), page("b", 1), page("c", 2)],
  cursor,
  grabbed,
});
const names = (next: ReorderState) => next.pages.map((p) => p.name).join("");

describe("reorder", () => {
  it("moves the cursor without changing the order, wrapping around", () => {
    expect(reorder(state(0), "down")).toMatchObject({ cursor: 1 });
    expect(names(reorder(state(0), "down"))).toBe("abc");
    expect(reorder(state(0), "up")).toMatchObject({ cursor: 2 });
    expect(reorder(state(2), "down")).toMatchObject({ cursor: 0 });
  });

  it("carries the grabbed page with the cursor, stopping at the ends", () => {
    const grabbed = reorder(state(0), "grab");
    expect(grabbed.grabbed).toBe(true);
    const moved = reorder(grabbed, "down");
    expect(names(moved)).toBe("bac");
    expect(moved).toMatchObject({ cursor: 1, grabbed: true });
    expect(names(reorder(reorder(moved, "down"), "down"))).toBe("bca");
    expect(names(reorder(grabbed, "up"))).toBe("abc");
    expect(reorder(moved, "grab").grabbed).toBe(false);
  });

  it("removes the page under the cursor, but never the last one", () => {
    const removed = reorder(state(2), "remove");
    expect(names(removed)).toBe("ab");
    expect(removed.cursor).toBe(1);
    const single: ReorderState = { pages: [page("a", 1)], cursor: 0, grabbed: false };
    expect(reorder(single, "remove")).toEqual(single);
  });

  it("sorts by date, keeping the cursor on the same page", () => {
    const sorted = reorder(state(0, true), "sort");
    expect(names(sorted)).toBe("bca");
    expect(sorted).toMatchObject({ cursor: 2, grabbed: false });
  });
});
