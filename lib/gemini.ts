// Single shared helper for every Gemini call across the three JobPilot
// features. Swap the system/user prompt strings per call site — see
// app/api/*/route.ts for usage.
//
// Model: gemini-3.6-flash (stable model ID, confirmed against Google's
// current Gemini API docs as of this writing). If Google deprecates it,
// the 404 branch below surfaces a clear error instead of a silent failure —
// check https://ai.google.dev/gemini-api/docs/models for the current
// recommended replacement if that happens.

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.6-flash";

export interface GeminiCallOptions {
  temperature?: number;
  maxOutputTokens?: number;
}

export class GeminiApiError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = "GeminiApiError";
    this.status = status;
  }
}

export async function callGemini<T = unknown>(
  systemPrompt: string,
  userPrompt: string,
  options: GeminiCallOptions = {}
): Promise<T> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new GeminiApiError(
      "GEMINI_API_KEY is not set. Add it to .env.local (see .env.example)."
    );
  }

  const { temperature = 0.4, maxOutputTokens = 1500 } = options;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

   const MAX_RETRIES = 1;
  let response: Response;
  let errBody: { error?: { message?: string; details?: unknown[] } } | null = null;

  for (let attempt = 0; ; attempt++) {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: "user", parts: [{ text: userPrompt }] }],
        generationConfig: {
          temperature,
          maxOutputTokens,
          // Ask Gemini to guarantee valid JSON directly, rather than relying
          // solely on the "return only JSON" instruction in plain text.
          responseMimeType: "application/json",
          thinkingConfig: { thinkingLevel: "low" },
        },
      }),
    });

    if (response.ok) break;

    errBody = await response.json().catch(() => null);

    if ((response.status === 429 || response.status === 503) && attempt < MAX_RETRIES) {
      const retryInfo = errBody?.error?.details?.find(
        (d): d is { "@type"?: string; retryDelay?: string } =>
          typeof d === "object" && d !== null && "@type" in d && String((d as { "@type"?: string })["@type"]).includes("RetryInfo")
      );
      // 503s don't include a RetryInfo delay like 429s do, so fall back to
      // a short fixed backoff that grows with each attempt.
      const delaySeconds = parseFloat(retryInfo?.retryDelay ?? "") || 3 * (attempt + 1);
      console.warn(`Gemini ${response.status}. Retrying in ${delaySeconds}s...`);
      await new Promise((r) => setTimeout(r, delaySeconds * 1000));
      continue;
    }

    // Catch the "model deprecated, use X instead" pattern specifically so
    // it's obvious in logs what happened, rather than a generic 404.
    if (
      response.status === 404 &&
      errBody?.error?.message?.includes("no longer available")
    ) {
      throw new GeminiApiError(
        `Gemini model deprecated: ${errBody.error.message}. Check Google's ` +
          `current docs for the recommended replacement — this codebase is ` +
          `still using the generateContent endpoint with model "${GEMINI_MODEL}".`,
        404
      );
    }

    throw new GeminiApiError(
      `Gemini API error ${response.status}: ${JSON.stringify(errBody)}`,
      response.status
    );
  }
  const data = await response.json();
  const raw: string = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";

  if (!raw) {
    throw new GeminiApiError(
      "Gemini returned an empty response (possibly blocked by safety filters " +
        "or truncated by maxOutputTokens)."
    );
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    // Defensive fallback in case responseMimeType isn't honored for some
    // edge case and the model wraps the JSON in markdown fences.
    const clean = raw.replace(/```json|```/g, "").trim();
    try {
      return JSON.parse(clean) as T;
    } catch {
      throw new GeminiApiError(
        `Gemini response was not valid JSON: ${raw.slice(0, 300)}`
      );
    }
  }
}
