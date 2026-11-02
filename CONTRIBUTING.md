# Contributing to BindPDF

Issues and pull requests are welcome. This guide covers running the project locally, the checks a pull request needs, and how the web app and the CLI are published.

## Running it locally

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

To try your local checkout of the CLI, build it and link it, so `bindpdf` on your PATH runs your code:

```bash
npm run build:cli
npm link
```

To go back to the published version: `npm unlink -g bindpdf && npm install -g bindpdf`.

The README's [How the code is organized](README.md#how-the-code-is-organized) explains where each part lives.

## Pull requests

Before opening a PR, make sure `npm test`, `npm run build` and `npm run build:cli` pass. CI runs them on every pull request, on Node 20, 22 and 24.

Add user-facing changes to the `Unreleased` section of [CHANGELOG.md](CHANGELOG.md) in the same PR.

`main` can't be force-pushed or deleted, and merged branches are deleted automatically.

## Deploying the web app

Every push to `main` runs the tests, builds the site and publishes it to GitHub Pages through `.github/workflows/deploy.yml`.

To turn it on in a new repo: **Settings → Pages → Build and deployment → Source: GitHub Actions**.

## Releasing the CLI

Pushing a `v*` tag publishes the CLI to npm through `.github/workflows/publish.yml`, using npm trusted publishing (no npm token stored in GitHub, and each version gets provenance). The tag must match the `version` in `package.json`.

1. Move the `Unreleased` notes in [CHANGELOG.md](CHANGELOG.md) under the new version, with its date and compare link, and commit.
2. Bump the version and push it with its tag:

   ```bash
   npm version minor -m "chore(release): %s"   # or patch; commits and creates the v* tag
   git push --follow-tags
   ```

3. Once the workflow has published, create the GitHub release from the changelog notes:

   ```bash
   gh release create v0.4.0 --title v0.4.0 --notes-file notes.md
   ```

Use `minor` for new features and `patch` for fixes while the version is below 1.0.
