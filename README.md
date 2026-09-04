# JobPilot

A resume ↔ job-description matcher, tailored-bullet/cover-letter generator, and
interview-question prep tool, built on Gemini 3.6 Flash.

Feature 1 (match & gap analysis) is called once per job description, and its
structured output (`match_score`, `matched_requirements`, `gaps`) is reused
directly by Features 2 and 3 — the JD is never re-analyzed from scratch.

## Features

1. **Resume–JD matching** (`/api/analyze-match`) — 0-100 fit score, matched
   requirements with quoted evidence, and a gap list classified as
   `missing` / `underdeveloped` / `unclear`.
2. **Tailored bullets + cover letter** (`/api/tailor`) — rewrites 2-3 bullets
   and drafts one cover-letter paragraph, grounded strictly in the original
   resume text. Every rewritten bullet is run through a **separate**
   verification call (`SYSTEM_PROMPT_VERIFICATION`); if that call finds an
   unsupported claim, the UI reverts to the original bullet rather than
   serving a hallucinated one. This two-pass generate → verify design is
   intentional — a single model checking its own output in the same call is
   not a reliable guardrail.
3. **Interview question generation** (`/api/interview-questions`) — technical,
   behavioral, and gap-probing questions, with the gap-probing set generated
   one-per-gap and calibrated by `gap_type` (missing/underdeveloped/unclear
   each get a different question style and a coaching note).

## Setup

```bash
npm install
cp .env.example .env.local
# then put your key in .env.local:
# GEMINI_API_KEY=your-key-here
npm run dev
```

Open http://localhost:3000. Get a Gemini API key at
https://aistudio.google.com/apikey.

## Project layout

```
app/
  page.tsx                 # client-side step orchestrator (5 steps)
  api/
    parse-resume/route.ts       # PDF/DOCX/TXT -> plain text
    analyze-match/route.ts      # Feature 1
    tailor/route.ts             # Feature 2 (generate + verify)
    interview-questions/route.ts# Feature 3
lib/
  gemini.ts        # shared callGemini() helper, error handling, model config
  prompts.ts        # every system/user prompt, as functions
  parseResume.ts     # pdf-parse / mammoth wrappers
  types.ts           # shared TS types matching the JSON schemas
components/
  StepNav.tsx, ResumeStep.tsx, JDStep.tsx, MatchStep.tsx,
  TailorStep.tsx, InterviewStep.tsx, ui.tsx (shared atoms)
```

## Model

Uses `gemini-3.6-flash` (Google's `v1beta` `generateContent` endpoint) via a
single shared `callGemini()` helper in `lib/gemini.ts`, reused across all
three features — swap the model with the `GEMINI_MODEL` env var if needed.
`responseMimeType: "application/json"` is set on every call so Gemini
guarantees valid JSON syntax directly, with a markdown-fence-stripping
fallback parse in case that's ever not honored.

If `gemini-3.6-flash` is ever deprecated, `callGemini()` specifically detects
the "model no longer available" 404 pattern and throws a clear error instead
of failing silently — check
https://ai.google.dev/gemini-api/docs/models for the current recommended
model if that happens. Note Google has also introduced a newer "Interactions
API" alongside `generateContent`; this project still targets the stable
`generateContent` endpoint, which remains supported, so no migration is
required, but it's worth a glance if you're extending this later.

## Extending

- **Resume storage / accounts**: none of this persists anything server-side
  today — every request is stateless. Add a DB if you want to save past
  analyses.
- **Rate limiting / cost control**: each "Tailor" run makes 1 generation call
  + N verification calls (one per bullet, in parallel). Consider capping
  bullet count or adding request-level rate limiting before shipping this
  publicly, since Gemini calls cost money per request.
- **Testing checklist** (carried over from the prompt-design doc — still
  worth running manually before trusting this in production):
  - [ ] Feed a resume with a deliberately weak skill; confirm it's classified
        `underdeveloped`, not `matched`.
  - [ ] Feed a JD requirement totally absent from the resume; confirm tailored
        bullets don't fabricate coverage for it.
  - [ ] Confirm the verification pass actually catches at least one injected
        hallucination in a test case.
  - [ ] Confirm gap-probing questions vary in framing across all three
        `gap_type`s.
  - [ ] Manually review `grounding_check` / `unsupported_claims` across ~20
        real runs before trusting the guardrail.
