export type StepId = "resume" | "jd" | "match" | "tailor" | "interview";

const STEPS: { id: StepId; label: string; hint: string }[] = [
  { id: "resume", label: "Resume", hint: "Upload & extract" },
  { id: "jd", label: "Job description", hint: "Paste target JD" },
  { id: "match", label: "Match analysis", hint: "Score & gaps" },
  { id: "tailor", label: "Tailor content", hint: "Bullets & letter" },
  { id: "interview", label: "Interview prep", hint: "Likely questions" },
];

export function StepNav({
  current,
  completed,
  onSelect,
}: {
  current: StepId;
  completed: Set<StepId>;
  onSelect: (id: StepId) => void;
}) {
  return (
    <nav aria-label="JobPilot steps" className="flex flex-col">
      {STEPS.map((step, i) => {
        const isCurrent = step.id === current;
        const isDone = completed.has(step.id);
        // A step can be opened once it's done, or if it's the current one.
        const isReachable = isDone || isCurrent;

        return (
          <button
            key={step.id}
            onClick={() => isReachable && onSelect(step.id)}
            disabled={!isReachable}
            className="flex items-start gap-3 text-left py-3 border-l-2 pl-4 transition-colors disabled:cursor-not-allowed"
            style={{
              borderColor: isCurrent ? "var(--accent)" : "transparent",
            }}
          >
            <span
              className="font-mono text-xs mt-0.5 w-5 shrink-0"
              style={{
                color: isCurrent
                  ? "var(--accent)"
                  : isDone
                  ? "var(--teal)"
                  : "var(--muted)",
              }}
            >
              {isDone && !isCurrent ? "✓" : String(i + 1).padStart(2, "0")}
            </span>
            <span>
              <span
                className="block text-sm"
                style={{
                  color: isCurrent || isDone ? "var(--paper)" : "var(--muted)",
                  fontWeight: isCurrent ? 600 : 400,
                }}
              >
                {step.label}
              </span>
              <span className="block font-mono text-[11px]" style={{ color: "var(--muted)" }}>
                {step.hint}
              </span>
            </span>
          </button>
        );
      })}
    </nav>
  );
}
