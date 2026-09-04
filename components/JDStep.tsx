"use client";

import { Panel, PrimaryButton, GhostButton } from "./ui";

export function JDStep({
  jdText,
  onChange,
  onBack,
  onContinue,
}: {
  jdText: string;
  onChange: (text: string) => void;
  onBack: () => void;
  onContinue: () => void;
}) {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="font-display text-2xl" style={{ color: "var(--paper)" }}>
          Paste the job description
        </h2>
        <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
          The full posting works best — requirements, responsibilities, and any
          seniority language all feed the gap analysis and interview prep.
        </p>
      </div>

      <Panel accentTop={false}>
        <div className="p-5">
          <label className="block font-mono text-[11px] uppercase tracking-wide mb-1" style={{ color: "var(--muted)" }}>
            Job description text
          </label>
          <textarea
            value={jdText}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Paste the job posting here…"
            rows={16}
            className="w-full rounded-sm border p-3 text-sm leading-relaxed resize-y focus:outline-none"
            style={{
              background: "var(--ink-soft)",
              borderColor: "var(--panel-line)",
              color: "var(--paper)",
            }}
          />
        </div>
      </Panel>

      <div className="flex justify-between">
        <GhostButton onClick={onBack}>← Back</GhostButton>
        <PrimaryButton onClick={onContinue} disabled={!jdText.trim()}>
          Run match analysis →
        </PrimaryButton>
      </div>
    </div>
  );
}
