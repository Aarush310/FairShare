import { Bell, Download, Link2, RefreshCw, RotateCcw, Scale, Unlink } from "lucide-react";
import { useEffect, useState } from "react";
import { NotionBadge } from "../components/Layout";
import { Avatar, DemoTag, Modal } from "../components/ui";
import { currentProject, memberName, useStore } from "../lib/store";
import type { Status } from "../lib/types";

const statusLabel: Record<Status, string> = { todo: "Not started", doing: "In progress", review: "In review", done: "Done" };

interface InstallPrompt extends Event { prompt(): Promise<void> }
let deferredInstall: InstallPrompt | null = null;
window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); deferredInstall = e as InstallPrompt; });

function Section({ title, tag, children }: { title: string; tag?: string; children: React.ReactNode }) {
  return (
    <section className="card flex flex-col gap-3 p-5">
      <div className="flex items-center gap-2"><h2 className="flex-1 text-xl font-bold">{title}</h2>{tag && <DemoTag>{tag}</DemoTag>}</div>
      {children}
    </section>
  );
}

function Toggle({ id, checked, onChange, label, hint, disabled }: { id: string; checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string; disabled?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1"><label htmlFor={id} className="font-semibold text-green">{label}</label>{hint && <p className="text-sm text-muted">{hint}</p>}</div>
      <button id={id} role="switch" aria-checked={checked} disabled={disabled} onClick={() => onChange(!checked)}
        className={`relative h-8 w-14 shrink-0 cursor-pointer rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${checked ? "bg-mint" : "bg-line"}`}>
        <span className={`absolute top-1 h-6 w-6 rounded-full bg-bone-light shadow transition-all ${checked ? "left-7" : "left-1"}`} />
      </button>
    </div>
  );
}

function NotionOAuth({ onAllow, onClose }: { onAllow: () => void; onClose: () => void }) {
  return (
    <Modal title="Connect Notion" onClose={onClose}>
      <div className="flex flex-col gap-4">
        <p>Fairshare would like to:</p>
        <ul className="ml-5 list-disc">
          <li>Read pages you choose, to import a project brief</li>
          <li>Create a task database and keep its rows in sync</li>
          <li>Post weekly digests and the final report</li>
        </ul>
        <p className="text-sm text-muted">Demo: this stands in for Notion's OAuth screen. In production the access token is stored server-side and never reaches the browser.</p>
        <button className="btn-primary" onClick={onAllow}>Allow access</button>
      </div>
    </Modal>
  );
}

export function Settings() {
  const s = useStore();
  const project = currentProject(s);
  const me = s.members.find((m) => m.id === s.currentUserId)!;
  const [oauth, setOauth] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [perm, setPerm] = useState(typeof Notification === "undefined" ? "unsupported" : Notification.permission);
  const [installable, setInstallable] = useState(!!deferredInstall);
  const standalone = window.matchMedia("(display-mode: standalone)").matches;

  useEffect(() => {
    const on = () => setInstallable(true);
    window.addEventListener("beforeinstallprompt", on);
    return () => window.removeEventListener("beforeinstallprompt", on);
  }, []);

  const enablePush = async () => {
    if (typeof Notification === "undefined") return;
    const p = await Notification.requestPermission();
    setPerm(p);
    s.setPushEnabled(p === "granted");
  };

  const sendNudges = () => {
    const n = s.sendNudges();
    s.toast(n ? `Sent ${n} nudge${n > 1 ? "s" : ""} to ${me.name.split(" ")[0]}` : "Nothing to nudge about right now. All on pace!");
  };

  const pending = project.tasks.filter((t) => s.notion.rows[t.id] && s.notion.rows[t.id].status !== t.status).length;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5">
      <h1 className="text-3xl font-extrabold">Settings</h1>

      <Section title="Demo controls" tag="Demo">
        <div>
          <label htmlFor="viewas" className="label">Viewing as</label>
          <div className="flex items-center gap-2">
            <Avatar member={me} size={40} />
            <select id="viewas" className="input" value={s.currentUserId} onChange={(e) => s.setCurrentUser(e.target.value)}>
              {s.members.map((m) => <option key={m.id} value={m.id}>{m.name}{m.role === "lead" ? " (lead)" : ""}</option>)}
            </select>
          </div>
        </div>
        {s.projects.length > 1 && (
          <div>
            <label htmlFor="proj" className="label">Project</label>
            <select id="proj" className="input" value={s.currentProjectId} onChange={(e) => s.setCurrentProject(e.target.value)}>
              {s.projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        )}
        <button className="btn-secondary" onClick={() => setConfirmReset(true)}><RotateCcw size={18} aria-hidden /> Reset demo</button>
      </Section>

      <Section title="Notion">
        {!s.notion.connected ? (
          <>
            <p>Import briefs from Notion, keep a task database in sync, and post digests automatically.</p>
            <button className="btn-primary" onClick={() => setOauth(true)}><Link2 size={18} aria-hidden /> Connect Notion</button>
          </>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2"><NotionBadge /><span className="text-sm text-muted">{s.notion.workspaceName}</span></div>
            <p className="text-sm">Two-way sync by polling every 20 seconds. If a task changes in both places, the latest edit wins. <DemoTag>Simulated Notion</DemoTag></p>
            <div className="overflow-x-auto rounded-[12px] border border-line bg-white">
              <p className="border-b border-line px-3 py-2 font-semibold">📋 {s.notion.databaseName}</p>
              <table className="w-full text-left text-sm">
                <thead className="text-muted"><tr><th className="px-3 py-2 font-medium">Title</th><th className="px-3 py-2 font-medium">Assignee</th><th className="px-3 py-2 font-medium">Status</th><th className="px-3 py-2 font-medium">Points</th><th className="px-3 py-2 font-medium">Due date</th></tr></thead>
                <tbody>
                  {project.tasks.map((t) => {
                    const row = s.notion.rows[t.id];
                    return (
                      <tr key={t.id} className="border-t border-line">
                        <td className="px-3 py-1.5">{t.title}</td>
                        <td className="px-3 py-1.5">{memberName(s, t.assigneeId)}</td>
                        <td className="px-3 py-1.5">
                          <select aria-label={`Status in Notion for ${t.title}`} className="rounded border border-line bg-white px-1 py-1" value={row?.status ?? t.status}
                            onChange={(e) => s.editInNotion(t.id, e.target.value as Status)}>
                            {(Object.keys(statusLabel) as Status[]).map((k) => <option key={k} value={k}>{statusLabel[k]}</option>)}
                          </select>
                        </td>
                        <td className="px-3 py-1.5">{t.points}</td>
                        <td className="px-3 py-1.5">{t.due}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="text-sm text-muted">Try it: change a status in this Notion table, then tap "Sync now" (or wait 20s) and watch the board update.</p>
            <div className="flex flex-wrap gap-2">
              <button className="btn-primary" onClick={() => { const n = s.syncNotion(); s.toast(n ? `Pulled ${n} change${n > 1 ? "s" : ""} from Notion` : "Everything's already in sync"); }}>
                <RefreshCw size={18} aria-hidden /> Sync now{pending ? ` (${pending} waiting)` : ""}
              </button>
              <button className="btn-ghost" onClick={s.disconnectNotion}><Unlink size={18} aria-hidden /> Disconnect</button>
            </div>
          </>
        )}
      </Section>

      <Section title="Notifications">
        {perm === "unsupported" ? <p className="text-muted">This browser doesn't support notifications.</p> : perm !== "granted" ? (
          <>
            <p>Get gentle nudges about pace, deadlines, stalled tasks and rebalance votes.</p>
            <button className="btn-primary" onClick={enablePush}><Bell size={18} aria-hidden /> Turn on notifications</button>
            {perm === "denied" && <p className="text-sm text-muted">Notifications are blocked. Allow them in your browser's site settings.</p>}
          </>
        ) : (
          <Toggle id="push" checked={s.settings.pushEnabled} onChange={s.setPushEnabled} label="Push notifications" hint="Shown on this device, even when the app is in the background." />
        )}
        <button className="btn-secondary" onClick={sendNudges}>Send today's nudges to {me.name.split(" ")[0]}</button>
        <p className="text-sm text-muted">Demo: nudges are triggered here. In production a scheduled job sends them through Web Push.</p>
      </Section>

      <Section title="Rebalancing">
        <Toggle id="auto" checked={s.settings.autoApply} onChange={s.setAutoApply} label="Auto-apply small rebalances" disabled={me.role !== "lead"}
          hint={me.role === "lead" ? "Move up to 3 unstarted tasks automatically when the team drifts apart. You can always undo." : "Only the team lead can change this."} />
        {me.role !== "lead" && <p className="flex items-center gap-2 text-sm text-muted"><Scale size={16} aria-hidden /> Switch "Viewing as" to Aoife to change this.</p>}
      </Section>

      <Section title="Install the app">
        {standalone ? <p>Fairshare is installed. 🎉</p> : installable ? (
          <button className="btn-primary" onClick={async () => { await deferredInstall?.prompt(); deferredInstall = null; setInstallable(false); }}><Download size={18} aria-hidden /> Install Fairshare</button>
        ) : <p className="text-muted">Use your browser's "Install app" or "Add to Home Screen" option to install Fairshare.</p>}
      </Section>

      {oauth && <NotionOAuth onClose={() => setOauth(false)} onAllow={() => { s.connectNotion(); setOauth(false); }} />}
      {confirmReset && (
        <Modal title="Reset the demo?" onClose={() => setConfirmReset(false)}>
          <p className="mb-4">This restores the starting team and project. Any changes you've made will be lost.</p>
          <div className="flex gap-2">
            <button className="btn-primary flex-1" onClick={() => { s.resetDemo(); setConfirmReset(false); }}>Reset</button>
            <button className="btn-secondary" onClick={() => setConfirmReset(false)}>Cancel</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
