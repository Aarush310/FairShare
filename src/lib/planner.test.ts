import { describe, expect, it } from "vitest";
import { PlanError, requestPlan, validatePlan } from "./planner";
import { sampleBrief } from "./seed";

describe("planner", () => {
  it("turns the sample brief into a valid plan", async () => {
    const plan = validatePlan(await requestPlan(sampleBrief));
    expect(plan.deliverables.map((d) => d.title)).toEqual(["Project plan", "Data analysis", "Written report", "Presentation"]);
  });

  it("rejects off-schema output with a readable error", async () => {
    const short = await requestPlan("too short");
    expect(() => validatePlan(short)).toThrow(PlanError);
    expect(() => validatePlan("not json")).toThrow(PlanError);
    expect(() => validatePlan(JSON.stringify({ projectName: "x", deliverables: [] }))).toThrow(/deliverables/);
    const bad = { projectName: "x", deliverables: [{ title: "A", dueInDays: 3, tasks: [{ title: "T", points: 2, skills: [], dueInDays: 1, dependsOn: [] }] }] };
    expect(() => validatePlan(JSON.stringify(bad))).toThrow(/1, 3 or 5/);  });
});
