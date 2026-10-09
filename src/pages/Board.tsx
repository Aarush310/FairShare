import { ArrowLeft, ArrowRight, Hourglass, LifeBuoy, Link2, Sparkles } from "lucide-react";
import { useState } from "react";
import { Link, useOutletContext } from "react-router";
import type { LayoutContext } from "../components/Layout";
import { Avatar, Empty, Modal, PointsChip } from "../components/ui";
import { first } from "../lib/fairness";
import { currentProject, useStore } from "../lib/store";
import type { Status, Task } from "../lib/types";
import { DueChip } from "./Home";

const columns: { id: Status; label: string }[] = [
  { id: "todo", label: "To do" },
  { id: "doing", label: "Doing" },
  { id: "review", label: "Review" },
  { id: "done", label: "Done" },
];

export function Board() {
  const { openPanic } = useOutletContext<LayoutContext>();
  const project = useStore(currentProject);
  const meId = useStore((s) => s.currentUserId);
  const setStatus = useStore((s) => s.setStatus);
  const [mine, setMine] = useState(false);
  const [mobileCol, setMobileCol] = useState<Status>("todo");
  const [open, setOpen] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<Status | null>(null);
  const tasks = project.tasks.filter((t) => !mine || t.assigneeId === meId);
  const openTask = project.tasks.find((t) => t.id === open);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="flex-1 text-3xl font-extrabold">Board</h1>
        <div role="group" aria-label="Filter" className="glass flex h-11 items-center rounded-full p-1">
          {[false, true].map((v) => (
            <button key={String(v)} aria-pressed={mine === v} onClick={() => setMine(v)}
              className={`btn min-h-9 px-4 text-[13px] ${mine === v ? "bg-ink text-white" : "text-muted hover:text-ink"}`}>{v ? "Just me" : "Everyone"}</button>
          ))}
        </div>
        <Link to="/plan" className="btn-primary"><Sparkles size={18} aria-hidden /> New plan</Link>
      </div>

      {/* Mobile: one column at a time */}
      <div role="tablist" aria-label="Columns" className="glass grid grid-cols-4 gap-1 rounded-full p-1 md:hidden">
        {columns.map((c) => (
          <button key={c.id} role="tab" aria-selected={mobileCol === c.id} onClick={() => setMobileCol(c.id)}
            className={`btn min-h-10 px-1 text-[13px] ${mobileCol === c.id ? "bg-ink text-white" : "text-muted hover:text-ink"}`}>
            {c.label} <span className="text-xs">{tasks.filter((t) => t.status === c.id).length}</span>
          </button>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {columns.map((c) => {
          const list = tasks.filter((t) => t.status === c.id);
          return (
            <section key={c.id} aria-label={c.label}
              className={`${mobileCol === c.id ? "flex" : "hidden"} min-h-40 flex-col gap-3 rounded-2xl p-2 transition-colors md:flex ${dragOver === c.id ? "bg-mint" : "bg-black/[0.03]"}`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(c.id); }}
              onDragLeave={() => setDragOver(null)}
              onDrop={(e) => { e.preventDefault(); setDragOver(null); const id = e.dataTransfer.getData("text/plain"); if (id) setStatus(id, c.id); }}>
              <h2 className="hidden px-2 pt-1 text-lg font-bold md:block">{c.label} <span className="text-base font-normal text-muted">{list.length}</span></h2>
              {list.length === 0 && (
                <p className="rounded-2xl border border-dashed border-line p-4 text-center text-sm text-muted">
                  {c.id === "todo" ? "Nothing waiting. Nice!" : c.id === "done" ? "Finished tasks land here." : "Drag a task here, or use the arrows on a card."}
                </p>
              )}
              {list.map((t) => <TaskCard key={t.id} task={t} onOpen={() => setOpen(t.id)} onHelp={() => openPanic(t.id)} />)}
            </section>
          );
        })}
      </div>
      {project.tasks.length === 0 && <Empty icon={<Sparkles size={32} />} title="No tasks yet">Paste your assignment brief on the <Link className="underline" to="/plan">New plan</Link> page and Fairshare will draft the tasks.</Empty>}
      {openTask && <TaskDialog task={openTask} onClose={() => setOpen(null)} onHelp={() => { setOpen(null); openPanic(openTask.id); }} />}
    </div>
  );
}

/** Whether this task already has an open help request waiting on a teammate. */
function useHelpPending(taskId: string) {
  return useStore((s) => s.panics.some((r) => r.status === "open" && r.responses[taskId] === "pending"));
}

/** Warm red "ask for help" button, shown only on your own unfinished tasks. */
function HelpButton({ task, onHelp, wide = false }: { task: Task; onHelp: () => void; wide?: boolean }) {
  const meId = useStore((s) => s.currentUserId);
  const pending = useHelpPending(task.id);
  if (task.assigneeId !== meId || task.status === "done") return null;
  if (pending) return <span className="chip self-start bg-alert-soft text-danger-ink"><Hourglass size={13} aria-hidden /> Help requested</span>;
  return (
    <button className={`btn-alert min-h-11 px-4 text-[14px] ${wide ? "" : "self-start"}`} onClick={onHelp}>
      <LifeBuoy size={16} strokeWidth={2.4} aria-hidden /> Need help with this?
    </button>
  );
}

function TaskCard({ task, onOpen, onHelp }: { task: Task; onOpen: () => void; onHelp: () => void }) {
  const member = useStore((s) => s.members.find((m) => m.id === task.assigneeId));
  const meId = useStore((s) => s.currentUserId);
  const setStatus = useStore((s) => s.setStatus);
  const idx = columns.findIndex((c) => c.id === task.status);
  const prev = columns[idx - 1];
  const next = columns[idx + 1];
  return (
    <article draggable onDragStart={(e) => e.dataTransfer.setData("text/plain", task.id)}
      className={`card cursor-grab rounded-2xl p-3.5 active:cursor-grabbing ${task.assigneeId === meId ? "ring-2 ring-green" : ""}`}>
      <button onClick={onOpen} className="block w-full text-left font-semibold text-ink hover:underline">{task.title}</button>
      <div className="mt-2 flex flex-wrap items-center gap-1.5 text-sm">
        <PointsChip points={task.points} />
        {task.status !== "done" && <DueChip iso={task.due} />}
      </div>
      <div className="mt-2 flex items-center gap-2">
        <Avatar member={member} size={28} />
        <span className="flex-1 truncate text-sm">{member ? first(member.name) : "Unassigned"}</span>
        {prev && <button className="btn-ghost min-h-11 px-2" aria-label={`Move to ${prev.label}`} onClick={() => setStatus(task.id, prev.id)}><ArrowLeft size={18} /></button>}
        {next && <button className="btn-ghost min-h-11 px-2" aria-label={`Move to ${next.label}`} onClick={() => setStatus(task.id, next.id)}><ArrowRight size={18} /></button>}
      </div>
      {task.reason && <p className="mt-1 line-clamp-2 text-xs text-muted" title={task.reason}>{task.reason}</p>}
      <div className="mt-3 flex empty:hidden"><HelpButton task={task} onHelp={onHelp} /></div>
    </article>
  );
}

function TaskDialog({ task, onClose, onHelp }: { task: Task; onClose: () => void; onHelp: () => void }) {
  const members = useStore((s) => s.members);
  const project = useStore(currentProject);
  const setStatus = useStore((s) => s.setStatus);
  const reassign = useStore((s) => s.reassign);
  const deliverable = project.deliverables.find((d) => d.id === task.deliverableId);
  const deps = task.dependsOn.map((id) => project.tasks.find((t) => t.id === id)).filter(Boolean) as Task[];
  return (
    <Modal title={task.title} onClose={onClose}>
      <div className="flex flex-col gap-4">
        <p className="flex flex-wrap gap-2 text-sm"><PointsChip points={task.points} /><DueChip iso={task.due} /><span className="chip bg-surface-alt text-ink">{deliverable?.title}</span></p>
        {task.reason && <p className="rounded-2xl bg-mint px-3 py-2 text-sm"><span className="font-semibold">Why this person:</span> {task.reason}</p>}
        <div>
          <span className="label">Status</span>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {columns.map((c) => (
              <button key={c.id} aria-pressed={task.status === c.id} onClick={() => setStatus(task.id, c.id)}
                className={`btn min-h-11 px-2 ${task.status === c.id ? "bg-ink text-white" : "border border-black/10 text-ink hover:bg-surface-alt"}`}>{c.label}</button>
            ))}
          </div>
        </div>
        <div>
          <label htmlFor="assignee" className="label">Assignee</label>
          <select id="assignee" className="input" value={task.assigneeId ?? ""} onChange={(e) => reassign(task.id, e.target.value)}>
            {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </div>
        {task.requiredSkills.length > 0 && <p className="text-sm"><span className="font-semibold text-ink">Skills:</span> {task.requiredSkills.join(", ")}</p>}
        {deps.length > 0 && (
          <div className="text-sm">
            <p className="flex items-center gap-1 font-semibold text-ink"><Link2 size={14} aria-hidden /> Waits on</p>
            <ul className="ml-5 list-disc">{deps.map((d) => <li key={d.id}>{d.title} <span className="text-muted">({columns.find((c) => c.id === d.status)?.label})</span></li>)}</ul>
          </div>
        )}
        <div className="flex flex-wrap gap-2 [&>*]:flex-1">
          <HelpButton task={task} onHelp={onHelp} wide />
          <button className="btn-primary" onClick={onClose}>Done</button>
        </div>
      </div>
    </Modal>
  );
}
