# BindPDF

Turn a batch of photos into one PDF, right in your browser or from the terminal. Nothing is uploaded: every image is processed on your own computer.

Made for photos of book pages and documents: put them in order, give them all the same "scanned" look, and download a single PDF.

## Features

| Feature | What it does |
|---------|--------------|
| Batch upload | Drop many images at once, or pick them from a file dialog. JPG, PNG, WebP and GIF work. |
| Existing PDFs | Add PDFs next to the images: each one moves as one block and its pages go in as they are. |
| Page order | Drag pages to reorder them, or use the arrow buttons (keyboard friendly). |
| Rotation | Turn single pages, or a whole PDF, by quarter turns. The photo isn't re-encoded, so nothing is lost. |
| Sort by date | Orders pages by when each photo was taken (EXIF), falling back to the file's date. |
| Page size | Keep each image's size, or use A4 or Letter pages that turn to match each photo. |
| PDF size | Keep photos as they are, or make the PDF smaller or smallest, with an estimate of how much each choice weighs. |
| Adjustments | Brightness, contrast and saturation for the whole batch, with a live preview. |
| Presets | Built-in "Scanned" looks, plus your own presets saved in the browser. |

The terminal version (`bindpdf`) does the same, minus image previews. See [Command line](#command-line).

## Quick start

Open **[juanirod.github.io/bindpdf](https://juanirod.github.io/bindpdf/)**, drop your photos (and PDFs), put them in order and download the PDF. Nothing is uploaded.

Prefer the terminal? `npx bindpdf *.jpg -o book.pdf`, or see [Command line](#command-line).

## Command line

Needs Node.js 20.17+, 22.13+ or 23.5+. Install it globally, so `bindpdf` is on your PATH:

```bash
npm install -g bindpdf
```

Or run it once without installing:

```bash
npx bindpdf *.jpg -o book.pdf
```

```bash
bindpdf *.jpg --sort date --preset scanned-black-white -o book.pdf
bindpdf cover.png page-*.jpg --brightness 110 --contrast 130
bindpdf a.jpg b.jpg c.jpg --order 3,1,2
bindpdf cover.jpg contract.pdf scans/*.jpg -o all.pdf
bindpdf page-*.jpg --rotate 2:90,4:270
bindpdf *.jpg --max-size 1600 --quality 75 -o smaller.pdf
bindpdf -i *.jpg
```

| Option | What it does |
|--------|--------------|
| `-s, --sort date` | Sort by when each photo was taken (EXIF) or PDF created, else the file's date |
| `--order <list>` | Manual order of the listed files, e.g. `3,1,2` |
| `--rotate <list>` | Turn listed files clockwise by 90, 180 or 270, e.g. `3:90,5:270` (positions as listed, like `--order`) |
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

`--rotate` and the `r` key turn pages through the PDF's own page rotation, so photos aren't re-encoded and keep their quality and size. A PDF turns as a whole, adding to the rotation its pages already have.

Without adjustments, `--max-size` or `--quality`, photos go into the PDF exactly as they are, which is fastest but keeps their full size. For phone photos of documents, `--max-size 1600 --quality 75` usually makes the PDF around ten times smaller. When a PDF built without these options is larger than 20 MB, `bindpdf` prints a tip on stderr with the size it would have with them.

**Interactive mode** lists the files with their dates (and page count, for PDFs). Use ↑↓ to move, space to grab a page and drop it somewhere else, `r` to rotate it 90° clockwise, `s` to sort by date, `d` to remove a page and enter when you're done. Before the file name, it offers the PDF size (original, smaller or smallest) with an estimate of how much each one weighs. Flags you pass along with `-i` become the starting choices.

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

## Contributing

Issues and pull requests are welcome. [CONTRIBUTING.md](CONTRIBUTING.md) explains how to run the project locally, the checks a pull request needs, and how the web app and the CLI are released.

## License

[MIT](LICENSE)
