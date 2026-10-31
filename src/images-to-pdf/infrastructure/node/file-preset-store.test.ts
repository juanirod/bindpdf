import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createFilePresetStore, defaultPresetsPath } from "./file-preset-store";

let dir: string;
beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "bindpdf-presets-"));
});
afterEach(() => rm(dir, { recursive: true, force: true }));

const preset = { name: "Mine", adjustments: { brightness: 110, contrast: 120, saturation: 0 } };

describe("createFilePresetStore", () => {
  it("loads no presets when the file doesn't exist", () => {
    expect(createFilePresetStore(join(dir, "missing.json")).load()).toEqual([]);
  });

  it("loads no presets when the file is corrupt", async () => {
    const path = join(dir, "presets.json");
    await writeFile(path, "{nope");
    expect(createFilePresetStore(path).load()).toEqual([]);
  });

  it("stores presets as JSON, creating the folder, and loads them back", async () => {
    const path = join(dir, "nested", "presets.json");
    createFilePresetStore(path).store([preset]);
    expect(JSON.parse(await readFile(path, "utf8"))).toEqual([preset]);
    expect(createFilePresetStore(path).load()).toEqual([preset]);
  });
});

describe("defaultPresetsPath", () => {
  it("lives under XDG_CONFIG_HOME when set, else ~/.config", () => {
    expect(defaultPresetsPath({ XDG_CONFIG_HOME: "/xdg" }, "/home/me")).toBe("/xdg/bindpdf/presets.json");
    expect(defaultPresetsPath({}, "/home/me")).toBe("/home/me/.config/bindpdf/presets.json");
  });
});
