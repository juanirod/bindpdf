// The brand mark shown above the help screen, picked the way docs/brand/BRAND.md describes.
import plainBanner from "../../../docs/brand/bindpdf-banner.txt?raw";
import asciiBanner from "../../../docs/brand/bindpdf-banner-ascii.txt?raw";
import mark256 from "../../../docs/brand/bindpdf-mark-256.ansi?raw";
import markTrueColor from "../../../docs/brand/bindpdf-mark.ansi?raw";

/** What the banner depends on: where help is printed and how the terminal is set up. */
export interface Terminal {
  readonly isTTY: boolean;
  readonly env: Readonly<Record<string, string | undefined>>;
  readonly platform: string;
}

const TAGLINE = ["bindpdf", "photos and PDFs in, one PDF out", "runs locally, nothing is uploaded"];

/** Puts the tagline to the right of lines 3 to 5 of a coloured mark, 3 spaces after it. */
const withTagline = (mark: string) =>
  mark
    .trimEnd()
    .split("\n")
    .map((line, index) => (index >= 2 && index < 2 + TAGLINE.length ? `${line}   ${TAGLINE[index - 2]}` : line))
    .join("\n");

const isUtf8 = ({ env, platform }: Terminal) =>
  platform === "win32" || /utf-?8/i.test(env.LC_ALL || env.LC_CTYPE || env.LANG || "");

/**
 * Monochrome when output isn't a terminal or NO_COLOR is set (7-bit ASCII when the console isn't UTF-8),
 * 24-bit colour when COLORTERM says so, 256 colours otherwise.
 */
export const chooseBanner = (terminal: Terminal): string => {
  const { isTTY, env } = terminal;
  if (!isTTY || (env.NO_COLOR ?? "") !== "") return (isUtf8(terminal) ? plainBanner : asciiBanner).trimEnd();
  if (env.COLORTERM === "truecolor" || env.COLORTERM === "24bit") return withTagline(markTrueColor);
  return withTagline(mark256);
};
