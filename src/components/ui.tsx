import { TriangleAlert, X } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";
import { balanceOf } from "../lib/fairness";
import type { Member } from "../lib/types";

export const initials = (name: string) => name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();
export const pct = (n: number) => `${Math.round(n * 100)}%`;

export function Avatar({ member, size = 40 }: { member?: Member; size?: number }) {
  if (!member) return <span className="inline-flex shrink-0 items-center justify-center rounded-full border border-dashed border-line text-muted" style={{ width: size, height: size }}>?</span>;
  return (
    <span
      aria-hidden
      className="inline-flex shrink-0 items-center justify-center rounded-full font-display font-bold text-ink"
      style={{ width: size, height: size, background: member.avatar, fontSize: size * 0.38 }}
    >
      {initials(member.name)}
    </span>
  );
}

/** Small progress ring; `value` 0..1. */
export function Ring({ value, size = 44, stroke = 5, label }: { value: number; size?: number; stroke?: number; label?: string }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <span className="relative inline-flex shrink-0 items-center justify-center" style={{ width: size, height: size }} role="img" aria-label={label ?? `${pct(value)} complete`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-mint-pale)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-mint)" strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - Math.min(1, value))} style={{ transition: "stroke-dashoffset .5s ease" }} />
      </svg>
      <span className="absolute text-[11px] font-semibold text-green">{Math.round(value * 100)}</span>
    </span>
  );
}

export function Bar({ value, label }: { value: number; label: string }) {
  return (
    <div role="progressbar" aria-label={label} aria-valuenow={Math.round(value * 100)} aria-valuemin={0} aria-valuemax={100}
      className="h-3 w-full overflow-hidden rounded-full bg-mint-pale">
      <div className="h-full rounded-full bg-mint transition-[width] duration-500" style={{ width: `${Math.min(100, value * 100)}%` }} />
    </div>
  );
}

/** Workload share chip. Overload always has an icon + words, never colour alone. */
export function ShareChip({ share }: { share: number }) {
  const b = balanceOf(share);
  if (b === "heavy") return <span className="chip bg-coral text-ink"><TriangleAlert size={14} aria-hidden /> {pct(share)} · Overloaded</span>;
  if (b === "room") return <span className="chip bg-mint-pale text-green">{pct(share)} · Has room</span>;
  return <span className="chip bg-bone text-green">{pct(share)} · On track</span>;
}

export function PointsChip({ points }: { points: number }) {
  return <span className="chip border border-line text-green" title="Effort points">{points} pt{points > 1 ? "s" : ""}</span>;
}

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    ref.current?.querySelector<HTMLElement>("textarea, input, button:not([data-close])")?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/30 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div ref={ref} role="dialog" aria-modal aria-label={title} onClick={(e) => e.stopPropagation()}
        className="card max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-b-none p-5 sm:rounded-b-[12px] sm:p-6">
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 className="text-xl font-bold">{title}</h2>
          <button data-close className="btn-ghost -mr-2 -mt-2 px-2" onClick={onClose} aria-label="Close"><X size={20} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Empty({ icon, title, children }: { icon: ReactNode; title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-[12px] border border-dashed border-line px-4 py-8 text-center">
      <span className="text-mint">{icon}</span>
      <p className="font-display font-bold text-green">{title}</p>
      {children && <div className="text-muted">{children}</div>}
    </div>
  );
}

export function DemoTag({ children = "Demo" }: { children?: ReactNode }) {
  return <span className="chip bg-bone text-muted text-xs uppercase tracking-wide">{children}</span>;
}

export function ago(at: number, now = Date.now()) {
  const s = Math.max(0, Math.round((now - at) / 1000));
  if (s < 45) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  return `${d} day${d > 1 ? "s" : ""} ago`;
}

export function dueLabel(iso: string, now = Date.now()) {
  const days = Math.ceil((new Date(iso + "T23:59:00").getTime() - now) / 86400000);
  if (days < 0) return { text: `${-days} day${days < -1 ? "s" : ""} overdue`, overdue: true };
  if (days === 0) return { text: "Due today", overdue: false };
  if (days === 1) return { text: "Due tomorrow", overdue: false };
  return { text: `Due in ${days} days`, overdue: false };
}
