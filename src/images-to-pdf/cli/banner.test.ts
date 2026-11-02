import { describe, expect, it } from "vitest";
import { chooseBanner } from "./banner";

const UTF8 = { LANG: "en_US.UTF-8" };
const lines = (banner: string) => banner.split("\n");

describe("chooseBanner", () => {
  it("uses the monochrome Unicode banner when output isn't a terminal", () => {
    const banner = chooseBanner({ isTTY: false, env: { ...UTF8, COLORTERM: "truecolor" }, platform: "linux" });
    expect(banner).not.toContain("\u001b");
    expect(lines(banner)).toHaveLength(8);
    expect(lines(banner)[2]).toMatch(/█ {3}bindpdf$/);
  });

  it("uses the monochrome banner when NO_COLOR is set, and colour when it is empty", () => {
    expect(chooseBanner({ isTTY: true, env: { ...UTF8, NO_COLOR: "1" }, platform: "linux" })).not.toContain("\u001b");
    expect(chooseBanner({ isTTY: true, env: { ...UTF8, NO_COLOR: "" }, platform: "linux" })).toContain("\u001b");
  });

  it("falls back to the 7-bit ASCII banner when the console isn't UTF-8", () => {
    const banner = chooseBanner({ isTTY: false, env: { LANG: "C" }, platform: "linux" });
    expect([...banner].every((char) => char.charCodeAt(0) < 128)).toBe(true);
    expect(lines(banner)[2]).toMatch(/ {3}bindpdf$/);
  });

  it("treats Windows consoles as UTF-8", () => {
    expect(chooseBanner({ isTTY: false, env: {}, platform: "win32" })).toContain("▄");
  });

  it("uses the 24-bit mark with the tagline on truecolor terminals", () => {
    const banner = chooseBanner({ isTTY: true, env: { ...UTF8, COLORTERM: "truecolor" }, platform: "linux" });
    expect(banner).toContain("\u001b[0;48;2;242;194;48m");
    expect(lines(banner)).toHaveLength(8);
    expect(lines(banner).slice(2, 5).map((line) => line.split("\u001b[0m").at(-1))).toEqual([
      "   bindpdf",
      "   photos and PDFs in, one PDF out",
      "   runs locally, nothing is uploaded",
    ]);
    expect(chooseBanner({ isTTY: true, env: { ...UTF8, COLORTERM: "24bit" }, platform: "linux" })).toBe(banner);
  });

  it("uses the 256-colour mark on other colour terminals", () => {
    const banner = chooseBanner({ isTTY: true, env: UTF8, platform: "linux" });
    expect(banner).toContain("\u001b[");
    expect(banner).not.toContain(";2;");
    expect(lines(banner)[2]).toMatch(/ {3}bindpdf$/);
  });
});
