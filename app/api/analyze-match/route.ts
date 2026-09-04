import { NextRequest, NextResponse } from "next/server";
import { callGemini, GeminiApiError } from "@/lib/gemini";
import { SYSTEM_PROMPT_MATCHING, buildMatchingPrompt } from "@/lib/prompts";
import type { MatchResult } from "@/lib/types";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { resumeText, jdText } = await req.json();

    if (!resumeText?.trim() || !jdText?.trim()) {
      return NextResponse.json(
        { error: "Both resumeText and jdText are required." },
        { status: 400 }
      );
    }

    const result = await callGemini<MatchResult>(
      SYSTEM_PROMPT_MATCHING,
      buildMatchingPrompt(resumeText, jdText),
      { temperature: 0.2, maxOutputTokens: 4000 }
    );

    // Light shape validation — Gemini's responseMimeType guarantees valid
    // JSON syntax, but not that it matches our schema.
    if (
      typeof result.match_score !== "number" ||
      !Array.isArray(result.matched_requirements) ||
      !Array.isArray(result.gaps)
    ) {
      throw new Error("Match analysis response did not match the expected schema.");
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error("analyze-match error:", err);
    const status = err instanceof GeminiApiError && err.status ? err.status : 500;
    const message = err instanceof Error ? err.message : "Failed to analyze match.";
    return NextResponse.json({ error: message }, { status });
  }
}
