import { TriangleAlert, X } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";
import { balanceOf } from "../lib/fairness";
import type { Member } from "../lib/types";

export const initials = (name: string) => name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();
export const pct = (n: number) => `${Math.round(n * 100)}%`;

export function Avatar({ member, size = 40 }: { member?: Member; size?: number }) {
  if (!member) return <span className="inline-flex shrink-0 items-center justify-center rounded-full border border-dashed border-black/15 text-muted" style={{ width: size, height: size }}>?</span>;
  return (
    <span
      aria-hidden
      className="inline-flex shrink-0 items-center justify-center rounded-full font-bold tracking-[-0.02em] text-ink ring-2 ring-white"
      style={{ width: size, height: size, background: member.avatar, fontSize: size * 0.38 }}
    >
      {initials(member.name)}
    </span>
  );
}

/** Fitness-style progress ring; `value` 0..1. */
export function Ring({ value, size = 44, stroke = 5, label, color = "var(--color-green)", track = "rgb(11 16 13 / 0.08)" }: {
  value: number; size?: number; stroke?: number; label?: string; color?: string; track?: string;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <span className="relative inline-grid shrink-0 place-items-center" style={{ width: size, height: size }} role="img" aria-label={label ?? `${pct(value)} complete`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - Math.min(1, value))} style={{ transition: "stroke-dashoffset 1.1s var(--ease-out-expo)" }} />
      </svg>
      <span className="numeral absolute text-[11px] font-bold">{Math.round(value * 100)}</span>
    </span>
  );
}

export function Bar({ value, label, dark = false }: { value: number; label: string; dark?: boolean }) {
  return (
    <div role="progressbar" aria-label={label} aria-valuenow={Math.round(value * 100)} aria-valuemin={0} aria-valuemax={100}
      className={`h-2.5 w-full overflow-hidden rounded-full ${dark ? "bg-white/10" : "bg-black/[0.06]"}`}>
      <div className={`h-full rounded-full transition-[width] duration-700 ${dark ? "bg-volt" : "bg-green"}`} style={{ width: `${Math.min(100, value * 100)}%` }} />
    </div>
  );
}

const Dot = ({ className }: { className: string }) => <span aria-hidden className={`inline-block size-1.5 shrink-0 rounded-full ${className}`} />;

/** Workload share chip: tinted pill + dot/icon + words, never colour alone. */
export function ShareChip({ share }: { share: number }) {
  const b = balanceOf(share);
  if (b === "heavy") return <span className="chip bg-danger-soft text-danger-ink"><TriangleAlert size={13} strokeWidth={2.6} aria-hidden /> {pct(share)} · Overloaded</span>;
  if (b === "room") return <span className="chip bg-[#FEF0C7] text-[#93370D]"><Dot className="bg-amber" /> {pct(share)} · Has room</span>;
  return <span className="chip bg-mint text-green-700"><Dot className="bg-green" /> {pct(share)} · On track</span>;
}

export function PointsChip({ points }: { points: number }) {
  return <span className="chip bg-surface-alt font-mono text-[12px] text-ink-3 ring-1 ring-black/[0.06]" title="Effort points">{points} pt{points > 1 ? "s" : ""}</span>;
}

export function Logo({ size = 30 }: { size?: number }) {
  return (
    <span className="grid shrink-0 place-items-center rounded-[10px] bg-ink" style={{ width: size, height: size }} aria-hidden>
      <svg width={size * 0.62} height={size * 0.62} viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="8" stroke="#fff" strokeWidth="2.2" />
        <path d="M12 4a8 8 0 0 1 8 8h-8z" fill="var(--color-volt)" />
      </svg>
    </span>
  );
}

/** Small uppercase label above a heading, as in the reference panels. */
export function Eyebrow({ children, className = "text-green-700" }: { children: ReactNode; className?: string }) {
  return <p className={`eyebrow ${className}`}>{children}</p>;
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
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <div ref={ref} role="dialog" aria-modal aria-label={title} onClick={(e) => e.stopPropagation()}
        className="card max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-b-none p-5 sm:rounded-b-[22px] sm:p-6">
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 className="text-[22px] font-bold leading-7">{title}</h2>
          <button data-close className="grid size-9 shrink-0 cursor-pointer place-items-center rounded-full bg-surface-alt text-ink ring-1 ring-black/[0.06] transition hover:scale-105" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Empty({ icon, title, children }: { icon: ReactNode; title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-black/10 bg-surface-alt px-4 py-8 text-center">
      <span className="grid size-12 place-items-center rounded-full bg-mint text-green-700">{icon}</span>
      <p className="font-bold tracking-[-0.02em]">{title}</p>
      {children && <div className="text-muted">{children}</div>}
    </div>
  );
}

export function DemoTag({ children = "Demo" }: { children?: ReactNode }) {
  return (
    <span className="eyebrow inline-flex items-center gap-1.5 rounded-full bg-surface-alt px-2.5 py-1 text-muted ring-1 ring-black/[0.06]">
      <Dot className="bg-amber" />{children}
    </span>
  );
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
