import { defineConfig } from "vite";

// Builds the command-line app into a single Node script; dependencies stay external.
export default defineConfig({
  build: {
    ssr: "src/images-to-pdf/cli/main.ts",
    outDir: "dist-cli",
    target: "node20",
    rollupOptions: {
      output: { entryFileNames: "bindpdf.js", banner: "#!/usr/bin/env node" },
    },
  },
});
