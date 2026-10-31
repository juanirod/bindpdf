import { mkdtemp, rm, utimes, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { readImageFile } from "./read-image-file";

let dir: string;
beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "bindpdf-read-"));
});
afterEach(() => rm(dir, { recursive: true, force: true }));

describe("readImageFile", () => {
  it("reads the file's name, bytes and last-modified time", async () => {
    const path = join(dir, "page.png");
    await writeFile(path, new Uint8Array([1, 2, 3]));
    const modified = new Date(2024, 0, 2, 3, 4, 5);
    await utimes(path, modified, modified);

    const source = await readImageFile(path);
    expect(source).toEqual({ name: "page.png", bytes: new Uint8Array([1, 2, 3]), lastModified: modified.getTime() });
  });
});
