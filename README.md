# BindPDF

Turn a batch of photos into one PDF, right in your browser or from the terminal. Nothing is uploaded: every image is processed on your own computer.

Made for photos of book pages and documents: put them in order, give them all the same "scanned" look, and download a single PDF.

## Features

| Feature | What it does |
|---------|--------------|
| Batch upload | Drop many images at once, or pick them from a file dialog. JPG, PNG, WebP and GIF work. |
| Existing PDFs | Add PDFs next to the images: each one moves as one block and its pages go in as they are. |
| Page order | Drag pages to reorder them, or use the arrow buttons (keyboard friendly). |
| Sort by date | Orders pages by when each photo was taken (EXIF), falling back to the file's date. |
| Page size | Keep each image's size, or use A4 or Letter pages that turn to match each photo. |
| PDF size | Keep photos as they are, or make the PDF smaller or smallest, with an estimate of how much each choice weighs. |
| Adjustments | Brightness, contrast and saturation for the whole batch, with a live preview. |
| Presets | Built-in "Scanned" looks, plus your own presets saved in the browser. |

The terminal version (`bindpdf`) does the same, minus image previews. See [Command line](#command-line).

## Quick start

Requires Node.js 20.17 or later (22.13+ on Node 22).

```bash
npm install
npm run dev     # open http://localhost:5173
```

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start the dev server |
| `npm test` | Run the test suite (Vitest) |
| `npm run build` | Type-check and build the static site into `dist/` |
| `npm run build:cli` | Type-check and build the command-line app into `dist-cli/` |

## Command line

Needs Node.js 20.17+, 22.13+ or 23.5+. Install it globally, so `bindpdf` is on your PATH:

```bash
npm install -g bindpdf
```

Or run it once without installing:

```bash
npx bindpdf *.jpg -o book.pdf
```

To run your local checkout instead, build it and link it:

```bash
npm install
npm run build:cli
npm link
```

```bash
bindpdf *.jpg --sort date --preset scanned-black-white -o book.pdf
bindpdf cover.png page-*.jpg --brightness 110 --contrast 130
bindpdf a.jpg b.jpg c.jpg --order 3,1,2
bindpdf cover.jpg contract.pdf scans/*.jpg -o all.pdf
bindpdf *.jpg --max-size 1600 --quality 75 -o smaller.pdf
bindpdf -i *.jpg
```

| Option | What it does |
|--------|--------------|
| `-s, --sort date` | Sort by when each photo was taken (EXIF) or PDF created, else the file's date |
| `--order <list>` | Manual order of the listed files, e.g. `3,1,2` |
| `-p, --preset <name>` | Start from a preset, by name or id (see `--list-presets`) |
| `-b, --brightness <n>` | 50 to 150, 100 leaves the image unchanged |
| `-c, --contrast <n>` | 50 to 200, 100 leaves the image unchanged |
| `--saturation <n>` | 0 to 200, 0 is black & white |
| `--save-preset <name>` | Save the resulting adjustments as a preset |
| `-o, --output <file>` | PDF to write (default: `images.pdf`) |
| `--page-size <size>` | `image` (default), `a4` or `letter` |
| `--max-size <px>` | Shrink images whose longest side is larger, from 100 to 20000 |
| `--quality <n>` | JPEG quality from 1 to 100 (default 92); re-encodes every JPEG |
| `-i, --interactive` | Choose order, adjustments, page size and file name step by step |
| `--list-presets` | List built-in and saved presets |
| `--delete-preset <name>` | Delete a saved preset |

Without `--sort` or `--order`, pages follow the order you list the files in.

**PDFs** can be listed next to images. Each one moves as one block with all its pages, which go into the new PDF as they are: adjustments, presets, `--max-size`, `--quality` and `--page-size` don't change them. Password-protected or damaged PDFs are skipped with a warning, like files that aren't images.

Without adjustments, `--max-size` or `--quality`, photos go into the PDF exactly as they are, which is fastest but keeps their full size. For phone photos of documents, `--max-size 1600 --quality 75` usually makes the PDF around ten times smaller. When a PDF built without these options is larger than 20 MB, `bindpdf` prints a tip on stderr with the size it would have with them.

**Interactive mode** lists the files with their dates (and page count, for PDFs). Use ↑↓ to move, space to grab a page and drop it somewhere else, `s` to sort by date, `d` to remove a page and enter when you're done. Before the file name, it offers the PDF size (original, smaller or smallest) with an estimate of how much each one weighs. Flags you pass along with `-i` become the starting choices.

Saved presets live in `~/.config/bindpdf/presets.json` (or `$XDG_CONFIG_HOME/bindpdf/`). They are separate from the presets saved in the browser.

While it reads, adjusts and writes, a status line on stderr shows how far along it is (only in a terminal, so piped output stays clean).

Exit codes: `0` done, `1` failed, `2` wrong usage, `130` cancelled.

## How the code is organized

The code is grouped by feature. The web page and the command line share the domain and application code; only the adapters differ. The application declares two ports (`ImageCodec` to decode and encode pixels, `PresetStore` to keep presets), and each platform plugs its own in.

```
src/images-to-pdf/
  domain/                   pure rules: batch order, date sorting, EXIF dates, pixel adjustments, presets
  application/              loads and adjusts images, builds the PDF (pdf-lib), declares the ports
  infrastructure/browser/   canvas codec, localStorage presets
  infrastructure/node/      sharp codec, presets file, reading files from disk
  ui/                       the web page and the adjustments panel
  cli/                      flags, interactive prompts and the bindpdf entry point
```

## Deploying

Every push to `main` runs the tests, builds the site and publishes it to GitHub Pages through `.github/workflows/deploy.yml`.

To turn it on in a new repo: **Settings → Pages → Build and deployment → Source: GitHub Actions**.

## Releasing the CLI

Pushing a `v*` tag publishes the CLI to npm through `.github/workflows/publish.yml`, using npm trusted publishing (no npm token stored in GitHub). The tag must match the `version` in `package.json`:

```bash
npm version patch   # bumps package.json, commits and creates the v* tag
git push --follow-tags
```

Before tagging, move the `Unreleased` notes in [CHANGELOG.md](CHANGELOG.md) under the new version.

## Contributing

Issues and pull requests are welcome. Before opening a PR, make sure `npm test`, `npm run build` and `npm run build:cli` pass. CI runs them on every pull request, on Node 20, 22 and 24.

## License

[MIT](LICENSE)
