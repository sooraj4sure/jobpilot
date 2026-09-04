import { NextRequest, NextResponse } from "next/server";
import { callGemini, GeminiApiError } from "@/lib/gemini";
import {
  SYSTEM_PROMPT_INTERVIEW_QUESTIONS,
  buildInterviewQuestionsPrompt,
} from "@/lib/prompts";
import type { InterviewResult, MatchResult } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const { jdText, gapAnalysis } = (await req.json()) as {
      jdText: string;
      gapAnalysis: MatchResult;
    };

    if (!jdText?.trim() || !gapAnalysis) {
      return NextResponse.json(
        { error: "jdText and gapAnalysis are both required." },
        { status: 400 }
      );
    }

    const result = await callGemini<InterviewResult>(
      SYSTEM_PROMPT_INTERVIEW_QUESTIONS,
      buildInterviewQuestionsPrompt(
        jdText,
        JSON.stringify(gapAnalysis.gaps),
        JSON.stringify(gapAnalysis.matched_requirements)
      ),
      { temperature: 0.5, maxOutputTokens: 8000 }
    );

    if (
      !Array.isArray(result.technical_questions) ||
      !Array.isArray(result.behavioral_questions) ||
      !Array.isArray(result.gap_probing_questions)
    ) {
      throw new Error("Interview questions response did not match the expected schema.");
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error("interview-questions error:", err);
    const status = err instanceof GeminiApiError && err.status ? err.status : 500;
    const message = err instanceof Error ? err.message : "Failed to generate interview questions.";
    return NextResponse.json({ error: message }, { status });
  }
}
