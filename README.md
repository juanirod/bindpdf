# pdfy

Turn a batch of photos into one PDF, right in your browser. Nothing is uploaded: every image is processed on your own computer.

Made for photos of book pages and documents: put them in order, give them all the same "scanned" look, and download a single PDF.

## Features

| Feature | What it does |
|---------|--------------|
| Batch upload | Drop many images at once, or pick them from a file dialog. JPG, PNG, WebP and GIF work. |
| Page order | Drag pages to reorder them, or use the arrow buttons (keyboard friendly). |
| Sort by date | Orders pages by when each photo was taken (EXIF), falling back to the file's date. |
| Page size | Keep each image's size, or use A4 or Letter pages that turn to match each photo. |
| Adjustments | Brightness, contrast and saturation for the whole batch, with a live preview. |
| Presets | Built-in "Scanned" looks, plus your own presets saved in the browser. |

## Quick start

Requires Node.js 20 or later.

```bash
npm install
npm run dev     # open http://localhost:5173
```

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start the dev server |
| `npm test` | Run the test suite (Vitest) |
| `npm run build` | Type-check and build the static site into `dist/` |

## How the code is organized

The code is grouped by feature, and the browser-only parts are kept away from the logic so it can be tested without a DOM.

```
src/images-to-pdf/
  domain/          pure rules: batch order, date sorting, pixel adjustments, presets
  application/     builds the PDF from a batch (pdf-lib)
  infrastructure/  browser adapters: file reading, EXIF dates, canvas, localStorage
  ui/              the page and the adjustments panel
```

## Deploying

Every push to `main` runs the tests, builds the site and publishes it to GitHub Pages through `.github/workflows/deploy.yml`.

To turn it on in a new repo: **Settings → Pages → Build and deployment → Source: GitHub Actions**.

## Contributing

Issues and pull requests are welcome. Before opening a PR, make sure `npm test` and `npm run build` pass.

## License

[MIT](LICENSE)
