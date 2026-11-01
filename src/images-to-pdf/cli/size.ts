import { formatBytes, SMALLER } from "../application/compression";

/** PDFs larger than this get a tip suggesting compression. */
export const LARGE_PDF_BYTES = 20 * 1024 * 1024;

/** Suggests compressing when it would make the PDF clearly smaller, or returns null. */
export const sizeTip = (file: string, bytes: number, smallerEstimate: number): string | null =>
  smallerEstimate > bytes * 0.7
    ? null
    : `Tip: ${file} is ${formatBytes(bytes)}. Add --max-size ${SMALLER.maxSize} --quality ${SMALLER.quality} to make it about ${formatBytes(smallerEstimate)}.`;
