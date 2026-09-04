// Extracts plain text from an uploaded resume file (PDF or DOCX).
// Used only by app/api/parse-resume/route.ts.

export async function parseResumeFile(
  file: File
): Promise<{ text: string; warnings: string[] }> {
  const warnings: string[] = [];
  const name = file.name.toLowerCase();
  const buffer = Buffer.from(await file.arrayBuffer());

  let text = "";

  if (name.endsWith(".pdf") || file.type === "application/pdf") {
    // pdf-parse v2 exposes a class-based API rather than the old default-export function.
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: buffer });
    try {
      const result = await parser.getText();
      // Join pages ourselves — result.text includes "-- N of M --" page
      // separators that we don't want leaking into the resume text.
      text = result.pages.map((p) => p.text).join("\n\n");
    } finally {
      await parser.destroy();
    }
  } else if (
    name.endsWith(".docx") ||
    file.type ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ buffer });
    text = result.value;
    if (result.messages?.length) {
      warnings.push(
        `${result.messages.length} formatting note(s) from DOCX conversion (usually safe to ignore).`
      );
    }
  } else if (name.endsWith(".txt") || file.type === "text/plain") {
    text = buffer.toString("utf-8");
  } else {
    throw new Error(
      "Unsupported file type. Please upload a PDF, DOCX, or TXT resume."
    );
  }

  const cleaned = text.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();

  if (!cleaned) {
    warnings.push(
      "No extractable text found — this may be a scanned/image-only PDF. Try pasting the text manually."
    );
  }

  return { text: cleaned, warnings };
}
