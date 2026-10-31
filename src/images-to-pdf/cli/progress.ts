/** A status line that is rewritten in place while slow work runs. */
export interface Progress {
  show(message: string): void;
  /** Erases the line, so prompts and final messages start on a clean line. */
  clear(): void;
}

const ERASE_LINE = "\r\x1b[2K";

/** Progress for a terminal stream: each message replaces the previous one. */
export const createLineProgress = (stream: { write(chunk: string): unknown }): Progress => {
  let shown = false;
  return {
    show(message) {
      stream.write(`${ERASE_LINE}${message}`);
      shown = true;
    },
    clear() {
      if (!shown) return;
      stream.write(ERASE_LINE);
      shown = false;
    },
  };
};
