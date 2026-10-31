import { writeFile } from "node:fs/promises";
import { version } from "../../../package.json";
import { createFilePresetStore } from "../infrastructure/node/file-preset-store";
import { readImageFile } from "../infrastructure/node/read-image-file";
import { sharpCodec } from "../infrastructure/node/sharp-codec";
import { runCli } from "./run";

process.exitCode = await runCli(process.argv.slice(2), {
  codec: sharpCodec,
  presets: createFilePresetStore(),
  readImageFile,
  writeFile,
  out: (line) => console.log(line),
  err: (line) => console.error(line),
  version,
});
