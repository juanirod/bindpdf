import { readFile, stat } from "node:fs/promises";
import { basename } from "node:path";
import type { ImageSource } from "../../application/load-image";

export const readImageFile = async (path: string): Promise<ImageSource> => {
  const [bytes, info] = await Promise.all([readFile(path), stat(path)]);
  return { name: basename(path), bytes: new Uint8Array(bytes), lastModified: info.mtimeMs };
};
