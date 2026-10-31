import { describe, expect, it } from "vitest";
import { parseCliArgs, UsageError } from "./args";

describe("parseCliArgs", () => {
  it("binds the listed images in order with defaults", () => {
    expect(parseCliArgs(["a.jpg", "b.png"])).toEqual({
      kind: "bind",
      options: {
        files: ["a.jpg", "b.png"],
        order: { kind: "given" },
        adjustments: {},
        output: "images.pdf",
        pageSize: "image",
        interactive: false,
      },
    });
  });

  it("reads every bind option, short and long", () => {
    const command = parseCliArgs([
      "-s", "date", "-p", "scanned-color", "-b", "110", "-c", "130", "--saturation", "0",
      "--save-preset", "Mine", "-o", "out.pdf", "--page-size", "a4", "-i", "a.jpg",
    ]);
    expect(command).toEqual({
      kind: "bind",
      options: {
        files: ["a.jpg"],
        order: { kind: "date" },
        preset: "scanned-color",
        adjustments: { brightness: 110, contrast: 130, saturation: 0 },
        savePreset: "Mine",
        output: "out.pdf",
        pageSize: "a4",
        interactive: true,
      },
    });
  });

  it("reads --quality and --max-size", () => {
    const command = parseCliArgs(["a.jpg", "--quality", "70", "--max-size", "2000"]);
    expect(command).toMatchObject({ kind: "bind", options: { quality: 70, maxSize: 2000 } });
  });

  it("reads a manual order as 0-based positions", () => {
    const command = parseCliArgs(["--order", "3, 1,2", "a", "b", "c"]);
    expect(command).toMatchObject({ options: { order: { kind: "manual", positions: [2, 0, 1] } } });
  });

  it("adds .pdf to an output name without it", () => {
    expect(parseCliArgs(["-o", "book", "a.jpg"])).toMatchObject({ options: { output: "book.pdf" } });
  });

  it("reads the other commands", () => {
    expect(parseCliArgs([])).toEqual({ kind: "help" });
    expect(parseCliArgs(["-h"])).toEqual({ kind: "help" });
    expect(parseCliArgs(["--version"])).toEqual({ kind: "version" });
    expect(parseCliArgs(["--list-presets"])).toEqual({ kind: "list-presets" });
    expect(parseCliArgs(["--delete-preset", "Mine"])).toEqual({ kind: "delete-preset", name: "Mine" });
  });

  it.each([
    [["-o", "out.pdf"], "Pass at least one image."],
    [["--sort", "name", "a"], 'Unknown sort "name". Use: date.'],
    [["--page-size", "a3", "a"], 'Unknown page size "a3". Use: image, a4, letter.'],
    [["-b", "abc", "a"], "--brightness must be a whole number from 50 to 150."],
    [["-b", "151", "a"], "--brightness must be a whole number from 50 to 150."],
    [["-c", "49", "a"], "--contrast must be a whole number from 50 to 200."],
    [["--saturation", "201", "a"], "--saturation must be a whole number from 0 to 200."],
    [["--order", "2,1", "a", "b", "c"], "--order must list each of the 3 images once, e.g. 3,2,1."],
    [["--order", "1,1", "a", "b"], "--order must list each of the 2 images once, e.g. 2,1."],
    [["--order", "1,x", "a", "b"], "--order must list each of the 2 images once, e.g. 2,1."],
    [["--order", "1,2", "-s", "date", "a", "b"], "Use either --sort or --order, not both."],
    [["--quality", "0", "a"], "--quality must be a whole number from 1 to 100."],
    [["--quality", "101", "a"], "--quality must be a whole number from 1 to 100."],
    [["--quality", "7.5", "a"], "--quality must be a whole number from 1 to 100."],
    [["--max-size", "99", "a"], "--max-size must be a whole number from 100 to 20000."],
    [["--max-size", "big", "a"], "--max-size must be a whole number from 100 to 20000."],
    [["--nope", "a"], "Unknown option '--nope'"],
  ])("rejects %j with a usage error", (argv, message) => {
    expect(() => parseCliArgs(argv)).toThrow(UsageError);
    expect(() => parseCliArgs(argv)).toThrow(message);
  });
});
