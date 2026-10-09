import { Check, ClipboardPaste, FileUp, Plus, RefreshCw, Sparkles, Trash2, TriangleAlert } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router";
import { DemoTag } from "../components/ui";
import { PlanError, requestPlan, validatePlan, type Plan as PlanT } from "../lib/planner";
import { notionPages, sampleBrief } from "../lib/seed";
import { useStore } from "../lib/store";
import type { Points } from "../lib/types";

type Source = "paste" | "upload" | "notion";

export function Plan() {
  const navigate = useNavigate();
  const notionConnected = useStore((s) => s.notion.connected);
  const createProject = useStore((s) => s.createProjectFromPlan);
  const [source, setSource] = useState<Source>("paste");
  const [brief, setBrief] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "review">("idle");
  const [error, setError] = useState("");
  const [plan, setPlan] = useState<PlanT | null>(null);

  const run = async () => {
    setStatus("loading");
    try {
      const p = validatePlan(await requestPlan(brief));
      setPlan(p);
      setStatus("review");
    } catch (e) {
      setError(e instanceof PlanError ? e.message : "Something went wrong talking to the AI.");
      setStatus("error");
    }
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    if (!/\.(txt|md)$/i.test(file.name) && !file.type.startsWith("text/")) {
      setError("This demo reads .txt and .md files. Copy the text from a PDF or Word doc and paste it instead.");
      setStatus("error");
      return;
    }
    setBrief(await file.text());
    setStatus("idle");
  };

  const edit = (fn: (p: PlanT) => void) => setPlan((p) => { if (!p) return p; const c = structuredClone(p); fn(c); return c; });
  const totalPoints = plan?.deliverables.reduce((a, d) => a + d.tasks.reduce((b, t) => b + t.points, 0), 0) ?? 0;
  const taskCount = plan?.deliverables.reduce((a, d) => a + d.tasks.length, 0) ?? 0;

  if (status === "review" && plan) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col gap-5">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-muted">Step 2 of 2 · Review</p>
          <h1 className="text-3xl font-extrabold">Check the plan together</h1>
          <p className="mt-1">The AI drafted {taskCount} tasks ({totalPoints} points). Edit anything that looks off, then confirm to split the work fairly. Fairshare only plans the work and never writes your assignment.</p>
        </div>
        <div>
          <label htmlFor="pname" className="label">Project name</label>
          <input id="pname" className="input" value={plan.projectName} onChange={(e) => edit((p) => { p.projectName = e.target.value; })} />
        </div>
        {plan.deliverables.map((d, di) => (
          <section key={di} className="card p-4">
            <div className="mb-3 flex flex-wrap items-end gap-3">
              <div className="min-w-48 flex-1">
                <label className="label" htmlFor={`d${di}`}>Deliverable</label>
                <input id={`d${di}`} className="input font-semibold" value={d.title} onChange={(e) => edit((p) => { p.deliverables[di].title = e.target.value; })} />
              </div>
              <div className="w-32">
                <label className="label" htmlFor={`dd${di}`}>Due in (days)</label>
                <input id={`dd${di}`} type="number" min={1} className="input" value={d.dueInDays} onChange={(e) => edit((p) => { p.deliverables[di].dueInDays = Number(e.target.value) || 1; })} />
              </div>
            </div>
            <ul className="flex flex-col gap-2">
              {d.tasks.map((t, ti) => (
                <li key={ti} className="flex flex-wrap items-center gap-2 rounded-[12px] bg-bone p-2">
                  <input aria-label="Task title" className="input min-w-48 flex-1" value={t.title} onChange={(e) => edit((p) => { p.deliverables[di].tasks[ti].title = e.target.value; })} />
                  <select aria-label="Effort points" className="input w-24" value={t.points} onChange={(e) => edit((p) => { p.deliverables[di].tasks[ti].points = Number(e.target.value) as Points; })}>
                    {[1, 3, 5].map((n) => <option key={n} value={n}>{n} pt{n > 1 ? "s" : ""}</option>)}
                  </select>
                  <input aria-label="Skills" className="input w-40" value={t.skills.join(", ")} placeholder="skills"
                    onChange={(e) => edit((p) => { p.deliverables[di].tasks[ti].skills = e.target.value.split(",").map((s) => s.trim()).filter(Boolean); })} />
                  <button className="btn-ghost px-2" aria-label={`Remove ${t.title}`} onClick={() => edit((p) => {
                    p.deliverables[di].tasks.splice(ti, 1);
                    p.deliverables[di].tasks.forEach((x) => { x.dependsOn = x.dependsOn.filter((k) => k !== ti).map((k) => (k > ti ? k - 1 : k)); });
                  })}><Trash2 size={18} /></button>
                </li>
              ))}
            </ul>
            <button className="btn-ghost mt-2" onClick={() => edit((p) => { p.deliverables[di].tasks.push({ title: "New task", points: 1, skills: [], dueInDays: d.dueInDays, dependsOn: [] }); })}>
              <Plus size={18} aria-hidden /> Add task
            </button>
          </section>
        ))}
        <div className="sticky bottom-20 flex flex-wrap gap-2 rounded-[12px] bg-bone/95 py-2 md:bottom-4">
          <button className="btn-primary flex-1" disabled={taskCount === 0} onClick={() => {
            const clean = { ...plan, deliverables: plan.deliverables.filter((d) => d.tasks.length > 0) };
            createProject(clean, brief);
            navigate("/board");
          }}><Check size={18} aria-hidden /> Confirm and split the work</button>
          <button className="btn-secondary" onClick={() => setStatus("idle")}>Back to brief</button>
        </div>
      </div>
    );
  }

  const tabs: { id: Source; label: string; icon: typeof ClipboardPaste }[] = [
    { id: "paste", label: "Paste", icon: ClipboardPaste },
    { id: "upload", label: "Upload", icon: FileUp },
    { id: "notion", label: "Notion", icon: Sparkles },
  ];

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-muted">Step 1 of 2 · Brief</p>
        <h1 className="text-3xl font-extrabold">Start from your assignment brief</h1>
        <p className="mt-1">Fairshare reads the brief, drafts deliverables and tasks with effort points, then splits them fairly. You review everything first.</p>
      </div>

      <div role="tablist" aria-label="Brief source" className="grid grid-cols-3 gap-1 rounded-[12px] border border-line bg-bone-light p-1">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button key={id} role="tab" aria-selected={source === id} onClick={() => setSource(id)}
            className={`btn min-h-11 ${source === id ? "bg-mint-pale text-green" : "text-muted"}`}><Icon size={18} aria-hidden /> {label}</button>
        ))}
      </div>

      {source === "upload" && (
        <label className="card flex cursor-pointer flex-col items-center gap-2 border-2 border-dashed border-line p-6 text-center hover:bg-mint-pale/40">
          <FileUp size={28} className="text-mint" aria-hidden />
          <span className="font-semibold text-green">Choose a .txt or .md file</span>
          <span className="text-sm text-muted">The text appears below so you can check it.</span>
          <input type="file" accept=".txt,.md,text/plain,text/markdown" className="sr-only" onChange={(e) => onFile(e.target.files?.[0])} />
        </label>
      )}
      {source === "notion" && (
        <div className="card p-4">
          <div className="mb-2 flex items-center gap-2"><p className="flex-1 font-semibold text-green">Pick a Notion page</p><DemoTag>Sample pages</DemoTag></div>
          {!notionConnected && <p className="mb-2 text-sm text-muted">Tip: connect Notion in Settings. These sample pages work either way.</p>}
          <ul className="flex flex-col gap-1">
            {notionPages.map((p) => (
              <li key={p.id}><button className="btn-ghost w-full justify-start" onClick={() => { setBrief(p.body); setStatus("idle"); }}><span aria-hidden>{p.icon}</span> {p.title}</button></li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <div className="mb-1 flex items-end justify-between gap-2">
          <label htmlFor="brief" className="label mb-0">Assignment brief</label>
          <button className="text-sm text-green underline underline-offset-4" onClick={() => setBrief(sampleBrief)}>Use sample brief</button>
        </div>
        <textarea id="brief" className="input min-h-64 py-3 font-mono text-[15px]" value={brief} onChange={(e) => setBrief(e.target.value)}
          placeholder="Paste the brief from your course page: what you need to hand in, word counts, due dates…" />
      </div>

      {status === "error" && (
        <div role="alert" className="flex flex-wrap items-center gap-3 rounded-[12px] border-2 border-coral bg-bone-light p-4">
          <TriangleAlert className="shrink-0" aria-hidden />
          <p className="flex-1">{error}</p>
          <button className="btn-secondary" onClick={run} disabled={!brief.trim()}><RefreshCw size={18} aria-hidden /> Try again</button>
        </div>
      )}

      <button className="btn-primary" onClick={run} disabled={status === "loading" || !brief.trim()}>
        {status === "loading" ? <><RefreshCw size={18} className="animate-spin" aria-hidden /> Reading your brief…</> : <><Sparkles size={18} aria-hidden /> Draft the plan</>}
      </button>
      <p className="text-center text-sm text-muted">Demo: the AI planner runs locally from keywords. In production this calls an AI model from the server.</p>
    </div>
  );
}
