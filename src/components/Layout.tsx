import { Bell, FileText, House, LifeBuoy, Settings, Sparkles, SquareKanban, Undo2, Users, X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { NavLink, Outlet } from "react-router";
import { currentProject, useStore } from "../lib/store";
import { PanicDialog } from "./PanicDialog";
import { Avatar, Logo, Modal, ago } from "./ui";

const nav = [
  { to: "/", label: "Home", icon: House },
  { to: "/board", label: "Board", icon: SquareKanban },
  { to: "/team", label: "Team", icon: Users },
  { to: "/plan", label: "New plan", icon: Sparkles, desktopOnly: true },
  { to: "/report", label: "Report", icon: FileText },
  { to: "/settings", label: "Settings", icon: Settings },
];

/** Re-render every 30s so "x min ago" labels stay fresh. */
export function useTick(ms = 30000) {
  const [, set] = useState(0);
  useEffect(() => { const t = setInterval(() => set((n) => n + 1), ms); return () => clearInterval(t); }, [ms]);
}

export function NotionBadge() {
  const notion = useStore((s) => s.notion);
  useTick();
  if (!notion.connected) return null;
  return (
    <span className="glass inline-flex h-11 items-center gap-2 rounded-full px-3.5 text-[13px] font-semibold" title="Polls Notion every 20 seconds while the app is open">
      <span className="relative flex size-2" aria-hidden>
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green opacity-60" />
        <span className="relative inline-flex size-2 rounded-full bg-green" />
      </span>
      Synced with Notion · {notion.lastSyncedAt ? ago(notion.lastSyncedAt) : "never"}
    </span>
  );
}

function Notifications({ onClose }: { onClose: () => void }) {
  const items = useStore((s) => s.notifications);
  const markAllRead = useStore((s) => s.markAllRead);
  useEffect(() => () => markAllRead(), [markAllRead]);
  return (
    <Modal title="Notifications" onClose={onClose}>
      {items.length === 0 ? <p className="text-muted">You're all caught up.</p> : (
        <ul className="divide-y divide-line">
          {items.map((n) => (
            <li key={n.id} className="py-3">
              <p className="font-semibold text-ink">{!n.read && <span className="mr-2 inline-block h-2 w-2 rounded-full bg-green align-middle" aria-label="New" />}{n.title}</p>
              <p>{n.body}</p>
              <p className="text-sm text-muted">{ago(n.at)}</p>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}

function Toasts() {
  const toasts = useStore((s) => s.toasts);
  const undo = useStore((s) => s.undo);
  const dismiss = useStore((s) => s.dismissToast);
  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-28 z-50 flex flex-col items-center gap-2 px-4 md:bottom-6">
      {toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto flex items-center gap-3 rounded-full bg-ink/95 py-1.5 pl-5 pr-1.5 text-[15px] text-white shadow-[0_24px_60px_-12px_rgb(0_0_0/0.45)] backdrop-blur-xl">
          <span>{t.text}</span>
          {t.canUndo && (
            <button className="btn min-h-9 bg-volt px-3.5 text-ink hover:brightness-105" onClick={() => { undo(); dismiss(t.id); }}>
              <Undo2 size={16} aria-hidden /> Undo
            </button>
          )}
          <button className="btn min-h-9 px-2.5 text-white/70 hover:bg-white/10 hover:text-white" aria-label="Dismiss" onClick={() => dismiss(t.id)}><X size={16} /></button>
        </div>
      ))}
    </div>
  );
}

export function Layout() {
  const [panic, setPanic] = useState(false);
  const [bell, setBell] = useState(false);
  const project = useStore(currentProject);
  const me = useStore((s) => s.members.find((m) => m.id === s.currentUserId));
  const unread = useStore((s) => s.notifications.filter((n) => !n.read).length);
  const notion = useStore((s) => s.notion);
  const syncNotion = useStore((s) => s.syncNotion);
  const ensureWeeklyDigest = useStore((s) => s.ensureWeeklyDigest);

  useEffect(() => { ensureWeeklyDigest(); }, [ensureWeeklyDigest]);
  // Polling-based Notion sync (demo stands in for the Edge Function poller).
  useEffect(() => {
    if (!notion.connected || !notion.autoSync) return;
    const t = setInterval(() => syncNotion(), 20000);
    return () => clearInterval(t);
  }, [notion.connected, notion.autoSync, syncNotion]);

  const BellButton = ({ className = "" }: { className?: string }) => (
    <button className={`glass relative grid size-11 shrink-0 cursor-pointer place-items-center rounded-full text-ink transition hover:scale-105 ${className}`} onClick={() => setBell(true)} aria-label={`Notifications${unread ? `, ${unread} new` : ""}`}>
      <Bell size={18} aria-hidden />
      {unread > 0 && <span className="absolute -right-1 -top-1 grid min-w-5 place-items-center rounded-full bg-volt px-1 text-[11px] font-bold text-ink ring-2 ring-paper">{unread}</span>}
    </button>
  );

  return (
    <div className="min-h-dvh">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 btn-primary">Skip to content</a>

      {/* Floating pill header: logo, segmented nav (desktop), status + actions */}
      <header className="no-print sticky top-0 z-30 bg-gradient-to-b from-paper via-paper/85 to-transparent px-4 pb-4 pt-3 md:px-6 md:pt-4">
        <div className="mx-auto flex max-w-6xl items-center gap-3">
          <NavLink to="/" className="glass inline-flex h-11 shrink-0 items-center gap-2.5 rounded-full py-1 pl-1.5 pr-4" aria-label="Fairshare home">
            <Logo size={32} />
            <span className="hidden text-[15px] font-bold tracking-[-0.02em] sm:inline">Fairshare</span>
          </NavLink>

          <nav className="glass hidden h-11 items-center rounded-full p-1 md:flex" aria-label="Main">
            {nav.map(({ to, label, icon: Icon }) => (
              <NavLink key={to} to={to} end={to === "/"}
                className={({ isActive }) => `inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-semibold transition-colors duration-200 lg:px-4 ${isActive ? "bg-ink text-white" : "text-muted hover:text-ink"}`}>
                <Icon size={15} strokeWidth={2.4} aria-hidden /> {label}
              </NavLink>
            ))}
          </nav>

          <div className="min-w-0 flex-1 md:hidden">
            <p className="truncate text-[15px] font-bold tracking-[-0.02em]">{project.name}</p>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <span className="hidden xl:inline-flex"><NotionBadge /></span>
            <button className="btn-secondary hidden h-11 lg:inline-flex" onClick={() => setPanic(true)}><LifeBuoy size={16} aria-hidden /> I'm overloaded</button>
            <BellButton />
            <span className="glass hidden h-11 items-center gap-2 rounded-full py-1 pl-1 pr-3.5 md:inline-flex" title={me?.role === "lead" ? "Team lead" : "Member"}>
              <Avatar member={me} size={34} />
              <span className="text-[13px] font-semibold">{me?.name.split(" ")[0]}</span>
            </span>
          </div>
        </div>
      </header>

      <main id="main" className="mx-auto w-full max-w-6xl px-4 pb-28 pt-2 md:px-6 md:pb-12">
        <Outlet context={{ openPanic: () => setPanic(true) } satisfies LayoutContext} />
      </main>

      {/* Mobile bottom tab bar */}
      <nav className="no-print fixed inset-x-3 bottom-3 z-40 grid grid-cols-5 rounded-[22px] bg-ink p-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))] shadow-[0_24px_60px_-12px_rgb(0_0_0/0.45)] md:hidden" aria-label="Main">
        {nav.filter((n) => !n.desktopOnly).map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} end={to === "/"}
            className={({ isActive }) => `flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-2xl text-[11px] font-semibold ${isActive ? "bg-white/10 text-volt" : "text-white/60"}`}>
            <Icon size={21} aria-hidden /> {label}
          </NavLink>
        ))}
      </nav>

      {panic && <PanicDialog onClose={() => setPanic(false)} />}
      {bell && <Notifications onClose={() => setBell(false)} />}
      <Toasts />
    </div>
  );
}

export interface LayoutContext { openPanic: () => void }

export function SidePanel({ children }: { children: ReactNode }) {
  return <aside className="flex flex-col gap-4 lg:sticky lg:top-24 lg:self-start">{children}</aside>;
}

export function TwoCol({ main, side }: { main: ReactNode; side: ReactNode }) {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div className="flex min-w-0 flex-col gap-6">{main}</div>
      <SidePanel>{side}</SidePanel>
    </div>
  );
}
