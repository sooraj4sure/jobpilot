"use client";

import type { TailorResult } from "@/lib/types";
import { Panel, PrimaryButton, GhostButton, ErrorNote, Loading } from "./ui";

export function TailorStep({
  bulletsInput,
  onBulletsChange,
  result,
  loading,
  error,
  onRun,
  onBack,
  onContinue,
}: {
  bulletsInput: string;
  onBulletsChange: (text: string) => void;
  result: TailorResult | null;
  loading: boolean;
  error: string | null;
  onRun: () => void;
  onBack: () => void;
  onContinue: () => void;
}) {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="font-display text-2xl" style={{ color: "var(--paper)" }}>
          Tailor your bullets
        </h2>
        <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
          Paste the specific resume section you want rewritten — usually one job or
          project. Every rewrite is checked in a separate pass and reverted if it
          introduces a claim your original text doesn&apos;t support.
        </p>
      </div>

      <Panel accentTop={false}>
        <div className="p-5">
          <label className="block font-mono text-[11px] uppercase tracking-wide mb-1" style={{ color: "var(--muted)" }}>
            Original bullets to tailor
          </label>
          <textarea
            value={bulletsInput}
            onChange={(e) => onBulletsChange(e.target.value)}
            placeholder="Paste 2-5 bullets from one role or project…"
            rows={8}
            className="w-full rounded-sm border p-3 text-sm leading-relaxed resize-y focus:outline-none"
            style={{
              background: "var(--ink-soft)",
              borderColor: "var(--panel-line)",
              color: "var(--paper)",
            }}
          />
          <div className="mt-4 flex justify-end">
            <PrimaryButton onClick={onRun} disabled={!bulletsInput.trim() || loading}>
              Generate tailored content
            </PrimaryButton>
          </div>
        </div>
      </Panel>

      {loading && (
        <Panel accentTop={false}>
          <div className="p-6">
            <Loading label="Rewriting bullets, then verifying each one against your original…" />
          </div>
        </Panel>
      )}

      {error && !loading && <ErrorNote message={error} />}

      {result && !loading && (
        <div className="flex flex-col gap-5">
          <Panel accentTop={false}>
            <div className="p-5 flex flex-col gap-4">
              <h3 className="font-mono text-xs uppercase tracking-wide" style={{ color: "var(--muted)" }}>
                Tailored bullets
              </h3>
              {result.tailored_bullets.map((b, i) => (
                <div key={i} className="pb-4 border-b last:border-0 flex flex-col gap-2" style={{ borderColor: "var(--panel-line)" }}>
                  <p className="text-sm line-through" style={{ color: "var(--muted)" }}>
                    {b.original}
                  </p>
                  <p className="font-display text-base" style={{ color: "var(--paper)" }}>
                    {b.tailored}
                  </p>
                  <p className="font-mono text-xs" style={{ color: "var(--slate)" }}>
                    {b.changes_made}
                  </p>
                  {b.verification?.used_fallback && (
                    <p
                      className="font-mono text-xs px-2 py-1 rounded-sm border inline-block w-fit"
                      style={{ borderColor: "var(--rust)", color: "var(--rust)" }}
                    >
                      ⚠ reverted to original — verification flagged an unsupported claim
                      {b.verification.unsupported_claims.length > 0
                        ? `: ${b.verification.unsupported_claims.join("; ")}`
                        : ""}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </Panel>

          <Panel>
            <div className="p-5 flex flex-col gap-2">
              <h3 className="font-mono text-xs uppercase tracking-wide" style={{ color: "var(--muted)" }}>
                Cover letter paragraph
              </h3>
              <p className="font-display text-base leading-relaxed" style={{ color: "var(--paper)" }}>
                {result.cover_letter_paragraph}
              </p>
            </div>
          </Panel>

          <p className="font-mono text-xs" style={{ color: "var(--muted)" }}>
            Grounding self-check: {result.grounding_check}
          </p>
        </div>
      )}

      <div className="flex justify-between">
        <GhostButton onClick={onBack}>← Back</GhostButton>
        <PrimaryButton onClick={onContinue} disabled={!result}>
          Continue to interview prep →
        </PrimaryButton>
      </div>
    </div>
  );
}
