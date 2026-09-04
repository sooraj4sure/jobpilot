"use client";

import type { MatchResult } from "@/lib/types";
import { FitGauge, GapChip, MatchedChip, Panel, PrimaryButton, GhostButton, ErrorNote, Loading } from "./ui";

export function MatchStep({
  result,
  loading,
  error,
  onRun,
  onBack,
  onContinue,
}: {
  result: MatchResult | null;
  loading: boolean;
  error: string | null;
  onRun: () => void;
  onBack: () => void;
  onContinue: () => void;
}) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl" style={{ color: "var(--paper)" }}>
            Match analysis
          </h2>
          <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
            Scored strictly against what&apos;s explicitly in your resume — nothing
            inferred or assumed.
          </p>
        </div>
        {result && !loading && (
          <GhostButton onClick={onRun}>Re-run</GhostButton>
        )}
      </div>

      {loading && (
        <Panel accentTop={false}>
          <div className="p-6">
            <Loading label="Comparing resume against job description…" />
          </div>
        </Panel>
      )}

      {error && !loading && <ErrorNote message={error} />}

      {!result && !loading && !error && (
        <Panel accentTop={false}>
          <div className="p-6 flex flex-col gap-4 items-start">
            <p className="text-sm" style={{ color: "var(--paper-dim)" }}>
              Ready to compare your resume against this job description.
            </p>
            <PrimaryButton onClick={onRun}>Run match analysis</PrimaryButton>
          </div>
        </Panel>
      )}

      {result && !loading && (
        <div className="flex flex-col gap-5">
          <Panel>
            <div className="p-5">
              <FitGauge score={result.match_score} />
              <p
                className="font-display text-base mt-4 leading-relaxed"
                style={{ color: "var(--paper)" }}
              >
                {result.summary}
              </p>
            </div>
          </Panel>

          <Panel accentTop={false}>
            <div className="p-5">
              <h3 className="font-mono text-xs uppercase tracking-wide mb-3" style={{ color: "var(--muted)" }}>
                Matched requirements ({result.matched_requirements.length})
              </h3>
              <ul className="flex flex-col gap-3">
                {result.matched_requirements.map((m, i) => (
                  <li key={i} className="flex flex-col gap-1 pb-3 border-b last:border-0" style={{ borderColor: "var(--panel-line)" }}>
                    <div className="flex items-center gap-2">
                      <MatchedChip />
                      <span className="text-sm" style={{ color: "var(--paper)" }}>{m.requirement}</span>
                    </div>
                    <span className="font-mono text-xs pl-1" style={{ color: "var(--muted)" }}>
                      “{m.resume_evidence}”
                    </span>
                  </li>
                ))}
                {result.matched_requirements.length === 0 && (
                  <li className="text-sm" style={{ color: "var(--muted)" }}>No clear matches found.</li>
                )}
              </ul>
            </div>
          </Panel>

          <Panel accentTop={false}>
            <div className="p-5">
              <h3 className="font-mono text-xs uppercase tracking-wide mb-3" style={{ color: "var(--muted)" }}>
                Gaps ({result.gaps.length})
              </h3>
              <ul className="flex flex-col gap-3">
                {result.gaps.map((g, i) => (
                  <li key={i} className="flex flex-col gap-1 pb-3 border-b last:border-0" style={{ borderColor: "var(--panel-line)" }}>
                    <div className="flex items-center gap-2">
                      <GapChip type={g.gap_type} />
                      <span className="text-sm" style={{ color: "var(--paper)" }}>{g.requirement}</span>
                    </div>
                    <span className="text-xs pl-1" style={{ color: "var(--muted)" }}>{g.notes}</span>
                  </li>
                ))}
                {result.gaps.length === 0 && (
                  <li className="text-sm" style={{ color: "var(--muted)" }}>No gaps found — strong match.</li>
                )}
              </ul>
            </div>
          </Panel>
        </div>
      )}

      <div className="flex justify-between">
        <GhostButton onClick={onBack}>← Back</GhostButton>
        <PrimaryButton onClick={onContinue} disabled={!result}>
          Continue to tailoring →
        </PrimaryButton>
      </div>
    </div>
  );
}
