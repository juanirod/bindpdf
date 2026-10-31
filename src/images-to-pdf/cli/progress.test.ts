import { describe, expect, it } from "vitest";
import { createLineProgress } from "./progress";

const stream = () => {
  const writes: string[] = [];
  return { writes, write: (chunk: string) => writes.push(chunk) };
};

describe("createLineProgress", () => {
  it("rewrites one line in place and erases it on clear", () => {
    const target = stream();
    const progress = createLineProgress(target);
    progress.show("Adjusting page 1/2…");
    progress.show("Adjusting page 2/2…");
    progress.clear();
    expect(target.writes).toEqual(["\r\x1b[2KAdjusting page 1/2…", "\r\x1b[2KAdjusting page 2/2…", "\r\x1b[2K"]);
  });

  it("writes nothing on clear when no line is shown", () => {
    const target = stream();
    const progress = createLineProgress(target);
    progress.clear();
    progress.show("Building the PDF…");
    progress.clear();
    progress.clear();
    expect(target.writes).toEqual(["\r\x1b[2KBuilding the PDF…", "\r\x1b[2K"]);
  });
});
