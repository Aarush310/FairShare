import { describe, expect, it } from "vitest";
import { balanceOf, distribute, fairShares, memberStats, projectCompletion, proposePanicSplit, proposeRebalance, proposeTaskHandoff } from "./fairness";
import { seedMembers, seedProject } from "./seed";
import type { Task } from "./types";

const NOW = Date.UTC(2026, 9, 9);
const project = () => seedProject(NOW);

describe("fair share & stats", () => {
  it("splits points by availability", () => {
    const members = seedMembers.map((m, i) => ({ ...m, hoursPerWeek: i === 0 ? 12 : 4 }));
    const fair = fairShares(members, 48);
    expect(fair.m1).toBe(24);
    expect(fair.m2).toBe(8);
  });

  it("seed has Aoife at 110%, Ben at 90%, Chidi and Dana on track", () => {
    const stats = memberStats(seedMembers, project().tasks);
    const share = Object.fromEntries(stats.map((s) => [s.memberId, s.workloadShare]));
    expect(share.m1).toBeCloseTo(1.1);
    expect(share.m2).toBeCloseTo(0.9);
    expect(share.m3).toBeCloseTo(1);
    expect(share.m4).toBeCloseTo(1);
    expect(balanceOf(share.m1)).toBe("heavy");
    expect(balanceOf(share.m2)).toBe("room");
  });

  it("progress and completion", () => {
    const stats = memberStats(seedMembers, project().tasks);
    expect(stats.find((s) => s.memberId === "m1")!.progress).toBeCloseTo(2 / 11);
    expect(projectCompletion(project().tasks)).toBeCloseTo(8 / 40);
  });
});

describe("distribute", () => {
  const unassigned = (): Task[] => project().tasks.map((t) => ({ ...t, assigneeId: null, status: "todo" }));

  it("is deterministic", () => {
    expect(distribute(unassigned(), seedMembers)).toEqual(distribute(unassigned(), seedMembers));
  });

  it("keeps everyone within one small task of their fair share", () => {
    const tasks = unassigned();
    for (const a of distribute(tasks, seedMembers)) tasks.find((t) => t.id === a.taskId)!.assigneeId = a.assigneeId;
    for (const s of memberStats(seedMembers, tasks)) expect(Math.abs(s.assigned - s.fairShare)).toBeLessThanOrEqual(2);
  });

  it("gives every assignment a one-line reason", () => {
    for (const a of distribute(unassigned(), seedMembers)) expect(a.reason.length).toBeGreaterThan(10);
  });

  it("respects availability weighting", () => {
    const members = seedMembers.map((m) => ({ ...m, hoursPerWeek: m.id === "m1" ? 2 : 10 }));
    const tasks = unassigned();
    for (const a of distribute(tasks, members)) tasks.find((t) => t.id === a.taskId)!.assigneeId = a.assigneeId;
    const stats = Object.fromEntries(memberStats(members, tasks).map((s) => [s.memberId, s.assigned]));
    expect(stats.m1).toBeLessThan(stats.m2);
  });
});

describe("rebalance", () => {
  it("proposes moving Aoife's unstarted 1-pointer to Ben in the seed", () => {
    const moves = proposeRebalance(seedMembers, project().tasks);
    expect(moves).toHaveLength(1);
    expect(moves[0]).toMatchObject({ taskId: "t05", fromId: "m1", toId: "m2" });
  });

  it("is a no-op once balanced", () => {
    const tasks = project().tasks.map((t) => (t.id === "t05" ? { ...t, assigneeId: "m2" } : t));
    expect(proposeRebalance(seedMembers, tasks)).toEqual([]);
  });

  it("only moves unstarted tasks and at most 3 per cycle", () => {
    // Dana races ahead: finishes everything, so others now have more left than their share.
    const tasks = project().tasks.map((t) => (t.assigneeId === "m4" ? { ...t, status: "done" as const } : t));
    const moves = proposeRebalance(seedMembers, tasks);
    expect(moves.length).toBeGreaterThan(0);
    expect(moves.length).toBeLessThanOrEqual(3);
    expect(moves[0].toId).toBe("m4");
    for (const m of moves) expect(tasks.find((t) => t.id === m.taskId)!.status).toBe("todo");
  });

  it("is deterministic", () => {
    expect(proposeRebalance(seedMembers, project().tasks)).toEqual(proposeRebalance(seedMembers, project().tasks));
  });
});

describe("per-task help", () => {
  it("hands an in-progress task to a teammate, preferring matching skills", () => {
    const move = proposeTaskHandoff("t03", seedMembers, project().tasks); // Aoife's literature review (writing, research)
    expect(move).toMatchObject({ taskId: "t03", fromId: "m1", toId: "m2" });
  });
  it("refuses done tasks", () => {
    expect(proposeTaskHandoff("t01", seedMembers, project().tasks)).toBeNull();
  });
});

describe("panic split", () => {
  it("hands off only the requester's unstarted tasks to teammates", () => {
    const tasks = project().tasks;
    const moves = proposePanicSplit("m1", seedMembers, tasks);
    expect(moves.length).toBeGreaterThan(0);
    expect(moves.length).toBeLessThanOrEqual(3);
    for (const m of moves) {
      const t = tasks.find((x) => x.id === m.taskId)!;
      expect(t.assigneeId).toBe("m1");
      expect(t.status).toBe("todo");
      expect(m.toId).not.toBe("m1");
    }
  });
});
