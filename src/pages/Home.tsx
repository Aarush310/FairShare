import { CalendarDays, Check, LifeBuoy, Play, Sparkles } from "lucide-react";
import { useMemo } from "react";
import { Link, useOutletContext } from "react-router";
import { NotionBadge, TwoCol, type LayoutContext } from "../components/Layout";
import { HelpRequests, RebalanceCard } from "../components/Proposals";
import { Avatar, Bar, Empty, PointsChip, Ring, ShareChip, dueLabel, pct } from "../components/ui";
import { first, memberStats, projectCompletion } from "../lib/fairness";
import { nudgesFor } from "../lib/insights";
import { currentProject, useStore } from "../lib/store";

const statusOrder = { doing: 0, review: 1, todo: 2, done: 3 } as const;

export function Home() {
  const { openPanic } = useOutletContext<LayoutContext>();
  const project = useStore(currentProject);
  const members = useStore((s) => s.members);
  const meId = useStore((s) => s.currentUserId);
  const setStatus = useStore((s) => s.setStatus);
  const me = members.find((m) => m.id === meId)!;

  const stats = useMemo(() => memberStats(members, project.tasks), [members, project.tasks]);
  const completion = projectCompletion(project.tasks);
  const pace = useMemo(() => nudgesFor(meId, project, members, Date.now()).find((n) => n.kind === "pace"), [meId, project, members]);
  const next = project.tasks
    .filter((t) => t.assigneeId === meId && t.status !== "done")
    .sort((a, b) => statusOrder[a.status] - statusOrder[b.status] || a.due.localeCompare(b.due))[0];
  const myStats = stats.find((s) => s.memberId === meId);
  const deliverables = [...project.deliverables].sort((a, b) => a.due.localeCompare(b.due));

  const main = (
    <>
      <section aria-labelledby="greet">
        <h1 id="greet" className="text-3xl font-extrabold md:text-4xl">Hi {first(me.name)}{next ? "," : "!"}</h1>
        {next ? (
          <div className="card mt-4 p-5">
            <p className="text-muted">Your next task is</p>
            <p className="mt-1 font-display text-2xl font-bold text-green">{next.title}</p>
            <p className="mt-2 flex flex-wrap items-center gap-2 text-sm">
              <PointsChip points={next.points} />
              <DueChip iso={next.due} />
              {next.status === "doing" && <span className="chip bg-mint-pale text-green">In progress</span>}
            </p>
            {next.reason && <p className="mt-2 text-sm text-muted">Why you: {next.reason}</p>}
            <div className="mt-4 flex flex-wrap gap-2">
              {next.status === "todo"
                ? <button className="btn-primary" onClick={() => setStatus(next.id, "doing")}><Play size={18} aria-hidden /> Start this task</button>
                : <button className="btn-primary" onClick={() => setStatus(next.id, "done")}><Check size={18} aria-hidden /> Mark as done</button>}
              <Link to="/board" className="btn-ghost">See all my tasks</Link>
            </div>
          </div>
        ) : (
          <div className="mt-4"><Empty icon={<Check size={32} />} title="You're all done here">Nice work. Check the team list below to see if someone could use a hand.</Empty></div>
        )}
        {pace && (
          <p className="mt-3 flex flex-wrap items-center gap-2 rounded-[12px] bg-mint-pale px-4 py-3">
            <span className="flex-1">{pace.body}</span>
            <button className="btn-ghost min-h-9 underline" onClick={openPanic}>Get help</button>
          </p>
        )}
      </section>

      {/* On small screens the side panel sits below everything, so surface the vote here. */}
      <div className="lg:hidden"><RebalanceCard /></div>

      <section aria-labelledby="team-h" className="card p-5">
        <div className="mb-1 flex items-baseline justify-between gap-2">
          <h2 id="team-h" className="text-xl font-bold">Your team</h2>
          <Link to="/team" className="text-green underline underline-offset-4">Workload details</Link>
        </div>
        <ul className="divide-y divide-line">
          {members.map((m) => {
            const s = stats.find((x) => x.memberId === m.id)!;
            const doing = project.tasks.find((t) => t.assigneeId === m.id && t.status === "doing");
            return (
              <li key={m.id} className="flex items-center gap-3 py-3">
                <Avatar member={m} size={44} />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{m.name}{m.id === meId && <span className="font-normal text-muted"> (you)</span>}</p>
                  <p className="truncate text-sm text-muted">{doing ? `Working on ${doing.title}` : s.remaining === 0 ? "All tasks done" : "Nothing in progress"}</p>
                  <p className="mt-1 flex flex-wrap items-center gap-2 text-sm"><span>{s.completed} of {s.assigned} pts done</span><ShareChip share={s.workloadShare} /></p>
                </div>
                <Ring value={s.progress} label={`${m.name}: ${pct(s.progress)} of their tasks done`} />
              </li>
            );
          })}
        </ul>
        <div className="mt-4 border-t border-line pt-4">
          <div className="mb-2 flex justify-between gap-2"><span className="font-semibold text-green">Project completion</span><span className="font-semibold">{pct(completion)}</span></div>
          <Bar value={completion} label="Project completion" />
        </div>
      </section>
    </>
  );

  const side = (
    <>
      <span className="sm:hidden"><NotionBadge /></span>
      <div className="hidden lg:block"><RebalanceCard /></div>
      <HelpRequests />
      <section className="card p-4">
        <h2 className="mb-2 flex items-center gap-2 text-lg font-bold"><CalendarDays size={20} aria-hidden /> Coming up</h2>
        <ul className="flex flex-col gap-2">
          {deliverables.map((d) => {
            const ts = project.tasks.filter((t) => t.deliverableId === d.id);
            const done = ts.length > 0 && ts.every((t) => t.status === "done");
            return (
              <li key={d.id} className="flex items-center justify-between gap-2">
                <span className={done ? "text-muted line-through" : ""}>{d.title}</span>
                {done ? <span className="chip bg-mint-pale text-green"><Check size={14} aria-hidden /> Done</span> : <DueChip iso={d.due} />}
              </li>
            );
          })}
        </ul>
      </section>
      <section className="card flex flex-col gap-2 p-4">
        <p className="text-sm text-muted">{myStats ? `You're carrying ${myStats.remaining} pts right now.` : ""} Feeling stretched?</p>
        <button className="btn-secondary" onClick={openPanic}><LifeBuoy size={18} aria-hidden /> I'm overloaded</button>
        <Link to="/plan" className="btn-ghost"><Sparkles size={18} aria-hidden /> Plan a new project</Link>
      </section>
    </>
  );

  return <TwoCol main={main} side={side} />;
}

export function DueChip({ iso }: { iso: string }) {
  const d = dueLabel(iso);
  return d.overdue
    ? <span className="chip bg-coral text-ink"><CalendarDays size={14} aria-hidden /> {d.text}</span>
    : <span className="chip bg-bone text-green"><CalendarDays size={14} aria-hidden /> {d.text}</span>;
}
