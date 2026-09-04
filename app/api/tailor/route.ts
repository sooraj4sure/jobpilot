import { NextRequest, NextResponse } from "next/server";
import { callGemini, GeminiApiError } from "@/lib/gemini";
import {
  SYSTEM_PROMPT_TAILORING,
  buildTailoringPrompt,
  SYSTEM_PROMPT_VERIFICATION,
  buildVerificationPrompt,
} from "@/lib/prompts";
import type { TailorResult, VerificationResult, MatchResult } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const { originalBullets, jdText, gapAnalysis } = await req.json() as {
      originalBullets: string;
      jdText: string;
      gapAnalysis: MatchResult;
    };

    if (!originalBullets?.trim() || !jdText?.trim() || !gapAnalysis) {
      return NextResponse.json(
        { error: "originalBullets, jdText, and gapAnalysis are all required." },
        { status: 400 }
      );
    }

    // --- Pass 1: generation ---
    const generated = await callGemini<TailorResult>(
      SYSTEM_PROMPT_TAILORING,
      buildTailoringPrompt(originalBullets, jdText, JSON.stringify(gapAnalysis)),
      { temperature: 0.4, maxOutputTokens: 3000 }
    );

    if (!Array.isArray(generated.tailored_bullets)) {
      throw new Error("Tailoring response did not match the expected schema.");
    }

    // --- Pass 2: verification (separate call per bullet, run in parallel) ---
    // A single model checking its own work in the same call is not a
    // reliable guardrail, so this is deliberately a distinct call with its
    // own system prompt and no memory of having just written the bullet.
    const verifiedBullets = await Promise.all(
      generated.tailored_bullets.map(async (bullet) => {
        try {
          const verification = await callGemini<VerificationResult>(
            SYSTEM_PROMPT_VERIFICATION,
            buildVerificationPrompt(bullet.original, bullet.tailored),
            { temperature: 0, maxOutputTokens: 1000 }
          );

          if (verification.has_unsupported_claim) {
            // Reject the tailored version and fall back to the original
            // rather than serving a possibly-hallucinated claim.
            return {
              ...bullet,
              tailored: bullet.original,
              changes_made:
                "Reverted to original — the tailored version introduced an unsupported claim.",
              verification: {
                has_unsupported_claim: true,
                unsupported_claims: verification.unsupported_claims || [],
                used_fallback: true,
              },
            };
          }

          return {
            ...bullet,
            verification: {
              has_unsupported_claim: false,
              unsupported_claims: [],
              used_fallback: false,
            },
          };
        } catch (verifyErr) {
          // If verification itself fails, fail safe: fall back to the
          // original bullet rather than trusting an unverified rewrite.
          console.error("verification pass error:", verifyErr);
          return {
            ...bullet,
            tailored: bullet.original,
            changes_made:
              "Reverted to original — the verification check could not be completed.",
            verification: {
              has_unsupported_claim: false,
              unsupported_claims: [],
              used_fallback: true,
            },
          };
        }
      })
    );

    const result: TailorResult = {
      ...generated,
      tailored_bullets: verifiedBullets,
    };

    return NextResponse.json(result);
  } catch (err) {
    console.error("tailor error:", err);
    const status = err instanceof GeminiApiError && err.status ? err.status : 500;
    const message = err instanceof Error ? err.message : "Failed to generate tailored content.";
    return NextResponse.json({ error: message }, { status });
  }
}
