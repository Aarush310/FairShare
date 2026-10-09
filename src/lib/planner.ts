// Simulated AI planner. In production this would be an Edge Function calling an LLM;
// for the demo it builds the same structured JSON locally from keywords in the brief.
// Either way, the output goes through validatePlan() before the UI trusts it.
import type { Points } from "./types";

export interface PlanTask {
  title: string;
  points: Points;
  skills: string[];
  dueInDays: number;
  dependsOn: number[]; // indexes into the deliverable's task list
}
export interface PlanDeliverable {
  title: string;
  dueInDays: number;
  tasks: PlanTask[];
}
export interface Plan {
  projectName: string;
  deliverables: PlanDeliverable[];
}

type Template = { match: RegExp; title: string; tasks: [string, Points, string[]][] };

const templates: Template[] = [
  { match: /\bplan\b|proposal outline|timeline/i, title: "Project plan", tasks: [
    ["Agree scope and goals", 1, ["writing"]], ["Draw the project timeline", 1, ["design"]], ["Write the one-page plan", 3, ["writing"]],
  ] },
  { match: /survey|questionnaire|market research/i, title: "Survey & research", tasks: [
    ["Write survey questions", 3, ["research"]], ["Collect responses", 3, ["research"]], ["Summarise survey results", 3, ["data"]],
  ] },
  { match: /data|analysis|analyse|analyze|statistic/i, title: "Data analysis", tasks: [
    ["Find and clean the dataset", 3, ["data"]], ["Run the analysis", 5, ["data", "coding"]], ["Make charts", 3, ["data", "design"]],
  ] },
  { match: /requirement/i, title: "Requirements", tasks: [
    ["Interview two users", 3, ["research"]], ["Write the requirements doc", 3, ["writing"]],
  ] },
  { match: /prototype|app\b|software|website|code/i, title: "Prototype", tasks: [
    ["Sketch the screens", 3, ["design"]], ["Build core features", 5, ["coding"]], ["Write tests", 3, ["coding"]], ["Fix bugs from testing", 3, ["coding"]],
  ] },
  { match: /report|essay|paper|proposal|write-up/i, title: "Written report", tasks: [
    ["Find sources", 3, ["research"]], ["Write introduction", 3, ["writing"]], ["Write main sections", 5, ["writing", "research"]], ["Proofread and format", 1, ["editing"]],
  ] },
  { match: /poster|mock-?up|social media/i, title: "Visual materials", tasks: [
    ["Draft the visual concept", 3, ["design"]], ["Produce final designs", 5, ["design"]],
  ] },
  { match: /video/i, title: "Demo video", tasks: [
    ["Write the video script", 1, ["writing"]], ["Record and edit the video", 5, ["design", "presenting"]],
  ] },
  { match: /presentation|pitch|slides|talk/i, title: "Presentation", tasks: [
    ["Build the slides", 5, ["design", "presenting"]], ["Write speaker notes", 3, ["presenting"]], ["Run a full rehearsal", 1, ["presenting"]],
  ] },
];

export class PlanError extends Error {}

/** "Calls the AI". Returns raw JSON text, like an LLM would. */
export async function requestPlan(brief: string): Promise<string> {
  await new Promise((r) => setTimeout(r, 1400));
  const text = brief.trim();
  if (text.length < 40) {
    // Mimic a model that couldn't find a plan: returns something off-schema.
    return JSON.stringify({ message: "I couldn't find any deliverables in that brief." });
  }
  const firstLine = text.split("\n")[0].replace(/[—–-].*$/, "").trim();
  const nameMatch = text.split("\n")[0].match(/[:—–-]\s*(.+)$/);
  const projectName = (nameMatch?.[1] ?? firstLine).slice(0, 60);

  let picked = templates.filter((tpl) => tpl.match.test(text));
  if (picked.length === 0) picked = [templates[0], templates[5], templates[8]];
  const step = Math.max(3, Math.floor(21 / picked.length));
  const plan: Plan = {
    projectName,
    deliverables: picked.map((tpl, i) => {
      const due = Math.min(21, step * (i + 1));
      return {
        title: tpl.title,
        dueInDays: due,
        tasks: tpl.tasks.map(([title, points, skills], j) => ({
          title, points, skills,
          dueInDays: Math.max(1, due - (tpl.tasks.length - 1 - j) * 2),
          dependsOn: j > 0 ? [j - 1] : [],
        })),
      };
    }),
  };
  return JSON.stringify(plan);
}

const isStr = (v: unknown): v is string => typeof v === "string" && v.trim().length > 0;
const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

/** Schema check for AI output. Throws PlanError with a readable message. */
export function validatePlan(raw: string): Plan {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new PlanError("The AI reply wasn't valid JSON.");
  }
  const p = data as Partial<Plan>;
  if (!p || typeof p !== "object") throw new PlanError("The AI reply was empty.");
  if (!isStr(p.projectName)) throw new PlanError("The plan is missing a project name.");
  if (!Array.isArray(p.deliverables) || p.deliverables.length === 0)
    throw new PlanError("The AI couldn't find any deliverables in this brief. Try adding a list of what you need to hand in.");
  p.deliverables.forEach((d, i) => {
    if (!isStr(d?.title) || !isNum(d.dueInDays)) throw new PlanError(`Deliverable ${i + 1} is missing a title or due date.`);
    if (!Array.isArray(d.tasks) || d.tasks.length === 0) throw new PlanError(`"${d.title}" has no tasks.`);
    d.tasks.forEach((t) => {
      if (!isStr(t?.title)) throw new PlanError(`A task in "${d.title}" has no title.`);
      if (![1, 3, 5].includes(t.points)) throw new PlanError(`"${t.title}" must be 1, 3 or 5 points.`);
      if (!Array.isArray(t.skills) || !t.skills.every(isStr)) throw new PlanError(`"${t.title}" has invalid skills.`);
      if (!isNum(t.dueInDays)) throw new PlanError(`"${t.title}" has no due date.`);
      if (!Array.isArray(t.dependsOn) || !t.dependsOn.every(isNum)) throw new PlanError(`"${t.title}" has invalid dependencies.`);
    });
  });
  return p as Plan;
}
