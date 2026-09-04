"use client";

import { useState } from "react";
import { StepNav, type StepId } from "@/components/StepNav";
import { ResumeStep } from "@/components/ResumeStep";
import { JDStep } from "@/components/JDStep";
import { MatchStep } from "@/components/MatchStep";
import { TailorStep } from "@/components/TailorStep";
import { InterviewStep } from "@/components/InterviewStep";
import type { MatchResult, TailorResult, InterviewResult } from "@/lib/types";

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Request to ${url} failed.`);
  return data as T;
}

export default function Home() {
  const [step, setStep] = useState<StepId>("resume");
  const [completed, setCompleted] = useState<Set<StepId>>(new Set());

  const [resumeText, setResumeText] = useState("");
  const [jdText, setJdText] = useState("");
  const [bulletsInput, setBulletsInput] = useState("");

  const [matchResult, setMatchResult] = useState<MatchResult | null>(null);
  const [matchLoading, setMatchLoading] = useState(false);
  const [matchError, setMatchError] = useState<string | null>(null);

  const [tailorResult, setTailorResult] = useState<TailorResult | null>(null);
  const [tailorLoading, setTailorLoading] = useState(false);
  const [tailorError, setTailorError] = useState<string | null>(null);

  const [interviewResult, setInterviewResult] = useState<InterviewResult | null>(null);
  const [interviewLoading, setInterviewLoading] = useState(false);
  const [interviewError, setInterviewError] = useState<string | null>(null);

  function markDone(id: StepId) {
    setCompleted((prev) => new Set(prev).add(id));
  }

  async function runMatch() {
    setMatchLoading(true);
    setMatchError(null);
    try {
      const result = await postJson<MatchResult>("/api/analyze-match", {
        resumeText,
        jdText,
      });
      setMatchResult(result);
    } catch (err) {
      setMatchError(err instanceof Error ? err.message : "Failed to analyze match.");
    } finally {
      setMatchLoading(false);
    }
  }

  async function runTailor() {
    if (!matchResult) return;
    setTailorLoading(true);
    setTailorError(null);
    try {
      const result = await postJson<TailorResult>("/api/tailor", {
        originalBullets: bulletsInput,
        jdText,
        gapAnalysis: matchResult,
      });
      setTailorResult(result);
    } catch (err) {
      setTailorError(err instanceof Error ? err.message : "Failed to tailor bullets.");
    } finally {
      setTailorLoading(false);
    }
  }

  async function runInterview() {
    if (!matchResult) return;
    setInterviewLoading(true);
    setInterviewError(null);
    try {
      const result = await postJson<InterviewResult>("/api/interview-questions", {
        jdText,
        gapAnalysis: matchResult,
      });
      setInterviewResult(result);
    } catch (err) {
      setInterviewError(
        err instanceof Error ? err.message : "Failed to generate interview questions."
      );
    } finally {
      setInterviewLoading(false);
    }
  }

  function restart() {
    setStep("resume");
    setCompleted(new Set());
    setResumeText("");
    setJdText("");
    setBulletsInput("");
    setMatchResult(null);
    setTailorResult(null);
    setInterviewResult(null);
    setMatchError(null);
    setTailorError(null);
    setInterviewError(null);
  }

  return (
    <div className="min-h-screen">
      <header className="border-b" style={{ borderColor: "var(--panel-line)" }}>
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-baseline gap-3">
          <span className="font-display text-2xl" style={{ color: "var(--paper)" }}>
            JobPilot
          </span>
          <span className="font-mono text-xs" style={{ color: "var(--muted)" }}>
            resume · gap analysis · interview prep
          </span>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10 grid grid-cols-1 md:grid-cols-[220px_1fr] gap-10">
        <aside className="md:sticky md:top-10 md:self-start">
          <StepNav current={step} completed={completed} onSelect={setStep} />
        </aside>

        <section>
          {step === "resume" && (
            <ResumeStep
              resumeText={resumeText}
              onChange={setResumeText}
              onContinue={() => {
                markDone("resume");
                setStep("jd");
              }}
            />
          )}

          {step === "jd" && (
            <JDStep
              jdText={jdText}
              onChange={setJdText}
              onBack={() => setStep("resume")}
              onContinue={() => {
                markDone("jd");
                setStep("match");
              }}
            />
          )}

          {step === "match" && (
            <MatchStep
              result={matchResult}
              loading={matchLoading}
              error={matchError}
              onRun={runMatch}
              onBack={() => setStep("jd")}
              onContinue={() => {
                markDone("match");
                if (!bulletsInput && resumeText) setBulletsInput(resumeText);
                setStep("tailor");
              }}
            />
          )}

          {step === "tailor" && (
            <TailorStep
              bulletsInput={bulletsInput}
              onBulletsChange={setBulletsInput}
              result={tailorResult}
              loading={tailorLoading}
              error={tailorError}
              onRun={runTailor}
              onBack={() => setStep("match")}
              onContinue={() => {
                markDone("tailor");
                setStep("interview");
              }}
            />
          )}

          {step === "interview" && (
            <InterviewStep
              result={interviewResult}
              loading={interviewLoading}
              error={interviewError}
              onRun={runInterview}
              onBack={() => setStep("tailor")}
              onRestart={restart}
            />
          )}
        </section>
      </main>
    </div>
  );
}
