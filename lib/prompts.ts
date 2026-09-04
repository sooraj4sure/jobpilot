// All prompt text lives here so the API routes stay focused on plumbing.
// Each "build*Prompt" function returns the user-turn text for one call;
// the SYSTEM_PROMPT_* constants are the matching system instructions.

// ---------------------------------------------------------------------------
// Feature 1 — Resume <-> JD matching and gap analysis
// ---------------------------------------------------------------------------

export const SYSTEM_PROMPT_MATCHING = `You are a precise resume-to-job-description analyst. You only work with information
explicitly present in the resume and job description provided to you. You never
infer, assume, or invent skills, experience, or qualifications that are not
explicitly stated in the source text.

Your output must be valid JSON matching the exact schema provided. Do not include
any text outside the JSON object — no preamble, no markdown code fences, no
explanation.`;

export function buildMatchingPrompt(resumeText: string, jdText: string): string {
  return `RESUME:
"""
${resumeText}
"""

JOB DESCRIPTION:
"""
${jdText}
"""

Analyze the match between this resume and job description. Follow these rules:

1. MATCH SCORE: Calculate a 0-100 fit score based on how well the resume's stated
   skills, experience, and qualifications align with the JD's explicit requirements.
   Do not be generous — a partial or tangential match should score lower, not higher.

2. MATCHED REQUIREMENTS: List each JD requirement that is clearly and explicitly
   supported by something in the resume. For each, quote or closely paraphrase the
   exact resume evidence that supports it.

3. GAPS: List each JD requirement that is NOT clearly supported by the resume.
   Classify each gap as one of:
   - "missing": not mentioned anywhere in the resume
   - "underdeveloped": mentioned but with weaker/more basic language than the JD
     implies is needed (e.g., resume says "basic Docker", JD implies production-level use)
   - "unclear": resume is ambiguous about whether this requirement is met

4. Do NOT round up. If the resume says "basic" or "familiar with", treat that as
   underdeveloped, not matched. If something is not mentioned at all, it is missing,
   even if it seems like a natural adjacent skill to something the resume does mention.

Return ONLY this JSON structure:
{
  "match_score": <integer 0-100>,
  "matched_requirements": [
    {
      "requirement": "<JD requirement text>",
      "resume_evidence": "<exact or closely paraphrased quote from resume>"
    }
  ],
  "gaps": [
    {
      "requirement": "<JD requirement text>",
      "gap_type": "missing" | "underdeveloped" | "unclear",
      "notes": "<brief explanation, e.g. what the resume shows vs. what's needed>"
    }
  ],
  "summary": "<2-3 sentence plain-language summary of overall fit>"
}`;
}

// ---------------------------------------------------------------------------
// Feature 2 — Tailored bullets + cover letter paragraph (grounding guardrail)
// ---------------------------------------------------------------------------

export const SYSTEM_PROMPT_TAILORING = `You are a resume-tailoring assistant. Your job is to rephrase and reprioritize
EXISTING resume content to better match a job description. You are strictly
forbidden from adding any skill, tool, technology, metric, or achievement that is
not explicitly present in the original resume text provided to you.

You may:
- Reorder or re-emphasize existing bullets
- Rephrase existing achievements using terminology that matches the JD's language
  (e.g., if resume says "built a prediction model" and JD says "developed ML
  solutions", you may align the phrasing)
- Select which existing bullets to feature more prominently

You may NOT:
- Add tools, frameworks, or technologies not in the original resume
- Upgrade the scope of an achievement (e.g., turning "assisted with" into "led")
- Add metrics or numbers not present in the original
- Imply years of experience or seniority not stated

If the JD requires something genuinely absent from the resume, do not fabricate
coverage for it — simply do not force a bullet to address it.

Output only valid JSON matching the schema. No text outside the JSON.`;

export function buildTailoringPrompt(
  originalBullets: string,
  jdText: string,
  gapAnalysisJson: string
): string {
  return `ORIGINAL RESUME BULLETS (this project's section):
"""
${originalBullets}
"""

JOB DESCRIPTION:
"""
${jdText}
"""

GAP ANALYSIS (from prior matching step — for context on what NOT to overclaim):
"""
${gapAnalysisJson}
"""

Rewrite 2-3 of the original bullets to better align with this JD's language and
priorities, following the grounding rules in the system prompt strictly. Also draft
one cover letter paragraph (3-4 sentences) that connects the candidate's real,
stated experience to this specific role.

Return ONLY this JSON structure:
{
  "tailored_bullets": [
    {
      "original": "<original bullet text>",
      "tailored": "<rewritten version>",
      "changes_made": "<brief note on what changed and why, e.g. 'reordered to lead with the metric since JD emphasizes impact'>"
    }
  ],
  "cover_letter_paragraph": "<3-4 sentence paragraph>",
  "grounding_check": "<self-check: confirm every claim in the tailored output traces to the original bullets provided>"
}`;
}

// Second guardrail layer — a separate call whose only job is to catch
// unsupported claims the generation call slipped in. Deliberately kept as
// its own function/call rather than folded into generation: a single model
// checking its own work in the same turn is not a reliable guardrail.

export const SYSTEM_PROMPT_VERIFICATION = `You are a fact-checker. You compare a rewritten resume bullet against the
original bullet it was derived from and flag any claim in the rewritten version
that is not supported by the original.`;

export function buildVerificationPrompt(originalBullet: string, tailoredBullet: string): string {
  return `ORIGINAL: "${originalBullet}"
REWRITTEN: "${tailoredBullet}"

Does the rewritten bullet contain any tool, technology, metric, or claim NOT
present in the original? Return ONLY JSON:
{
  "has_unsupported_claim": true | false,
  "unsupported_claims": ["<list any specific additions found>"]
}`;
}

// ---------------------------------------------------------------------------
// Feature 3 — Interview question generation (fed by Feature 1's gap analysis)
// ---------------------------------------------------------------------------

export const SYSTEM_PROMPT_INTERVIEW_QUESTIONS = `You are an experienced technical interviewer helping a candidate prepare. You
generate realistic, likely interview questions based on a job description and a
gap analysis between the candidate's resume and that job description.

You must frame all output as PROBABLE areas of focus based on the JD's stated
requirements — never claim a specific company "will definitely ask" a question, and
never imply insider knowledge of any actual interview process. You are predicting
likely topics, not reporting known facts.

Output only valid JSON matching the schema. No text outside the JSON.`;

export function buildInterviewQuestionsPrompt(
  jdText: string,
  gapAnalysisJson: string,
  matchedRequirementsJson: string
): string {
  return `JOB DESCRIPTION:
"""
${jdText}
"""

GAP ANALYSIS (from resume-matching step):
"""
${gapAnalysisJson}
"""

MATCHED REQUIREMENTS (from resume-matching step):
"""
${matchedRequirementsJson}
"""

Generate interview questions in three categories:

1. TECHNICAL/ROLE-SPECIFIC (4-6 questions): Based on the JD's explicit required
   skills and the MATCHED requirements above — questions that probe depth on things
   the resume already claims, since interviewers dig into what's on the resume.

2. BEHAVIORAL/STAR (3-4 questions): Standard behavioral questions calibrated to the
   seniority level implied by the JD's language (e.g., an "entry-level" JD gets
   different behavioral questions than a "lead" JD).

3. GAP-PROBING (one question per gap in the GAP ANALYSIS, using the gap_type to
   calibrate framing):
   - For "missing" gaps: a direct question testing whether they have any adjacent
     or transferable experience, e.g. "Have you worked with [X]? If not, how would
     you approach learning it quickly?"
   - For "underdeveloped" gaps: a probing depth question, e.g. "You mention basic
     experience with [X] — walk me through the most complex use of it you've done."
   - For "unclear" gaps: a clarifying question, e.g. "Can you clarify your exact
     role/contribution regarding [X]?"

   For each gap-probing question, also include a one-line coaching note on how the
   candidate should approach answering honestly without either overstating or
   underselling their actual experience.

Return ONLY this JSON structure:
{
  "technical_questions": [
    {"question": "<text>", "why_likely": "<brief reason tied to JD/resume>"}
  ],
  "behavioral_questions": [
    {"question": "<text>"}
  ],
  "gap_probing_questions": [
    {
      "question": "<text>",
      "related_gap": "<the JD requirement this targets>",
      "gap_type": "missing" | "underdeveloped" | "unclear",
      "coaching_note": "<how to answer honestly and well>"
    }
  ],
  "disclaimer": "These are likely focus areas based on the job description, not confirmed or guaranteed interview questions."
}`;
}
