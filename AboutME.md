# JobPilot — Project Deep Dive

A reference doc for talking about this project in interviews, on a resume, or
in a portfolio writeup. Covers what it does, how it's built, why it's built
that way, and every real bug I hit while shipping it.

---

## 1. One-line pitch

JobPilot is a resume-to-job-description copilot: it scores how well a resume
matches a job posting, rewrites resume bullets to align with that posting
**without inventing anything**, and generates interview questions targeted at
the candidate's actual gaps — all powered by the Gemini API.

## 2. The problem it solves

Generic "AI resume tools" tend to do one of two bad things:
- **Hallucinate** — add skills, metrics, or scope the candidate never actually
  had, which is actively dangerous once someone puts it on a real resume.
- **Generate generic output** — the same boilerplate interview questions or
  cover letter regardless of the specific JD or the candidate's actual weak
  spots.

JobPilot's design specifically targets both failure modes: a grounding
guardrail against hallucination, and a pipeline where each feature's output
feeds the next so later steps are targeted, not generic.

## 3. The three features

### Feature 1 — Resume ↔ JD Match & Gap Analysis
Input: resume text + job description text.
Output: a 0–100 fit score, a list of matched requirements (each with quoted
resume evidence), and a list of gaps, each classified as:
- `missing` — not mentioned in the resume at all
- `underdeveloped` — mentioned, but weaker than the JD implies is needed
  (e.g. resume says "basic Docker", JD wants production experience)
- `unclear` — resume is ambiguous about whether the requirement is met

This is the **only** feature that reads the raw resume and JD from scratch.
Its structured JSON output is reused by Features 2 and 3 — neither of them
re-analyzes the JD independently. This was a deliberate design choice to
keep the app consistent (all three features agree on what the gaps are) and
cheaper (one analysis call instead of three).

### Feature 2 — Tailored Bullets + Cover Letter (with a real anti-hallucination guardrail)
Input: 2–5 original resume bullets (usually from one job/project), the JD,
and Feature 1's gap analysis (for context on what *not* to overclaim).
Output: 2–3 rewritten bullets, each with a note on what changed and why, plus
one cover-letter paragraph.

**This is the most interesting engineering piece in the project**, so it's
worth understanding in detail — see section 5.

### Feature 3 — Interview Question Generation
Input: the JD + Feature 1's gap analysis + matched requirements.
Output: three categories of questions:
- **Technical/role-specific** (4–6): probes depth on things the resume
  already claims — interviewers dig into what's on the resume, not just the
  JD.
- **Behavioral/STAR** (3–4): calibrated to the seniority level implied by
  the JD's language.
- **Gap-probing** (one per gap): the framing changes based on `gap_type` —
  a `missing` gap gets "have you worked with X, and if not, how would you
  approach learning it?"; an `underdeveloped` gap gets a depth-probing
  follow-up; an `unclear` gap gets a clarifying question. Each comes with a
  one-line coaching note on how to answer honestly without over- or
  under-selling.

This is the payoff of Feature 1's structured gap data — a generic interview
prep tool can't tell the difference between "candidate doesn't have this at
all" and "candidate has a weaker version of this," and that distinction
changes what question and coaching advice actually makes sense.

## 4. Tech stack

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 16 (App Router, TypeScript) | API routes + frontend in one codebase, server-side file parsing without a separate backend |
| Styling | Tailwind CSS v4 | Fast iteration; no separate config file needed in v4 |
| LLM | Gemini 3.6 Flash (`generateContent` REST endpoint) | Cheap, fast, 1M context, native structured JSON output support |
| PDF parsing | `pdf-parse` (v2, class-based `PDFParse` API) | Server-side text extraction from uploaded resumes |
| DOCX parsing | `mammoth` | `.extractRawText()` for plain text extraction from Word docs |

## 5. Architecture

```
app/
  page.tsx                        # client-side 5-step state machine
  api/
    parse-resume/route.ts         # PDF/DOCX/TXT -> plain text
    analyze-match/route.ts        # Feature 1
    tailor/route.ts               # Feature 2 (generation + verification)
    interview-questions/route.ts  # Feature 3
lib/
  gemini.ts       # single shared callGemini() helper — every LLM call in
                  # the app goes through this one function
  prompts.ts      # every system/user prompt, as pure string-building functions
  parseResume.ts  # pdf-parse / mammoth wrappers
  types.ts        # TS types mirroring each feature's JSON schema
components/
  StepNav, ResumeStep, JDStep, MatchStep, TailorStep, InterviewStep, ui.tsx
```

**Data flow:** the frontend is a single client component (`page.tsx`) holding
all state — resume text, JD text, and the three features' results — and
passes callbacks down to step components. Nothing is persisted server-side;
every API call is stateless and takes everything it needs as input. This
was a deliberate simplicity choice: no database, no auth, no sessions — the
gap analysis JSON is just held in React state and passed as a request body
to Features 2 and 3.

**One shared `callGemini()` helper:** rather than three separate fetch
blocks (one per feature), every LLM call — including the verification pass —
goes through one function in `lib/gemini.ts` that takes a system prompt and
user prompt and returns parsed JSON. This meant error handling, retry logic,
and JSON-parsing fallbacks only had to be written once.

## 6. The anti-hallucination guardrail (the best interview talking point here)

Prompting alone ("don't invent skills") is not a reliable guardrail — models
follow instructions probabilistically, not categorically. So Feature 2 uses
**two separate model calls**, not one:

1. **Generation call** — rewrites the bullets, following strict rules (may
   rephrase/reorder/re-emphasize existing content; may NOT add tools,
   upgrade scope like "assisted with" → "led", or add metrics not in the
   original).
2. **Verification call** — a *separate* call, with its own system prompt,
   whose only job is to compare one original bullet against its rewritten
   version and flag any claim not present in the original. It has no memory
   of having just written the bullet — it's evaluating it cold, the same way
   a second reviewer would.

If the verification call flags an unsupported claim, the app **reverts to
the original bullet** rather than serving a possibly-hallucinated one, and
shows the user why. This runs once per bullet, in parallel (`Promise.all`).

**Why this matters as a talking point:** a single LLM call checking its own
output in the same turn is not a real check — it's the same reasoning that
produced the error, asked to re-approve itself. Splitting generation and
verification into genuinely separate calls is what makes this a guardrail
instead of a suggestion. I also made the failure mode conservative on
purpose: if the verification call itself errors out (network issue, bad
JSON, etc.), the code falls back to the original bullet rather than trusting
an unverified rewrite — fail closed, not open.

## 7. Prompt engineering decisions

- **System vs. user prompt split**: the "don't invent things" instruction is
  stated in both the system prompt and reinforced in the user prompt for
  Features 1 and 2, since single instructions get ignored more often than
  reinforced ones.
- **Forced JSON schemas everywhere**: every prompt ends with an explicit
  JSON structure the model must return, and every API call sets
  `responseMimeType: "application/json"` in `generationConfig` — this makes
  Gemini guarantee valid JSON syntax at the API level rather than hoping a
  "return only JSON" instruction in plain text is followed.
- **Temperature tuned per call**: matching uses `0.2` (want consistency, not
  creativity, in a score); tailoring uses `0.4`; interview questions use
  `0.5` (a bit more variety is fine); the verification pass uses `0`
  (a fact-check should not be creative at all).
- **Forced evidence quoting**: Feature 1 requires quoted/paraphrased resume
  evidence for every matched requirement. This isn't just for display — it's
  a built-in check: if the model can't produce a real quote, it probably
  invented the match, and that's easy to catch in manual testing.
- **Explicit disclaimer language in Feature 3**: the system prompt
  explicitly forbids the model from claiming insider knowledge of a real
  interview process — it must frame everything as "likely focus areas,"
  never "this company will ask X."

## 8. UI/UX design decisions

The frontend deliberately avoids the generic "AI SaaS dashboard" look
(rounded cards, soft grey shadows, cream background + serif headline + one
bright accent). Instead:

- **Concept**: an instrument panel / flight log for a job application —
  fitting given the product's name.
- **Color is semantic, not decorative**: teal = matched, amber =
  underdeveloped, rust = missing, slate = unclear, used consistently as chip
  colors and gauge colors throughout — not just picked for contrast.
- **Typography carries structural meaning**: monospace text is reserved for
  "instrument readings" — scores, tags, coaching notes; serif is reserved
  for narrative content — the fit summary, tailored bullets, cover letter
  paragraph; sans-serif is UI chrome (buttons, labels, nav).
- **Fit score as a horizontal gauge**, not a circular percentage ring —
  intentionally different from the default "big stat card" treatment.
- **Left-rail step nav styled as a manifest/checklist** (numbered, since this
  genuinely is a sequential process — resume → JD → match → tailor →
  interview — not decorative numbering for its own sake).
- System font stacks (not a fetched web font) were used deliberately so the
  build has zero external font dependencies and renders identically offline.

## 9. Real bugs hit during development (great interview material)

This is the part that actually demonstrates debugging skill, so it's worth
remembering in detail:

**Bug 1 — PDF parsing crashed with "Setting up fake worker failed"**
`pdf-parse` (built on `pdfjs-dist`) tries to load a worker script at a file
path computed relative to its own module location. Next.js's bundler
(webpack/Turbopack) rewrites module paths during bundling, which broke that
path resolution. Fix: added `serverExternalPackages: ["pdf-parse",
"pdfjs-dist"]` to `next.config.ts`, which tells Next to load those packages
as plain, unbundled Node modules on the server instead of running them
through the bundler — sidestepping the path-rewriting entirely.

**Bug 2 — pdf-parse v2 has a totally different API than v1**
Most examples online use `pdfParse(buffer)` as a default-exported function
(v1 API). v2 replaced this with a class: `new PDFParse({ data: buffer })`
then `.getText()`. Using the old API gave a TypeScript error
(`Property 'default' does not exist`) at build time, not a runtime surprise
— caught before shipping.

**Bug 3 — pdf-parse page separators leaking into extracted text**
`.getText()`'s concatenated `.text` field inserts `-- N of M --` separators
between pages. Fixed by using the per-page `.pages` array and joining with
`\n\n` myself instead of trusting the pre-joined field.

**Bug 4 — Gemini responses truncated mid-JSON, repeatedly**
The most persistent bug. Symptom: `JSON.parse` failing because the response
was cut off mid-string, no closing brace. Root cause, in two layers:
  - Gemini 3.x models spend part of the `maxOutputTokens` budget on internal
    "thinking" tokens *before* writing the visible output — so a
    `maxOutputTokens` value that looks generous for the expected JSON size
    can still truncate the actual answer.
  - The interview-questions endpoint is the largest of the four calls
    (4–6 technical + 3–4 behavioral + one question per gap), so it hit this
    ceiling hardest and needed the highest limit (ended up at 8000).
  - Real fix, two parts: (1) raised `maxOutputTokens` per call to match each
    call's realistic output size, and (2) set `thinkingConfig: {
    thinkingLevel: "low" }` in `generationConfig` for these structured-
    extraction tasks, since they don't benefit from deep reasoning and the
    thinking tokens were eating into the visible-output budget.
  - **A wrong turn worth mentioning honestly**: I first tried
    `thinkingConfig: { thinkingBudget: 0 }`, which is the correct field for
    the older Gemini 2.5 model family but caused a `400 INVALID_ARGUMENT` on
    Gemini 3.x, which uses `thinkingLevel` (a string: minimal/low/medium/high)
    instead of `thinkingBudget` (a numeric token count). Good example of why
    checking the exact model-generation's API surface matters — the two
    parameters look similar but aren't interchangeable, and the API fails
    loudly (400) rather than silently ignoring the wrong field.

**Bug 5 — Free-tier rate limits (429)**
Google's free tier caps `gemini-3.6-flash` at 20 requests/day. The
verification pass alone can add 2–3 requests per "Tailor" run, so this was
easy to hit during testing. Not a code bug, but the fix added real
resilience: retry logic in `callGemini()` that specifically retries on 429
(respecting the `retryDelay` Google's error response provides) up to 3
times, while still failing loudly and immediately on other error codes
(never masking a real failure as a transient one).

## 10. Known limitations / what I'd improve with more time

- **No persistence** — refreshing the page loses all state. Would add a
  database (or at minimum `localStorage`, with the tradeoffs that implies)
  for saving past analyses.
- **No auth or per-user rate limiting** — anyone with the app URL can burn
  through the Gemini quota. Would add auth + per-user request caps before
  any public deployment.
- **No streaming** — responses only appear once the full JSON is generated,
  so the interview-questions call in particular has a multi-second wait with
  no incremental feedback beyond a loading message.
- **Scanned/image-only PDFs aren't handled** — `pdf-parse` can't extract text
  from a resume that's actually a scanned image; the UI detects and warns
  about this (empty extraction), but doesn't run OCR.
- **Verification pass cost** — every "Tailor" run makes 1 generation call + N
  verification calls (one per bullet). Fine at small scale, but would need
  batching or a cheaper verification model at higher volume.

## 11. Likely interview questions about this project (and how I'd answer them)

**"Why two calls instead of one for the tailoring feature?"**
Because a model checking its own output in the same call isn't a real
check — it's the same reasoning pass re-approving itself. A second, separate
call with no memory of writing the original text is a genuinely independent
check, closer to a code review than a self-review.

**"How do you know the guardrail actually works?"**
By testing it adversarially — feeding it a resume with a deliberately weak
or absent skill and confirming (a) Feature 1 classifies it correctly as
`underdeveloped`/`missing` rather than rounding up to matched, and (b) that
Feature 2 doesn't fabricate coverage for a JD requirement that's genuinely
absent from the resume. I also manually reviewed the `grounding_check` and
`unsupported_claims` fields across multiple real runs rather than trusting
the guardrail after a single successful test.

**"What was the hardest bug and why?"**
The truncated-JSON issue, because it initially looked like a single problem
("responses too long") but was actually two compounding causes — a token
budget that didn't account for hidden thinking tokens, and, when I tried to
fix that, using the wrong parameter name for this model generation
(`thinkingBudget` vs. `thinkingLevel`), which are easy to conflate since they
serve the same conceptual purpose across different Gemini model families.

**"How would this scale to more users?"**
The stateless API design (no server-side session state) means it's
horizontally scalable as-is; the real bottleneck is Gemini API quota/cost,
which I'd address with per-user rate limiting, caching repeated
resume/JD pairs, and potentially batching verification calls instead of one
per bullet.

**"What would you change about the architecture if starting over?"**
I'd consider moving the verification pass to a cheaper/faster model
(e.g. Gemini 3.5 Flash-Lite) since it's a narrow classification task, not
a generation task — no reason to pay generation-model prices for a
yes/no-plus-list check.

## 12. Resume bullet suggestions (a few phrasings to pick from)

- Built a full-stack Next.js app that uses a two-pass LLM generate-and-verify
  pipeline to prevent resume-tailoring hallucinations, catching and
  reverting unsupported claims automatically.
- Designed a three-stage LLM pipeline (resume/JD matching → grounded content
  tailoring → targeted interview prep) where structured output from stage
  one drives the prompts for stages two and three.
- Diagnosed and fixed a multi-layered LLM output-truncation bug involving
  token budgeting and model-specific "thinking" configuration parameters
  across Gemini's 2.5 vs. 3.x API surface.
- Implemented defensive API integration (429 backoff with server-provided
  retry delays, explicit handling of model-deprecation errors) around a
  third-party LLM API.
