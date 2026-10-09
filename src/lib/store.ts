// Demo "back end": a single store persisted to localStorage. Every action goes through
// commit(), which saves an undo snapshot, keeps Notion's mirror in step, and checks
// whether the team has drifted enough to need a rebalance proposal.
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { distribute, first, movesSignature, proposePanicSplit, proposeRebalance, proposeTaskHandoff } from "./fairness";
import { buildDigest, lastMonday9, nudgesFor } from "./insights";
import type { Plan } from "./planner";
import { DAY, daysFrom, seedMembers, seedProject } from "./seed";
import type {
  Activity, Digest, Member, Move, Notification, NotionState, PanicRequest, PanicResponse, Project, RebalanceProposal, Status, Task, Vote,
} from "./types";

export interface Data {
  members: Member[];
  projects: Project[];
  currentProjectId: string;
  currentUserId: string;
  proposals: RebalanceProposal[];
  declinedSignatures: string[];
  panics: PanicRequest[];
  notifications: Notification[];
  activity: Activity[];
  digests: Digest[];
  notion: NotionState;
  settings: { autoApply: boolean; pushEnabled: boolean };
}

export interface Toast { id: string; text: string; canUndo: boolean }

interface Actions {
  setCurrentUser(id: string): void;
  setCurrentProject(id: string): void;
  setStatus(taskId: string, status: Status): void;
  reassign(taskId: string, memberId: string): void;
  updateMember(id: string, patch: Partial<Pick<Member, "hoursPerWeek" | "skills">>): void;
  createProjectFromPlan(plan: Plan, brief: string): string;
  vote(proposalId: string, vote: Vote): void;
  setAutoApply(on: boolean): void;
  setPushEnabled(on: boolean): void;
  draftPanic(memberId: string, taskId?: string): Move[];
  sendPanic(memberId: string, reason: string, moves: Move[]): void;
  respondPanic(requestId: string, taskId: string, response: PanicResponse): void;
  simulateProgress(memberId: string): void;
  sendNudges(): number;
  markAllRead(): void;
  connectNotion(): void;
  disconnectNotion(): void;
  syncNotion(): number;
  editInNotion(taskId: string, status: Status): void;
  generateDigest(): void;
  sendDigestToNotion(id: string): void;
  ensureWeeklyDigest(): void;
  resetDemo(): void;
  undo(): void;
  toast(text: string, canUndo?: boolean): void;
  dismissToast(id: string): void;
}

type State = Data & { toasts: Toast[] } & Actions;

let uid = 0;
const id = (p: string) => `${p}${Date.now().toString(36)}${(uid++).toString(36)}`;

export function seedData(now = Date.now()): Data {
  const project = seedProject(now);
  const base: Data = {
    members: seedMembers,
    projects: [project],
    currentProjectId: project.id,
    currentUserId: "m1",
    proposals: [],
    declinedSignatures: [],
    panics: [],
    notifications: [
      { id: "n0", at: now - 2 * 3600e3, kind: "info", title: "Welcome to Fairshare", body: "Your team's plan is ready. Aoife, your next task is the literature review.", read: false },
    ],
    activity: [
      { id: "a0", at: now - 9 * DAY, text: "Aoife confirmed the plan for Urban Heat Islands (18 tasks, 40 points)" },
      { id: "a1", at: now - 2 * DAY, text: "Ben changed his availability; Aoife is now carrying a bit extra" },
    ],
    digests: [],
    notion: { connected: false, autoSync: true, rows: {} },
    settings: { autoApply: false, pushEnabled: false },
  };
  const monday = lastMonday9(now);
  base.digests.push({ ...buildDigest(project, seedMembers, undefined, monday), id: "g0" });
  return withRebalanceCheck(base, now);
}

const DATA_KEYS: (keyof Data)[] = [
  "members", "projects", "currentProjectId", "currentUserId", "proposals", "declinedSignatures",
  "panics", "notifications", "activity", "digests", "notion", "settings",
];
const pick = (s: State): Data => Object.fromEntries(DATA_KEYS.map((k) => [k, s[k]])) as unknown as Data;

export const currentProject = (d: Data) => d.projects.find((p) => p.id === d.currentProjectId) ?? d.projects[0];
export const memberName = (d: Pick<Data, "members">, id: string | null | undefined) => d.members.find((m) => m.id === id)?.name ?? "Unassigned";

function mapTasks(d: Data, projectId: string, fn: (t: Task) => Task): Data {
  return { ...d, projects: d.projects.map((p) => (p.id === projectId ? { ...p, tasks: p.tasks.map(fn) } : p)) };
}
function log(d: Data, text: string, now: number): Data {
  return { ...d, activity: [{ id: id("a"), at: now, text }, ...d.activity].slice(0, 200) };
}
function notify(d: Data, n: Omit<Notification, "id" | "at" | "read">, now: number): Data {
  if (d.settings.pushEnabled) showSystemNotification(n.title, n.body);
  return { ...d, notifications: [{ ...n, id: id("n"), at: now, read: false }, ...d.notifications].slice(0, 100) };
}
function applyMoves(d: Data, projectId: string, moves: Move[], now: number, why: string): Data {
  const to = new Map(moves.map((m) => [m.taskId, m]));
  return mapTasks(d, projectId, (t) => (to.has(t.id) ? { ...t, assigneeId: to.get(t.id)!.toId, reason: `${why}: ${to.get(t.id)!.reason}`, updatedAt: now } : t));
}

/** Creates a proposal when members drift apart (or applies it, if the lead turned on auto-apply). */
function withRebalanceCheck(d: Data, now: number): Data {
  const project = currentProject(d);
  if (!project) return d;
  // A pending proposal whose tasks have since started or moved is stale: drop it.
  let next: Data = {
    ...d,
    proposals: d.proposals.filter((p) => {
      if (p.status !== "pending" || p.projectId !== project.id) return true;
      return p.moves.every((m) => { const t = project.tasks.find((x) => x.id === m.taskId); return t?.status === "todo" && t.assigneeId === m.fromId; });
    }),
  };
  if (next.proposals.some((p) => p.status === "pending" && p.projectId === project.id)) return next;
  const moves = proposeRebalance(next.members, project.tasks);
  if (moves.length === 0) return next;
  const signature = movesSignature(moves);
  if (next.declinedSignatures.includes(signature)) return next;
  const names = moves.map((m) => `${first(memberName(next, m.fromId))} → ${first(memberName(next, m.toId))}`).join(", ");

  if (next.settings.autoApply) {
    next = applyMoves(next, project.id, moves, now, "Auto-rebalanced");
    next = log(next, `Auto-rebalance moved ${moves.length} task${moves.length > 1 ? "s" : ""} (${names})`, now);
    return notify(next, { kind: "rebalance", title: "Workload evened out", body: `Fairshare moved ${moves.length} unstarted task${moves.length > 1 ? "s" : ""} so nobody's overloaded.` }, now);
  }
  const proposal: RebalanceProposal = { id: id("r"), projectId: project.id, createdAt: now, moves, status: "pending", votes: {}, signature };
  next = { ...next, proposals: [proposal, ...next.proposals] };
  next = log(next, `Rebalance proposed: ${names}`, now);
  return notify(next, { kind: "rebalance", title: "Time for a quick vote", body: `A small rebalance would even things out (${names}). Have a look?` }, now);
}

/** Push app-side status changes into the Notion mirror (app → Notion half of the sync). */
function withNotionPush(d: Data, now: number): Data {
  if (!d.notion.connected) return d;
  const rows = { ...d.notion.rows };
  let changed = false;
  for (const t of currentProject(d).tasks) {
    const r = rows[t.id];
    if (!r || (r.status !== t.status && t.updatedAt >= r.editedAt)) { rows[t.id] = { status: t.status, editedAt: t.updatedAt }; changed = true; }
  }
  return changed ? { ...d, notion: { ...d.notion, rows, lastSyncedAt: now } } : d;
}

function showSystemNotification(title: string, body: string) {
  try {
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
    navigator.serviceWorker?.ready
      .then((reg) => reg.showNotification(title, { body, icon: "/icon.svg", badge: "/icon.svg" }))
      .catch(() => new Notification(title, { body }));
  } catch { /* notifications are best-effort */ }
}

let undoSnapshot: Data | null = null;

export const useStore = create<State>()(
  persist(
    (set, get) => {
      /** Apply a change, remember the previous state for undo, then run side checks. */
      const commit = (fn: (d: Data, now: number) => Data, toast?: string, canUndo = true) => {
        const now = Date.now();
        const prev = pick(get());
        let next = fn(prev, now);
        next = withRebalanceCheck(next, now);
        next = withNotionPush(next, now);
        undoSnapshot = canUndo ? prev : undoSnapshot;
        set(next);
        if (toast) get().toast(toast, canUndo);
      };
      const project = () => currentProject(get());

      return {
        ...seedData(),
        toasts: [],

        setCurrentUser: (uid) => commit((d) => ({ ...d, currentUserId: uid }), `Now viewing as ${first(memberName(get(), uid))}`, false),
        setCurrentProject: (pid) => commit((d) => ({ ...d, currentProjectId: pid }), undefined, false),

        setStatus: (taskId, status) => {
          const t = project().tasks.find((x) => x.id === taskId);
          if (!t || t.status === status) return;
          const label = { todo: "To do", doing: "Doing", review: "Review", done: "Done" }[status];
          commit((d, now) => {
            let n = mapTasks(d, d.currentProjectId, (x) => (x.id === taskId ? { ...x, status, updatedAt: now } : x));
            n = log(n, `${first(memberName(d, d.currentUserId))} moved "${t.title}" to ${label}`, now);
            return n;
          }, status === "done" ? `Nice one! "${t.title}" is done` : `Moved to ${label}`);
        },

        reassign: (taskId, memberId) => {
          const t = project().tasks.find((x) => x.id === taskId);
          if (!t) return;
          commit((d, now) => log(
            mapTasks(d, d.currentProjectId, (x) => (x.id === taskId ? { ...x, assigneeId: memberId, reason: `Reassigned by ${first(memberName(d, d.currentUserId))}`, updatedAt: now } : x)),
            `"${t.title}" reassigned to ${first(memberName(d, memberId))}`, now,
          ), `Reassigned to ${first(memberName(get(), memberId))}`);
        },

        updateMember: (mid, patch) => commit(
          (d, now) => log({ ...d, members: d.members.map((m) => (m.id === mid ? { ...m, ...patch } : m)) }, `${first(memberName(d, mid))} updated their availability and skills`, now),
          "Saved",
        ),

        createProjectFromPlan: (plan, brief) => {
          const pid = id("p");
          commit((d, now) => {
            const deliverables = plan.deliverables.map((dl, i) => ({ id: `${pid}-d${i}`, title: dl.title, due: daysFrom(now, dl.dueInDays) }));
            const tasks: Task[] = plan.deliverables.flatMap((dl, i) => dl.tasks.map((t, j) => ({
              id: `${pid}-t${String(i).padStart(2, "0")}${String(j).padStart(2, "0")}`,
              title: t.title, deliverableId: deliverables[i].id, points: t.points, status: "todo" as Status, assigneeId: null,
              requiredSkills: t.skills, due: daysFrom(now, t.dueInDays),
              dependsOn: t.dependsOn.map((k) => `${pid}-t${String(i).padStart(2, "0")}${String(k).padStart(2, "0")}`),
              updatedAt: now,
            })));
            const assignment = new Map(distribute(tasks, d.members).map((a) => [a.taskId, a]));
            const assigned = tasks.map((t) => ({ ...t, assigneeId: assignment.get(t.id)!.assigneeId, reason: assignment.get(t.id)!.reason }));
            const due = deliverables.reduce((a, b) => (a > b.due ? a : b.due), daysFrom(now, 7));
            const p: Project = { id: pid, name: plan.projectName, course: "New project", startedAt: now, due, brief, deliverables, tasks: assigned };
            const n = { ...d, projects: [...d.projects, p], currentProjectId: pid, notion: { ...d.notion, rows: {} } };
            return log(n, `${first(memberName(d, d.currentUserId))} confirmed the plan for ${p.name} (${tasks.length} tasks)`, now);
          }, "Plan confirmed and work split evenly");
          return pid;
        },

        vote: (pid, v) => {
          const me = get().currentUserId;
          commit((d, now) => {
            const p = d.proposals.find((x) => x.id === pid);
            if (!p || p.status !== "pending") return d;
            const votes = { ...p.votes, [me]: v };
            // Demo shortcut: once the current user votes, everyone else follows their vote.
            for (const m of d.members) votes[m.id] ??= v;
            const yes = Object.values(votes).filter((x) => x === "yes").length;
            const status = yes > d.members.length / 2 ? "accepted" : "declined";
            let n: Data = { ...d, proposals: d.proposals.map((x) => (x.id === pid ? { ...x, votes, status } : x)) };
            if (status === "accepted") {
              n = applyMoves(n, p.projectId, p.moves, now, "Rebalanced");
              n = log(n, `Team accepted the rebalance (${p.moves.length} task${p.moves.length > 1 ? "s" : ""} moved)`, now);
            } else {
              n = { ...log(n, "Team declined the rebalance proposal", now), declinedSignatures: [...n.declinedSignatures, p.signature] };
            }
            return n;
          }, v === "yes" ? "Rebalance accepted. Tasks moved." : "Proposal declined. Nothing changed.");
        },

        setAutoApply: (on) => commit((d) => ({ ...d, settings: { ...d.settings, autoApply: on } }), on ? "Auto-apply is on" : "Auto-apply is off"),
        setPushEnabled: (on) => commit((d) => ({ ...d, settings: { ...d.settings, pushEnabled: on } }), on ? "Notifications on" : "Notifications off", false),

        draftPanic: (mid, taskId) => {
          if (!taskId) return proposePanicSplit(mid, get().members, project().tasks);
          const move = proposeTaskHandoff(taskId, get().members, project().tasks);
          return move ? [move] : [];
        },

        sendPanic: (mid, reason, moves) => commit((d, now) => {
          const req: PanicRequest = {
            id: id("h"), projectId: d.currentProjectId, memberId: mid, reason: reason.trim() || undefined, createdAt: now, moves,
            responses: Object.fromEntries(moves.map((m) => [m.taskId, "pending" as PanicResponse])), status: "open",
          };
          let n: Data = { ...d, panics: [req, ...d.panics] };
          n = log(n, `${first(memberName(d, mid))} asked for help with ${moves.length} task${moves.length > 1 ? "s" : ""}`, now);
          return notify(n, { kind: "panic", title: `${first(memberName(d, mid))} could use a hand`, body: `They've suggested a split of ${moves.length} task${moves.length > 1 ? "s" : ""}. Can you take one?` }, now);
        }, "Help request sent to your team"),

        respondPanic: (rid, taskId, response) => commit((d, now) => {
          const req = d.panics.find((r) => r.id === rid);
          const move = req?.moves.find((m) => m.taskId === taskId);
          if (!req || !move) return d;
          const responses = { ...req.responses, [taskId]: response };
          const status = Object.values(responses).every((r) => r !== "pending") ? "resolved" : "open";
          let n: Data = { ...d, panics: d.panics.map((r) => (r.id === rid ? { ...r, responses, status } : r)) };
          const task = currentProject(d).tasks.find((t) => t.id === taskId);
          if (response === "accepted") n = applyMoves(n, req.projectId, [move], now, "Took over to help");
          return log(n, `${first(memberName(d, move.toId))} ${response} "${task?.title}" from ${first(memberName(d, req.memberId))}'s help request`, now);
        }, response === "accepted" ? "Accepted. Task moved." : "Declined. It stays where it is."),

        simulateProgress: (mid) => {
          const next = project().tasks
            .filter((t) => t.assigneeId === mid && t.status !== "done")
            .sort((a, b) => ["doing", "review", "todo"].indexOf(a.status) - ["doing", "review", "todo"].indexOf(b.status) || a.id.localeCompare(b.id))[0];
          if (!next) { get().toast(`${first(memberName(get(), mid))} has nothing left to complete`, false); return; }
          commit((d, now) => log(
            mapTasks(d, d.currentProjectId, (t) => (t.id === next.id ? { ...t, status: "done", updatedAt: now } : t)),
            `[Demo] Simulated ${first(memberName(d, mid))} completing "${next.title}"`, now,
          ), `Simulated: ${first(memberName(get(), mid))} finished "${next.title}"`);
        },

        sendNudges: () => {
          const now = Date.now();
          const d = pick(get());
          const nudges = nudgesFor(d.currentUserId, currentProject(d), d.members, now);
          let n = d;
          for (const x of nudges) n = notify(n, x, now);
          set(n);
          return nudges.length;
        },

        markAllRead: () => set((s) => ({ notifications: s.notifications.map((n) => ({ ...n, read: true })) })),

        connectNotion: () => commit((d, now) => {
          const p = currentProject(d);
          const rows = Object.fromEntries(p.tasks.map((t) => [t.id, { status: t.status, editedAt: t.updatedAt }]));
          return log({ ...d, notion: { connected: true, autoSync: true, workspaceName: "Aoife's Notion", databaseName: `Fairshare · ${p.name}`, lastSyncedAt: now, rows } },
            `Connected Notion and created the "${p.name}" task database`, now);
        }, "Notion connected. Task database created.", false),

        disconnectNotion: () => commit((d, now) => log({ ...d, notion: { connected: false, autoSync: true, rows: {} } }, "Disconnected Notion", now), "Notion disconnected", false),

        syncNotion: () => {
          let pulled = 0;
          commit((d, now) => {
            if (!d.notion.connected) return d;
            const rows = d.notion.rows;
            // Notion → app: latest edit wins.
            const n = mapTasks(d, d.currentProjectId, (t) => {
              const r = rows[t.id];
              if (r && r.status !== t.status && r.editedAt > t.updatedAt) { pulled++; return { ...t, status: r.status, updatedAt: r.editedAt }; }
              return t;
            });
            const withLog = pulled ? log(n, `Pulled ${pulled} change${pulled > 1 ? "s" : ""} from Notion`, now) : n;
            return { ...withLog, notion: { ...withLog.notion, lastSyncedAt: now } };
          }, undefined, false);
          return pulled;
        },

        editInNotion: (taskId, status) => set((s) => ({
          notion: { ...s.notion, rows: { ...s.notion.rows, [taskId]: { status, editedAt: Date.now() } } },
        })),

        generateDigest: () => commit((d, now) => {
          const p = currentProject(d);
          const g: Digest = { ...buildDigest(p, d.members, d.proposals.find((x) => x.status === "pending" && x.projectId === p.id), now), id: id("g") };
          let n: Data = { ...d, digests: [g, ...d.digests] };
          if (d.notion.connected) n = { ...n, digests: n.digests.map((x) => (x.id === g.id ? { ...x, sentToNotion: true } : x)) };
          return notify(n, { kind: "digest", title: "Your weekly digest is ready", body: `${p.name} is ${Math.round(g.completion * 100)}% complete. ${g.action}` }, now);
        }, "Digest ready", false),

        sendDigestToNotion: (gid) => commit((d, now) => log({ ...d, digests: d.digests.map((g) => (g.id === gid ? { ...g, sentToNotion: true } : g)) }, "Sent the digest to Notion", now), "Sent to Notion", false),

        ensureWeeklyDigest: () => {
          const d = get();
          const monday = lastMonday9(Date.now());
          const has = d.digests.some((g) => g.projectId === d.currentProjectId && g.at >= monday);
          if (!has && Date.now() >= monday) get().generateDigest();
        },

        resetDemo: () => { undoSnapshot = null; set({ ...seedData(), toasts: [] }); get().toast("Demo reset to the starting state", false); },

        undo: () => {
          if (!undoSnapshot) return;
          set({ ...undoSnapshot });
          undoSnapshot = null;
          get().toast("Undone", false);
        },

        toast: (text, canUndo = false) => {
          const t = { id: id("x"), text, canUndo };
          set((s) => ({ toasts: [...s.toasts.slice(-2), t] }));
          setTimeout(() => get().dismissToast(t.id), canUndo ? 6000 : 3500);
        },
        dismissToast: (tid) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== tid) })),
      };
    },
    { name: "fairshare-demo-v1", partialize: (s) => pick(s as State) },
  ),
);
