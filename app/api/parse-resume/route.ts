import { NextRequest, NextResponse } from "next/server";
import { parseResumeFile } from "@/lib/parseResume";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("resume");

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "No resume file provided under the 'resume' field." },
        { status: 400 }
      );
    }

    const MAX_BYTES = 10 * 1024 * 1024; // 10MB
    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: "File too large. Max 10MB." },
        { status: 400 }
      );
    }

    const { text, warnings } = await parseResumeFile(file);
    return NextResponse.json({ text, warnings });
  } catch (err) {
    console.error("parse-resume error:", err);
    const message = err instanceof Error ? err.message : "Failed to parse resume.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
