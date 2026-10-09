// Nudges and the weekly digest. In production the digest wording comes from an LLM via an
// Edge Function; for the demo it is templated from the same numbers.
import { balanceOf, first, memberStats, projectCompletion } from "./fairness";
import { DAY } from "./seed";
import type { Digest, Member, Notification, Project, RebalanceProposal } from "./types";

const pct = (n: number) => `${Math.round(n * 100)}%`;
const dueTime = (iso: string) => new Date(iso + "T23:59:00").getTime();

export function pace(project: Project, now: number) {
  const span = dueTime(project.due) - project.startedAt;
  return span > 0 ? Math.min(1, Math.max(0, (now - project.startedAt) / span)) : 1;
}

export type Nudge = Pick<Notification, "title" | "body" | "kind">;

export function nudgesFor(memberId: string, project: Project, members: Member[], now: number): Nudge[] {
  const out: Nudge[] = [];
  const me = memberStats(members, project.tasks).find((s) => s.memberId === memberId);
  const expected = pace(project, now);
  if (me && me.assigned > 0 && expected - me.progress >= 0.08) {
    out.push({
      kind: "pace",
      title: "A gentle pace check",
      body: `You're ${pct(expected - me.progress)} behind pace. Want help catching up?`,
    });
  }
  for (const t of project.tasks) {
    if (t.assigneeId !== memberId || t.status === "done") continue;
    const days = Math.ceil((dueTime(t.due) - now) / DAY);
    if (days < 0) out.push({ kind: "deadline", title: "Overdue task", body: `"${t.title}" slipped past its date. Need a hand, or a new date?` });
    else if (days <= 2) out.push({ kind: "deadline", title: "Coming up soon", body: `"${t.title}" is due in ${days === 0 ? "less than a day" : `${days} day${days > 1 ? "s" : ""}`}. You've got this.` });
    if (t.status === "doing" && now - t.updatedAt > 4 * DAY)
      out.push({ kind: "stalled", title: "Still on it?", body: `"${t.title}" hasn't moved in ${Math.floor((now - t.updatedAt) / DAY)} days. Want to split it or ask for help?` });
  }
  return out;
}

export function buildDigest(project: Project, members: Member[], proposal: RebalanceProposal | undefined, now: number): Omit<Digest, "id"> {
  const stats = memberStats(members, project.tasks);
  const name = (id: string) => first(members.find((m) => m.id === id)?.name ?? "Someone");
  const deliverablesDone = project.deliverables
    .filter((d) => { const ts = project.tasks.filter((t) => t.deliverableId === d.id); return ts.length > 0 && ts.every((t) => t.status === "done"); })
    .map((d) => d.title);

  const balance = stats.map((s) => {
    const tone = balanceOf(s.workloadShare);
    const line =
      tone === "heavy" ? `${name(s.memberId)} is carrying a little extra (${pct(s.workloadShare)} of their share). A good moment to pass something on.`
      : tone === "room" ? `${name(s.memberId)} has some room (${pct(s.workloadShare)}) and could pick up something small.`
      : `${name(s.memberId)} is right on track (${pct(s.workloadShare)}) and ${pct(s.progress)} through their tasks.`;
    return { memberId: s.memberId, line, tone };
  });

  const risks: string[] = [];
  for (const t of project.tasks) {
    if (t.status === "done") continue;
    if (dueTime(t.due) < now) risks.push(`"${t.title}" is overdue (${name(t.assigneeId ?? "")}).`);
    else if (t.status === "doing" && now - t.updatedAt > 4 * DAY) risks.push(`"${t.title}" hasn't moved in a few days.`);
  }
  for (const d of project.deliverables) {
    const ts = project.tasks.filter((t) => t.deliverableId === d.id);
    const daysLeft = (dueTime(d.due) - now) / DAY;
    if (daysLeft >= 0 && daysLeft <= 10 && projectCompletion(ts) < 0.5) risks.push(`${d.title} is due in ${Math.ceil(daysLeft)} days and under half done.`);
  }

  const heavy = balance.find((b) => b.tone === "heavy");
  const action = proposal?.status === "pending"
    ? "Vote on the open rebalance proposal so the load evens out."
    : heavy ? `Ask ${name(heavy.memberId)} which task they'd most like to hand off.`
    : risks.length ? "Spend 10 minutes at your next check-in on the risks above."
    : "Keep it up. Celebrate the finished tasks at your next check-in.";

  return { projectId: project.id, at: now, completion: projectCompletion(project.tasks), deliverablesDone, balance, risks: risks.slice(0, 4), action, sentToNotion: false };
}

/** Most recent Monday 09:00 local time at or before `now`. */
export function lastMonday9(now: number): number {
  const d = new Date(now);
  d.setHours(9, 0, 0, 0);
  const back = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - back);
  if (d.getTime() > now) d.setDate(d.getDate() - 7);
  return d.getTime();
}
