import { CalendarDays, Check, LifeBuoy, Play, Sparkles } from "lucide-react";
import { useMemo } from "react";
import { Link, useOutletContext } from "react-router";
import { NotionBadge, TwoCol, type LayoutContext } from "../components/Layout";
import { HelpRequests, RebalanceCard } from "../components/Proposals";
import { Avatar, Bar, Empty, Eyebrow, Ring, ShareChip, dueLabel, pct } from "../components/ui";
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
        <Eyebrow>{project.course} · {project.name}</Eyebrow>
        <h1 id="greet" className="mt-1 text-[34px] font-bold leading-10 md:text-[40px] md:leading-[48px]">Hi, {first(me.name)}</h1>
        {next ? (
          <div className="mt-4 rounded-[22px] bg-mint-deep p-5 text-white shadow-[0_18px_40px_-14px_rgb(43_127_96/0.6)] md:p-6">
            <Eyebrow className="text-[#D7F5E6]">Your next task</Eyebrow>
            <p className="mt-1.5 text-[26px] font-bold leading-8 tracking-[-0.03em] text-white">{next.title}</p>
            <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] text-white/80">
              <span><span className="numeral text-[20px] font-bold text-white">{next.points}</span> pts</span>
              <span className={dueLabel(next.due).overdue ? "font-semibold text-[#FFD9D1]" : ""}><CalendarDays size={14} className="mr-1 inline" aria-hidden />{dueLabel(next.due).text}</span>
              {next.status === "doing" && <span className="inline-flex items-center gap-1.5"><span className="size-1.5 rounded-full bg-volt" aria-hidden /> In progress</span>}
            </div>
            {next.reason && <p className="mt-3 rounded-2xl bg-white/[0.12] px-3.5 py-2.5 text-[13px] text-white/90">Why you: {next.reason}</p>}
            <div className="mt-5 flex flex-wrap gap-2">
              {next.status === "todo"
                ? <button className="btn bg-white text-ink hover:bg-mint" onClick={() => setStatus(next.id, "doing")}><Play size={17} aria-hidden /> Start this task</button>
                : <button className="btn bg-white text-ink hover:bg-mint" onClick={() => setStatus(next.id, "done")}><Check size={17} strokeWidth={2.6} aria-hidden /> Mark as done</button>}
              <Link to="/board" className="btn text-white hover:bg-white/10">See all my tasks</Link>
              <button className="btn ml-auto bg-white/10 text-white hover:bg-alert-pastel hover:text-danger-ink" onClick={() => openPanic(next.id)}><LifeBuoy size={17} aria-hidden /> Stuck on this?</button>
            </div>
          </div>
        ) : (
          <div className="mt-4"><Empty icon={<Check size={24} />} title="You're all done here">Nice work. Check the team list below to see if someone could use a hand.</Empty></div>
        )}
        {pace && (
          <p className="mt-3 flex flex-wrap items-center gap-2 rounded-2xl bg-mint py-2 pl-4 pr-2 text-[15px] text-forest">
            <span className="flex-1">{pace.body}</span>
            <button className="btn min-h-9 bg-surface px-4 text-ink shadow-float" onClick={() => openPanic()}>Get help</button>
          </p>
        )}
      </section>

      {/* On small screens the side panel sits below everything, so surface the vote here. */}
      <div className="lg:hidden"><RebalanceCard /></div>

      <section aria-labelledby="team-h" className="card p-5">
        <div className="mb-1 flex items-end justify-between gap-2">
          <div><Eyebrow>Team</Eyebrow><h2 id="team-h" className="text-[22px] font-bold leading-7">Your team</h2></div>
          <Link to="/team" className="text-[13px] font-semibold text-green-700 hover:underline">Workload details →</Link>
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
          <div className="mb-2.5 flex items-end justify-between gap-2"><span className="text-[13px] font-semibold text-muted">Project completion</span><span className="numeral text-[22px] font-bold leading-none">{pct(completion)}</span></div>
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
      <section className="card p-5">
        <Eyebrow className="mb-3 text-muted">Coming up</Eyebrow>
        <ul className="flex flex-col gap-2.5 text-[15px]">
          {deliverables.map((d) => {
            const ts = project.tasks.filter((t) => t.deliverableId === d.id);
            const done = ts.length > 0 && ts.every((t) => t.status === "done");
            return (
              <li key={d.id} className="flex items-center justify-between gap-2">
                <span className={done ? "text-muted line-through" : ""}>{d.title}</span>
                {done ? <span className="chip bg-mint text-green-700"><Check size={14} aria-hidden /> Done</span> : <DueChip iso={d.due} />}
              </li>
            );
          })}
        </ul>
      </section>
      <section className="card flex flex-col gap-2 p-5">
        <p className="text-sm text-muted">{myStats ? `You're carrying ${myStats.remaining} pts right now.` : ""} Feeling stretched?</p>
        <button className="btn-alert" onClick={() => openPanic()}><LifeBuoy size={18} strokeWidth={2.4} aria-hidden /> I'm overloaded</button>
        <Link to="/plan" className="btn-ghost"><Sparkles size={18} aria-hidden /> Plan a new project</Link>
      </section>
    </>
  );

  return <TwoCol main={main} side={side} />;
}

export function DueChip({ iso }: { iso: string }) {
  const d = dueLabel(iso);
  return d.overdue
    ? <span className="chip bg-danger-soft text-danger-ink"><CalendarDays size={13} strokeWidth={2.4} aria-hidden /> {d.text}</span>
    : <span className="chip bg-surface-alt text-ink-3 ring-1 ring-black/[0.06]"><CalendarDays size={13} strokeWidth={2.4} aria-hidden /> {d.text}</span>;
}
