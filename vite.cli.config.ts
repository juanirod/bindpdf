import { chmod } from "node:fs/promises";
import { join } from "node:path";
import { defineConfig, type Plugin } from "vite";

// npm link only marks the bin executable once; each rebuild recreates the file, so restore the bit here.
const executableBin = (): Plugin => ({
  name: "executable-bin",
  async writeBundle(options, bundle) {
    for (const file of Object.keys(bundle)) await chmod(join(options.dir!, file), 0o755);
  },
});

// Builds the command-line app into a single Node script; dependencies stay external.
export default defineConfig({
  plugins: [executableBin()],
  build: {
    ssr: "src/images-to-pdf/cli/main.ts",
    outDir: "dist-cli",
    target: "node20",
    rollupOptions: {
      output: { entryFileNames: "bindpdf.js", banner: "#!/usr/bin/env node" },
    },
  },
});
