# BindPDF brand kit: "Spine"

Loose sheets held together by a yellow binder clip, drawn as pixel art on a
24×24 grid. Every SVG is plain `<rect>`s on an integer grid with
`shape-rendering="crispEdges"`: no fonts, no bitmaps, no metadata. Scale only
by whole numbers (2×, 3×, 4×…) to keep every pixel sharp.

## Files

| File | What it is | Grid | Use on |
|---|---|---|---|
| `bindpdf-mark.svg` | Mark (symbol only), light | 24×24 | `#e9edf2` or white |
| `bindpdf-mark-dark.svg` | Mark, dark | 24×24 | `#161b25` |
| `bindpdf-logo.svg` | Horizontal logo, light | 93×24 | `#e9edf2` or white |
| `bindpdf-logo-dark.svg` | Horizontal logo, dark | 93×24 | `#161b25` |
| `favicon.svg` | 16×16 cut: two sheets, no text lines, thicker clip | 16×16 | browser tabs |
| `favicon-dark.svg` | Same cut, dark colours | 16×16 | dark UI chrome |
| `favicon.ico` | 16 + 32 px, from the light cut | — | legacy browsers |
| `favicon-16.png`, `favicon-32.png` | PNG exports of the light cut | — | anywhere SVG isn't accepted |
| `bindpdf-mark.ansi` | Terminal mark, 24-bit colour, for dark terminals | 16 cols × 8 rows | CLI |
| `bindpdf-mark-light.ansi` | Terminal mark, 24-bit colour, for light terminals | 16 × 8 | CLI |
| `bindpdf-mark-256.ansi` | Terminal mark, 256-colour fallback | 16 × 8 | CLI |
| `bindpdf-banner.txt` | Monochrome banner (Unicode blocks) + tagline | 52 × 8 | `NO_COLOR`, README |
| `bindpdf-banner-ascii.txt` | Pure 7-bit ASCII banner + tagline | 53 × 7 | non-UTF-8 consoles |

The SVGs have transparent backgrounds. The light versions are drawn for
`#e9edf2` (they also work on white, so on GitHub's light theme); the dark
versions are drawn for `#161b25` (they also work on GitHub's `#0d1117`).

## README

GitHub picks the right logo for the viewer's theme with `<picture>`:

```html
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/brand/bindpdf-logo-dark.svg">
  <img alt="BindPDF" src="docs/brand/bindpdf-logo.svg" width="372" height="96">
</picture>
```

Keep `width`/`height` at a whole multiple of 93×24 (186×48, 279×72,
372×96…).

## Web app

```html
<link rel="icon" href="/favicon.ico" sizes="32x32">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
```

The favicon is drawn on its own 16×16 grid instead of shrinking the 24×24
mark. At 32 px it renders at exactly 2×.

## CLI help screen

Each `.ansi` file is 8 lines; every line is exactly 16 cells wide and ends
with a reset (`ESC[0m`). Transparent pixels use the terminal's own background.
The mark is drawn with `▀`, coloured top half (foreground) over bottom half
(background).

Suggested selection:

1. Output isn't a TTY, or `NO_COLOR` is set → `bindpdf-banner.txt`
   (`bindpdf-banner-ascii.txt` if the console isn't UTF-8).
2. `COLORTERM` is `truecolor` or `24bit` → `bindpdf-mark.ansi`.
3. Otherwise → `bindpdf-mark-256.ansi`.

To build the banner, print each mark line, then three spaces and a text line
on lines 3–5 (as in `bindpdf-banner.txt`). That keeps the banner under 60
columns as long as the text stays within 41.

## Palette

| Role | Light | Dark |
|---|---|---|
| Background | `#e9edf2` | `#161b25` |
| Ink (outlines, wordmark) | `#1b2230` | `#e7ebf2` (wordmark) / `#c9d0db` (sheet outlines) |
| Sheet paper | `#ffffff` | `#232a38` |
| Back sheet, text lines | `#c9d0db` | `#5a6478` |
| Clip | `#f2c230` | `#f2c230` |
| Clip outline | `#1b2230` | `#1b2230` |
| Clip shine | `#ffffff` | `#ffffff` |
| PDF red (sparingly; unused in the logo) | `#d63b2a` | `#d63b2a` |

In the 256-colour fallback: clip `220`, outlines `252`, back sheet `60`,
paper `236`, ink `235`, handle `255`, shine `231`.
