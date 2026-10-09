import type { Member, Points, Project, Status, Task } from "./types";

export const DAY = 24 * 60 * 60 * 1000;

/** ISO date (yyyy-mm-dd) `n` days from `from`. */
export function daysFrom(from: number, n: number): string {
  return new Date(from + n * DAY).toISOString().slice(0, 10);
}

export const seedMembers: Member[] = [
  { id: "m1", name: "Aoife Byrne", role: "lead", hoursPerWeek: 8, skills: ["writing", "editing"], avatar: "#F2C9B8" },
  { id: "m2", name: "Ben Okafor", role: "member", hoursPerWeek: 8, skills: ["research", "writing"], avatar: "#C9DDF2" },
  { id: "m3", name: "Chidi Mensah", role: "member", hoursPerWeek: 8, skills: ["data", "coding"], avatar: "#E6D3F0" },
  { id: "m4", name: "Dana Kowalski", role: "member", hoursPerWeek: 8, skills: ["design", "presenting"], avatar: "#F3E3A6" },
];

export const sampleBrief = `GEOG 2040 — Group Research Project: Urban Heat Islands

In groups of four, investigate how green space affects summer temperatures in your city.

Deliverables
- Project plan (1 page), due end of week 1
- Data analysis of city temperature data with at least two charts
- Research report (2,500 words) with introduction, literature review, methodology, findings
- 10-minute group presentation with slides

Each member must contribute evenly. Cite at least 8 peer-reviewed sources.`;

function seedReason(memberId: string, skills: string[]) {
  const m = seedMembers.find((x) => x.id === memberId)!;
  const match = skills.filter((k) => m.skills.includes(k));
  return match.length ? `Good at ${match.join(" & ")} and had room in their share` : "Had the most room left when the plan was made";
}

/**
 * Demo project: 18 tasks, 40 points, equal availability so each fair share is 10.
 * Aoife holds 11 (110%), Ben 9 (90%), Chidi and Dana 10 each — the rebalancer
 * immediately proposes moving one unstarted 1-point task from Aoife to Ben.
 */
export function seedProject(now: number): Project {
  const d = (n: number) => daysFrom(now, n);
  const deliverables = [
    { id: "d1", title: "Project plan", due: d(-2) },
    { id: "d2", title: "Data analysis", due: d(9) },
    { id: "d3", title: "Research report", due: d(16) },
    { id: "d4", title: "Group presentation", due: d(20) },
  ];
  const t = (
    id: string, title: string, deliverableId: string, points: Points, status: Status,
    assigneeId: string, requiredSkills: string[], due: number, dependsOn: string[] = [], ageDays = 1,
  ): Task => ({
    id, title, deliverableId, points, status, assigneeId, requiredSkills, due: d(due), dependsOn,
    reviewerId: null, updatedAt: now - ageDays * DAY,
    reason: seedReason(assigneeId, requiredSkills),
  });
  const tasks: Task[] = [
    // Aoife — 11 pts
    t("t01", "Agree the research question", "d1", 1, "done", "m1", ["writing"], -4, [], 6),
    t("t02", "Set up shared report outline", "d1", 1, "done", "m1", ["writing"], -2, [], 4),
    t("t03", "Write literature review", "d3", 5, "doing", "m1", ["writing", "research"], 10, ["t07"], 2),
    t("t04", "Write introduction", "d3", 3, "todo", "m1", ["writing"], 12),
    t("t05", "Proofread the final report", "d3", 1, "todo", "m1", ["editing", "writing"], 15, ["t04", "t03"]),
    // Ben — 9 pts
    t("t06", "Find city temperature datasets", "d2", 1, "done", "m2", ["research"], -3, [], 5),
    t("t07", "Summarise 3 prior studies", "d3", 1, "done", "m2", ["research"], -1, [], 3),
    t("t08", "Find 8 peer-reviewed sources", "d3", 3, "doing", "m2", ["research"], 6, [], 5),
    t("t09", "Write methodology section", "d3", 3, "todo", "m2", ["writing"], 12, ["t11"]),
    t("t10", "Build the reference list", "d3", 1, "todo", "m2", ["research"], 15, ["t08"]),
    // Chidi — 10 pts
    t("t11", "Clean the temperature dataset", "d2", 1, "done", "m3", ["data"], -1, ["t06"], 2),
    t("t12", "Choose the analysis method", "d2", 1, "done", "m3", ["data"], 0, [], 1),
    t("t13", "Run green-space regression", "d2", 5, "doing", "m3", ["data", "coding"], 7, ["t11"], 1),
    t("t14", "Make charts for the report", "d2", 3, "todo", "m3", ["data", "design"], 9, ["t13"]),
    // Dana — 10 pts
    t("t15", "Design the slide template", "d4", 1, "done", "m4", ["design"], 2, [], 2),
    t("t16", "Draw the project timeline", "d1", 1, "done", "m4", ["design"], -2, [], 4),
    t("t17", "Build presentation slides", "d4", 5, "todo", "m4", ["design", "presenting"], 18, ["t14"]),
    t("t18", "Write speaker notes", "d4", 3, "todo", "m4", ["presenting", "writing"], 19, ["t17"]),
  ];
  return {
    id: "p1",
    name: "Urban Heat Islands",
    course: "GEOG 2040",
    startedAt: now - 9 * DAY,
    due: d(20),
    brief: sampleBrief,
    deliverables,
    tasks,
  };
}

/** Mock Notion pages offered on the "Import from Notion" tab. */
export const notionPages = [
  { id: "np1", title: "GEOG 2040 · Group project brief", icon: "🌳", body: sampleBrief },
  {
    id: "np2",
    title: "Marketing 301 · Campaign pitch",
    icon: "📣",
    body: `Marketing 301 — Campaign Pitch

Teams of four create a marketing campaign for a local business.

Deliverables
- Market research survey of at least 30 people
- Written campaign proposal (2,000 words)
- Poster or social media mock-ups
- 8-minute pitch presentation`,
  },
  {
    id: "np3",
    title: "CS 220 · Team software project",
    icon: "💻",
    body: `CS 220 — Team Software Project

Build a small web app that helps students find study partners.

Deliverables
- Requirements document
- Working prototype app with tests
- Short demo video (3 minutes)
- Final report reflecting on the process`,
  },
];
