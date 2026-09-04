"use client";

import type { InterviewResult } from "@/lib/types";
import { GapChip, Panel, PrimaryButton, GhostButton, ErrorNote, Loading } from "./ui";

export function InterviewStep({
  result,
  loading,
  error,
  onRun,
  onBack,
  onRestart,
}: {
  result: InterviewResult | null;
  loading: boolean;
  error: string | null;
  onRun: () => void;
  onBack: () => void;
  onRestart: () => void;
}) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl" style={{ color: "var(--paper)" }}>
            Interview prep
          </h2>
          <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
            Likely focus areas based on the JD and your gap analysis — not confirmed
            questions from any actual interview.
          </p>
        </div>
        {result && !loading && <GhostButton onClick={onRun}>Re-run</GhostButton>}
      </div>

      {!result && !loading && !error && (
        <Panel accentTop={false}>
          <div className="p-6 flex flex-col gap-4 items-start">
            <p className="text-sm" style={{ color: "var(--paper-dim)" }}>
              Ready to generate technical, behavioral, and gap-probing questions.
            </p>
            <PrimaryButton onClick={onRun}>Generate interview questions</PrimaryButton>
          </div>
        </Panel>
      )}

      {loading && (
        <Panel accentTop={false}>
          <div className="p-6">
            <Loading label="Drafting likely questions from the JD and gap analysis…" />
          </div>
        </Panel>
      )}

      {error && !loading && <ErrorNote message={error} />}

      {result && !loading && (
        <div className="flex flex-col gap-5">
          <Panel accentTop={false}>
            <div className="p-5 flex flex-col gap-4">
              <h3 className="font-mono text-xs uppercase tracking-wide" style={{ color: "var(--muted)" }}>
                Technical / role-specific
              </h3>
              {result.technical_questions.map((q, i) => (
                <div key={i} className="pb-3 border-b last:border-0" style={{ borderColor: "var(--panel-line)" }}>
                  <p className="font-display text-base" style={{ color: "var(--paper)" }}>{q.question}</p>
                  <p className="font-mono text-xs mt-1" style={{ color: "var(--muted)" }}>{q.why_likely}</p>
                </div>
              ))}
            </div>
          </Panel>

          <Panel accentTop={false}>
            <div className="p-5 flex flex-col gap-3">
              <h3 className="font-mono text-xs uppercase tracking-wide" style={{ color: "var(--muted)" }}>
                Behavioral
              </h3>
              {result.behavioral_questions.map((q, i) => (
                <p key={i} className="font-display text-base" style={{ color: "var(--paper)" }}>
                  {q.question}
                </p>
              ))}
            </div>
          </Panel>

          <Panel>
            <div className="p-5 flex flex-col gap-4">
              <h3 className="font-mono text-xs uppercase tracking-wide" style={{ color: "var(--muted)" }}>
                Gap-probing
              </h3>
              {result.gap_probing_questions.map((q, i) => (
                <div key={i} className="pb-4 border-b last:border-0 flex flex-col gap-2" style={{ borderColor: "var(--panel-line)" }}>
                  <div className="flex items-center gap-2">
                    <GapChip type={q.gap_type} />
                    <span className="font-mono text-xs" style={{ color: "var(--muted)" }}>{q.related_gap}</span>
                  </div>
                  <p className="font-display text-base" style={{ color: "var(--paper)" }}>{q.question}</p>
                  <p className="text-xs italic" style={{ color: "var(--slate)" }}>
                    Coaching: {q.coaching_note}
                  </p>
                </div>
              ))}
            </div>
          </Panel>

          <p className="font-mono text-[11px]" style={{ color: "var(--muted)" }}>
            {result.disclaimer}
          </p>
        </div>
      )}

      <div className="flex justify-between">
        <GhostButton onClick={onBack}>← Back</GhostButton>
        <GhostButton onClick={onRestart}>Start over with a new JD</GhostButton>
      </div>
    </div>
  );
}
