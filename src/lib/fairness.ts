// Pure, deterministic fairness maths. No randomness, no dates, no I/O —
// the same input always gives the same output so the demo is repeatable.
import type { Member, Move, Task } from "./types";

export interface MemberStats {
  memberId: string;
  fairShare: number;
  assigned: number;
  completed: number;
  remaining: number;
  /** points assigned / fair share (1.1 = overloaded, 0.9 = room for more) */
  workloadShare: number;
  /** points completed / points assigned */
  progress: number;
}

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const byId = <T extends { id: string }>(a: T, b: T) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

export function weights(members: Member[]): Record<string, number> {
  const total = sum(members.map((m) => Math.max(0, m.hoursPerWeek)));
  const out: Record<string, number> = {};
  for (const m of members) out[m.id] = total > 0 ? Math.max(0, m.hoursPerWeek) / total : 1 / members.length;
  return out;
}

/** Total project points split across members, weighted by availability. */
export function fairShares(members: Member[], totalPoints: number): Record<string, number> {
  const w = weights(members);
  const out: Record<string, number> = {};
  for (const m of members) out[m.id] = totalPoints * w[m.id];
  return out;
}

export function memberStats(members: Member[], tasks: Task[]): MemberStats[] {
  const total = sum(tasks.map((t) => t.points));
  const fair = fairShares(members, total);
  return members.map((m) => {
    const mine = tasks.filter((t) => t.assigneeId === m.id);
    const assigned = sum(mine.map((t) => t.points));
    const completed = sum(mine.filter((t) => t.status === "done").map((t) => t.points));
    return {
      memberId: m.id,
      fairShare: fair[m.id],
      assigned,
      completed,
      remaining: assigned - completed,
      workloadShare: fair[m.id] > 0 ? assigned / fair[m.id] : 0,
      progress: assigned > 0 ? completed / assigned : 0,
    };
  });
}

export function projectCompletion(tasks: Task[]): number {
  const total = sum(tasks.map((t) => t.points));
  if (total === 0) return 0;
  return sum(tasks.filter((t) => t.status === "done").map((t) => t.points)) / total;
}

export type Balance = "heavy" | "room" | "good";
export function balanceOf(workloadShare: number, tolerance = 0.05): Balance {
  if (workloadShare > 1 + tolerance) return "heavy";
  if (workloadShare < 1 - tolerance) return "room";
  return "good";
}

const skillMatch = (m: Member, t: Task) => t.requiredSkills.filter((s) => m.skills.includes(s));

/**
 * Even distribution. Biggest tasks first (ties by id); each goes to the member with the
 * most room left against their fair share. A skill match wins when it doesn't push that
 * member noticeably past their share.
 */
export function distribute(tasks: Task[], members: Member[]): { taskId: string; assigneeId: string; reason: string }[] {
  if (members.length === 0) return [];
  const total = sum(tasks.map((t) => t.points));
  const fair = fairShares(members, total);
  const load: Record<string, number> = Object.fromEntries(members.map((m) => [m.id, 0]));
  const sortedMembers = [...members].sort(byId);
  const order = [...tasks].sort((a, b) => b.points - a.points || byId(a, b));
  const result: { taskId: string; assigneeId: string; reason: string }[] = [];

  for (const t of order) {
    const gap = (m: Member) => fair[m.id] - load[m.id];
    const mostRoom = sortedMembers.reduce((best, m) => (gap(m) > gap(best) ? m : best));
    const skilled = sortedMembers
      .filter((m) => skillMatch(m, t).length > 0 && gap(m) - t.points >= -1)
      .reduce<Member | null>((best, m) => (!best || gap(m) > gap(best) ? m : best), null);
    const pick = skilled ?? mostRoom;
    const roomBefore = Math.max(0, Math.round(gap(pick) * 10) / 10);
    load[pick.id] += t.points;
    const skills = skillMatch(pick, t);
    const reason = skills.length
      ? `Good at ${skills.join(" & ")} and had ${roomBefore} of ${round(fair[pick.id])} points free`
      : `Had the most room left (${roomBefore} of ${round(fair[pick.id])} points free)`;
    result.push({ taskId: t.id, assigneeId: pick.id, reason });
  }
  return result;
}

const round = (n: number) => Math.round(n * 10) / 10;

function remainingTargets(members: Member[], tasks: Task[]) {
  const open = tasks.filter((t) => t.status !== "done");
  const totalRemaining = sum(open.map((t) => t.points));
  const w = weights(members);
  const remaining: Record<string, number> = Object.fromEntries(members.map((m) => [m.id, 0]));
  for (const t of open) if (t.assigneeId && t.assigneeId in remaining) remaining[t.assigneeId] += t.points;
  const target: Record<string, number> = Object.fromEntries(members.map((m) => [m.id, totalRemaining * w[m.id]]));
  return { remaining, target };
}

export interface RebalanceOptions {
  maxMoves?: number;
  tolerance?: number;
}

/**
 * Rebalancer. Compares each member's remaining (not done) points against their fair share
 * of what's left. While someone is above (1 + tolerance) and someone else below (1 - tolerance),
 * move one unstarted task from the most overloaded to the member with the most room, choosing
 * the move that improves balance the most. At most `maxMoves` moves per cycle.
 */
export function proposeRebalance(members: Member[], tasks: Task[], opts: RebalanceOptions = {}): Move[] {
  const { maxMoves = 3, tolerance = 0.05 } = opts;
  const { remaining, target } = remainingTargets(members, tasks);
  const owner: Record<string, string | null> = Object.fromEntries(tasks.map((t) => [t.id, t.assigneeId]));
  const moved = new Set<string>();
  const moves: Move[] = [];
  const memberById = Object.fromEntries(members.map((m) => [m.id, m]));
  const ratio = (id: string) => (target[id] > 0 ? remaining[id] / target[id] : remaining[id] > 0 ? Infinity : 1);
  const cost = () => sum(members.map((m) => (remaining[m.id] - target[m.id]) ** 2));
  const sorted = [...members].sort(byId);

  while (moves.length < maxMoves) {
    const over = sorted.reduce((a, b) => (ratio(b.id) > ratio(a.id) ? b : a));
    const under = sorted.reduce((a, b) => (ratio(b.id) < ratio(a.id) ? b : a));
    if (ratio(over.id) <= 1 + tolerance || ratio(under.id) >= 1 - tolerance) break;

    const before = cost();
    const candidates = tasks
      .filter((t) => owner[t.id] === over.id && t.status === "todo" && !moved.has(t.id))
      .map((t) => {
        remaining[over.id] -= t.points;
        remaining[under.id] += t.points;
        const after = cost();
        remaining[over.id] += t.points;
        remaining[under.id] -= t.points;
        return { t, after, skill: skillMatch(under, t).length };
      })
      .filter((c) => c.after < before - 1e-9)
      .sort((a, b) => a.after - b.after || b.skill - a.skill || a.t.points - b.t.points || byId(a.t, b.t));

    const best = candidates[0];
    if (!best) break;
    const overLeft = remaining[over.id];
    const underLeft = remaining[under.id];
    remaining[over.id] -= best.t.points;
    remaining[under.id] += best.t.points;
    owner[best.t.id] = under.id;
    moved.add(best.t.id);
    moves.push({
      taskId: best.t.id,
      fromId: over.id,
      toId: under.id,
      reason: `${first(memberById[over.id].name)} has ${overLeft} pts left vs a fair ${round(target[over.id])}; ${first(
        memberById[under.id].name,
      )} has room (${underLeft} of ${round(target[under.id])})`,
    });
  }
  return moves;
}

/**
 * Panic button split: hand off the requester's unstarted tasks (biggest first) until their
 * remaining load drops to ~80% of their fair share of what's left, at most `maxMoves` tasks.
 * Each task goes to the teammate with the most spare capacity, with a bonus for matching skills.
 */
export function proposePanicSplit(memberId: string, members: Member[], tasks: Task[], maxMoves = 3): Move[] {
  const { remaining, target } = remainingTargets(members, tasks);
  const others = members.filter((m) => m.id !== memberId).sort(byId);
  if (others.length === 0) return [];
  const mine = tasks
    .filter((t) => t.assigneeId === memberId && t.status === "todo")
    .sort((a, b) => b.points - a.points || byId(a, b));
  const goal = target[memberId] * 0.8;
  const moves: Move[] = [];
  for (const t of mine) {
    if (moves.length >= maxMoves) break;
    if (remaining[memberId] <= goal && moves.length > 0) break;
    const spare = (m: Member) => target[m.id] - remaining[m.id];
    const score = (m: Member) => spare(m) + (skillMatch(m, t).length > 0 ? 2 : 0);
    const to = others.reduce((a, b) => (score(b) > score(a) ? b : a));
    const skills = skillMatch(to, t);
    moves.push({
      taskId: t.id,
      fromId: memberId,
      toId: to.id,
      reason: skills.length
        ? `${first(to.name)} knows ${skills.join(" & ")} and has ${round(Math.max(0, spare(to)))} pts spare`
        : `${first(to.name)} has the most spare capacity (${round(Math.max(0, spare(to)))} pts)`,
    });
    remaining[memberId] -= t.points;
    remaining[to.id] += t.points;
  }
  return moves;
}

/**
 * Per-task help request from the board: hand this one task (not started or in progress)
 * to the teammate with the most spare capacity, with a bonus for matching skills.
 */
export function proposeTaskHandoff(taskId: string, members: Member[], tasks: Task[]): Move | null {
  const t = tasks.find((x) => x.id === taskId);
  if (!t || !t.assigneeId || t.status === "done") return null;
  const { remaining, target } = remainingTargets(members, tasks);
  const others = members.filter((m) => m.id !== t.assigneeId).sort(byId);
  if (others.length === 0) return null;
  const spare = (m: Member) => target[m.id] - remaining[m.id];
  const score = (m: Member) => spare(m) + (skillMatch(m, t).length > 0 ? 2 : 0);
  const to = others.reduce((a, b) => (score(b) > score(a) ? b : a));
  const skills = skillMatch(to, t);
  return {
    taskId: t.id,
    fromId: t.assigneeId,
    toId: to.id,
    reason: skills.length
      ? `${first(to.name)} knows ${skills.join(" & ")} and has ${round(Math.max(0, spare(to)))} pts spare`
      : `${first(to.name)} has the most spare capacity (${round(Math.max(0, spare(to)))} pts)`,
  };
}

export function movesSignature(moves: Move[]): string {
  return moves.map((m) => `${m.taskId}:${m.fromId}>${m.toId}`).join("|");
}

export const first = (name: string) => name.split(" ")[0];
