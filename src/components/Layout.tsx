import { Bell, FileText, House, LifeBuoy, Settings, Sparkles, SquareKanban, Undo2, Users, X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { NavLink, Outlet } from "react-router";
import { currentProject, useStore } from "../lib/store";
import { PanicDialog } from "./PanicDialog";
import { Avatar, Modal, ago } from "./ui";

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
    <span className="chip bg-mint-pale text-green text-sm" title="Polls Notion every 20 seconds while the app is open">
      <span aria-hidden className="font-bold">N</span> Synced with Notion · {notion.lastSyncedAt ? ago(notion.lastSyncedAt) : "never"}
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
              <p className="font-semibold text-green">{!n.read && <span className="mr-2 inline-block h-2 w-2 rounded-full bg-mint align-middle" aria-label="New" />}{n.title}</p>
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
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex flex-col items-center gap-2 px-4 md:bottom-6">
      {toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto flex items-center gap-3 rounded-[12px] bg-green py-2 pl-4 pr-2 text-bone-light shadow-soft">
          <span>{t.text}</span>
          {t.canUndo && (
            <button className="btn min-h-9 bg-bone-light/15 px-3 text-bone-light hover:bg-bone-light/25" onClick={() => { undo(); dismiss(t.id); }}>
              <Undo2 size={16} aria-hidden /> Undo
            </button>
          )}
          <button className="btn min-h-9 px-2 text-bone-light hover:bg-bone-light/15" aria-label="Dismiss" onClick={() => dismiss(t.id)}><X size={16} /></button>
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
    <button className={`btn-ghost relative px-3 ${className}`} onClick={() => setBell(true)} aria-label={`Notifications${unread ? `, ${unread} new` : ""}`}>
      <Bell size={20} aria-hidden />
      {unread > 0 && <span className="absolute right-1.5 top-1.5 min-w-5 rounded-full bg-mint px-1 text-center text-xs font-bold text-ink">{unread}</span>}
    </button>
  );

  return (
    <div className="min-h-dvh md:flex">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 btn-primary">Skip to content</a>

      {/* Desktop sidebar */}
      <aside className="no-print sticky top-0 hidden h-dvh w-60 shrink-0 flex-col gap-1 border-r border-line bg-bone-light/60 p-4 md:flex">
        <div className="mb-4 flex items-center gap-2 px-2">
          <img src="/icon.svg" alt="" className="h-8 w-8" />
          <span className="font-display text-xl font-extrabold text-green">Fairshare</span>
        </div>
        {nav.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} end={to === "/"}
            className={({ isActive }) => `flex min-h-11 items-center gap-3 rounded-[12px] px-3 font-medium ${isActive ? "bg-mint-pale text-green" : "text-ink hover:bg-mint-pale/60"}`}>
            <Icon size={20} aria-hidden className="text-green" /> {label}
          </NavLink>
        ))}
        <div className="mt-auto flex flex-col gap-3">
          <button className="btn-secondary w-full" onClick={() => setPanic(true)}><LifeBuoy size={18} aria-hidden /> I'm overloaded</button>
          <div className="flex items-center gap-2 px-1">
            <Avatar member={me} size={36} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{me?.name}</p>
              <p className="text-sm text-muted">{me?.role === "lead" ? "Team lead" : "Member"}</p>
            </div>
            <BellButton />
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header className="no-print sticky top-0 z-30 flex items-center gap-3 border-b border-line bg-bone/90 px-4 py-2 backdrop-blur md:px-8">
          <img src="/icon.svg" alt="" className="h-7 w-7 md:hidden" />
          <div className="min-w-0 flex-1">
            <p className="truncate font-display font-bold text-green">{project.name}</p>
            <p className="truncate text-sm text-muted">{project.course}</p>
          </div>
          <span className="hidden sm:inline-flex"><NotionBadge /></span>
          <BellButton className="md:hidden" />
        </header>

        <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 pb-28 pt-6 md:px-8 md:pb-10">
          <Outlet context={{ openPanic: () => setPanic(true) } satisfies LayoutContext} />
        </main>
      </div>

      {/* Mobile bottom tab bar */}
      <nav className="no-print fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-line bg-bone-light pb-[env(safe-area-inset-bottom)] md:hidden" aria-label="Main">
        {nav.filter((n) => !n.desktopOnly).map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} end={to === "/"}
            className={({ isActive }) => `flex min-h-14 flex-col items-center justify-center gap-0.5 text-xs font-medium ${isActive ? "text-green" : "text-muted"}`}>
            {({ isActive }) => (<>
              <span className={`rounded-full px-4 py-1 ${isActive ? "bg-mint-pale" : ""}`}><Icon size={22} aria-hidden /></span>
              {label}
            </>)}
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
  return <aside className="flex flex-col gap-4 lg:sticky lg:top-20 lg:self-start">{children}</aside>;
}

export function TwoCol({ main, side }: { main: ReactNode; side: ReactNode }) {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div className="flex min-w-0 flex-col gap-6">{main}</div>
      <SidePanel>{side}</SidePanel>
    </div>
  );
}
