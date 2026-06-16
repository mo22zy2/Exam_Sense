/**
 * Extract text from a PDF buffer using pdf-parse.
 * Returns isEmpty=true when extracted text is below 50 characters
 * (signals scanned/image-only PDF).
 */
export async function extractText(buffer: ArrayBuffer): Promise<{
  text: string;
  isEmpty: boolean;
}> {
  const buf = Buffer.from(buffer);

  try {
    // pdf-parse exports PDFParse class (named export)
    const pdfParseModule = await import("pdf-parse");
    const PDFParse: any = pdfParseModule.PDFParse;

    if (!PDFParse) {
      return { text: "[PDF parser not available]", isEmpty: true };
    }

    const parser = new PDFParse({ data: buf });
    await parser.load();
    const text: string = (await parser.getText()) ?? "";

    const trimmed = text.trim();
    const isEmpty = trimmed.length < 50;

    return { text: trimmed, isEmpty };
  } catch {
    return { text: "", isEmpty: true };
  }
}
