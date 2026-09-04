"use client";

import { useRef, useState } from "react";
import { Panel, PrimaryButton, ErrorNote, Loading } from "./ui";

export function ResumeStep({
  resumeText,
  onChange,
  onContinue,
}: {
  resumeText: string;
  onChange: (text: string) => void;
  onContinue: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setLoading(true);
    setError(null);
    setWarnings([]);
    setFileName(file.name);

    try {
      const formData = new FormData();
      formData.append("resume", file);
      const res = await fetch("/api/parse-resume", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to parse resume.");
      onChange(data.text);
      setWarnings(data.warnings || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to parse resume.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="font-display text-2xl" style={{ color: "var(--paper)" }}>
          Upload your resume
        </h2>
        <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
          PDF, DOCX, or TXT. We&apos;ll extract the text below — check it over before
          continuing, since extraction from PDFs isn&apos;t always perfect.
        </p>
      </div>

      <Panel accentTop={false}>
        <div className="p-5 flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
              }}
            />
            <button
              onClick={() => inputRef.current?.click()}
              className="px-4 py-2 rounded-sm text-sm border"
              style={{ borderColor: "var(--panel-line)", color: "var(--paper)" }}
            >
              Choose file
            </button>
            <span className="font-mono text-xs" style={{ color: "var(--muted)" }}>
              {fileName || "no file selected"}
            </span>
          </div>

          {loading && <Loading label="Extracting text…" />}
          {error && <ErrorNote message={error} />}
          {warnings.map((w, i) => (
            <p key={i} className="font-mono text-xs" style={{ color: "var(--accent)" }}>
              ⚠ {w}
            </p>
          ))}

          <div>
            <label className="block font-mono text-[11px] uppercase tracking-wide mb-1" style={{ color: "var(--muted)" }}>
              Extracted text (editable)
            </label>
            <textarea
              value={resumeText}
              onChange={(e) => onChange(e.target.value)}
              placeholder="Upload a file above, or paste your resume text directly here…"
              rows={14}
              className="w-full rounded-sm border p-3 text-sm leading-relaxed resize-y focus:outline-none"
              style={{
                background: "var(--ink-soft)",
                borderColor: "var(--panel-line)",
                color: "var(--paper)",
              }}
            />
          </div>
        </div>
      </Panel>

      <div className="flex justify-end">
        <PrimaryButton onClick={onContinue} disabled={!resumeText.trim()}>
          Continue to job description →
        </PrimaryButton>
      </div>
    </div>
  );
}
