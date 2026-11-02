# Changelog

Notable changes to BindPDF: the web app and the `bindpdf` command line. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [0.2.0] - 2026-11-01

### Added

- Existing PDFs can join the batch next to images, in the web app and the CLI (`bindpdf cover.jpg contract.pdf scans/*.jpg -o all.pdf`). Each PDF moves as one block, and its pages go in as they are: adjustments, presets, `--max-size`, `--quality` and `--page-size` don't change them.
- `--sort date` orders PDFs by their creation date, falling back to the file's date.
- Password-protected or damaged PDFs are skipped with a warning naming the file.
- The web app shows each PDF as a card with a PDF logo and its page count.
- Releases are published to npm from GitHub Actions with trusted publishing, with provenance.

### Changed

- Page counts in messages (`Wrote all.pdf (12 pages).`), in interactive mode and in the web app count every page of each PDF.

## [0.1.0] - 2026-11-01

First release on npm: `npm install -g bindpdf` or `npx bindpdf`.

### Added

- Web app that turns a batch of images (JPG, PNG, WebP, GIF) into one PDF, entirely in the browser: reorder pages, sort by date, page size, adjustments with a live preview, and presets.
- `bindpdf` command line with the same features, minus previews: `--sort date`, `--order`, `--preset`, `--brightness`, `--contrast`, `--saturation`, `--save-preset`, `--page-size`, `--list-presets` and `--delete-preset`.
- Interactive mode (`-i`) to reorder pages and pick adjustments, page size, PDF size and file name in the terminal.
- `--max-size` and `--quality` for smaller PDFs, and a PDF size choice in the web app with an estimate per option. Large PDFs built without them get a tip with the size they would have.
- Progress line while `bindpdf` reads, adjusts and writes.

### Fixed

- Sideways JPEGs are turned upright using their EXIF orientation.

### Security

- `sharp` upgraded to 0.35.5 to patch libvips and libheif vulnerabilities.

[Unreleased]: https://github.com/juanirod/bindpdf/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/juanirod/bindpdf/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/juanirod/bindpdf/releases/tag/v0.1.0
