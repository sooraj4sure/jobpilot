import type { GapType } from "@/lib/types";

const GAP_STYLES: Record<GapType, { label: string; color: string }> = {
  missing: { label: "missing", color: "var(--rust)" },
  underdeveloped: { label: "underdeveloped", color: "var(--accent)" },
  unclear: { label: "unclear", color: "var(--slate)" },
};

export function GapChip({ type }: { type: GapType }) {
  const { label, color } = GAP_STYLES[type];
  return (
    <span
      className="font-mono text-[11px] tracking-wide uppercase px-2 py-0.5 rounded-sm border inline-block"
      style={{ color, borderColor: color }}
    >
      {label}
    </span>
  );
}

export function MatchedChip() {
  return (
    <span
      className="font-mono text-[11px] tracking-wide uppercase px-2 py-0.5 rounded-sm border inline-block"
      style={{ color: "var(--teal)", borderColor: "var(--teal)" }}
    >
      matched
    </span>
  );
}

// Horizontal instrument-style gauge for the 0-100 fit score. Deliberately
// not a circular "SaaS dashboard" ring — reads like a needle gauge instead.
export function FitGauge({ score }: { score: number }) {
  const clamped = Math.max(0, Math.min(100, score));
  const color =
    clamped >= 70 ? "var(--teal)" : clamped >= 40 ? "var(--accent)" : "var(--rust)";

  return (
    <div className="flex items-end gap-4">
      <span className="font-mono text-6xl leading-none" style={{ color }}>
        {clamped}
      </span>
      <div className="flex-1 pb-2">
        <div
          className="h-1.5 w-full rounded-full overflow-hidden"
          style={{ background: "var(--panel-line)" }}
        >
          <div
            className="h-full rounded-full"
            style={{ width: `${clamped}%`, background: color }}
          />
        </div>
        <div className="flex justify-between font-mono text-[10px] mt-1" style={{ color: "var(--muted)" }}>
          <span>0</span>
          <span>fit score</span>
          <span>100</span>
        </div>
      </div>
    </div>
  );
}

export function Panel({
  children,
  accentTop = true,
}: {
  children: React.ReactNode;
  accentTop?: boolean;
}) {
  return (
    <div
      className="rounded-md border"
      style={{
        background: "var(--panel)",
        borderColor: "var(--panel-line)",
        borderTopColor: accentTop ? "var(--accent)" : "var(--panel-line)",
        borderTopWidth: accentTop ? 2 : 1,
      }}
    >
      {children}
    </div>
  );
}

export function PrimaryButton({
  children,
  onClick,
  disabled,
  type = "button",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="px-5 py-2.5 rounded-sm text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40"
      style={{
        background: "var(--accent)",
        color: "var(--ink)",
      }}
    >
      {children}
    </button>
  );
}

export function GhostButton({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="px-4 py-2 rounded-sm text-sm border transition-colors disabled:cursor-not-allowed disabled:opacity-40"
      style={{ borderColor: "var(--panel-line)", color: "var(--paper-dim)" }}
    >
      {children}
    </button>
  );
}

export function ErrorNote({ message }: { message: string }) {
  return (
    <div
      className="text-sm rounded-sm px-3 py-2 border font-mono"
      style={{ borderColor: "var(--rust)", color: "var(--rust)" }}
    >
      {message}
    </div>
  );
}

export function Loading({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 font-mono text-sm" style={{ color: "var(--muted)" }}>
      <span
        className="inline-block w-2 h-2 rounded-full animate-pulse"
        style={{ background: "var(--accent)" }}
      />
      {label}
    </div>
  );
}
