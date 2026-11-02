// Test helper: builds small PDFs with pdf-lib, so tests don't depend on files on disk.
import { PDFDocument } from "pdf-lib";

export interface PdfFixtureOptions {
  /** `null` leaves the creation date out; by default pdf-lib sets it to now. */
  readonly createdAt?: Date | null;
  /** Marks the PDF as encrypted, the way password-protected PDFs are. */
  readonly encrypted?: boolean;
}

/** A PDF with one blank page per size, in order. */
export const makePdfFixture = async (
  sizes: readonly (readonly [number, number])[],
  { createdAt, encrypted = false }: PdfFixtureOptions = {},
): Promise<Uint8Array<ArrayBuffer>> => {
  const pdf = await PDFDocument.create({ updateMetadata: createdAt !== null });
  for (const size of sizes) pdf.addPage([...size]);
  if (createdAt) pdf.setCreationDate(createdAt);
  if (encrypted) pdf.context.trailerInfo.Encrypt = pdf.context.obj({ Filter: "Standard" });
  return new Uint8Array(await pdf.save({ useObjectStreams: false }));
};
