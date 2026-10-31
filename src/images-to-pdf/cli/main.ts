import { writeFile } from "node:fs/promises";
import { version } from "../../../package.json";
import { createFilePresetStore } from "../infrastructure/node/file-preset-store";
import { readImageFile } from "../infrastructure/node/read-image-file";
import { sharpCodec } from "../infrastructure/node/sharp-codec";
import { interact } from "./interactive";
import { createLineProgress } from "./progress";
import { runCli } from "./run";

// On stderr, so piped stdout stays clean.
const progress = process.stderr.isTTY ? createLineProgress(process.stderr) : undefined;

process.exitCode = await runCli(process.argv.slice(2), {
  codec: sharpCodec,
  presets: createFilePresetStore(),
  readImageFile,
  writeFile,
  out: (line) => {
    progress?.clear();
    console.log(line);
  },
  err: (line) => {
    progress?.clear();
    console.error(line);
  },
  version,
  ...(progress && { progress }),
  ...(process.stdin.isTTY && process.stdout.isTTY && { interact }),
});
