import { Clock, Pencil, Play, TriangleAlert } from "lucide-react";
import { useMemo, useState } from "react";
import { TwoCol } from "../components/Layout";
import { HelpRequests, RebalanceCard } from "../components/Proposals";
import { Avatar, DemoTag, Modal, Ring, ShareChip, ago, pct } from "../components/ui";
import { balanceOf, first, memberStats, type MemberStats } from "../lib/fairness";
import { currentProject, useStore } from "../lib/store";
import type { Member } from "../lib/types";

/** The one chart on this page: workload share per member against the 100% fair-share line. */
function WorkloadChart({ members, stats }: { members: Member[]; stats: MemberStats[] }) {
  const max = Math.max(1.3, ...stats.map((s) => s.workloadShare + 0.05));
  const x = (v: number) => `${(v / max) * 100}%`;
  return (
    <figure className="card p-5">
      <figcaption className="mb-1">
        <h2 className="text-xl font-bold">Workload share</h2>
        <p className="text-sm text-muted">Points assigned compared to each person's fair share. 100% is spot on.</p>
      </figcaption>
      <div className="relative mt-4 flex flex-col gap-3">
        <div className="pointer-events-none absolute inset-y-0 left-[96px] right-14" aria-hidden>
          <div className="absolute inset-y-[-6px] border-l-2 border-dashed border-green/50" style={{ left: x(1) }} />
          <span className="absolute -top-6 -translate-x-1/2 text-xs text-muted" style={{ left: x(1) }}>Fair share</span>
        </div>
        {stats.map((s) => {
          const m = members.find((mm) => mm.id === s.memberId)!;
          const heavy = balanceOf(s.workloadShare) === "heavy";
          return (
            <div key={s.memberId} className="group flex items-center gap-2" title={`${m.name}: ${s.assigned} of a fair ${Math.round(s.fairShare * 10) / 10} pts (${pct(s.workloadShare)})`}>
              <span className="flex w-[88px] shrink-0 items-center gap-2 truncate text-sm font-medium"><Avatar member={m} size={24} />{first(m.name)}</span>
              <div className="relative h-7 flex-1">
                <div className={`h-full rounded-r-[4px] transition-[width] duration-500 group-hover:opacity-85 ${heavy ? "bg-coral" : "bg-mint"}`} style={{ width: x(s.workloadShare) }} />
              </div>
              <span className="flex w-12 shrink-0 items-center justify-end gap-0.5 text-sm font-semibold">
                {heavy && <TriangleAlert size={14} aria-label="Overloaded" />}{pct(s.workloadShare)}
              </span>
            </div>
          );
        })}
      </div>
    </figure>
  );
}

function EditMember({ member, onClose }: { member: Member; onClose: () => void }) {
  const update = useStore((s) => s.updateMember);
  const [hours, setHours] = useState(member.hoursPerWeek);
  const [skills, setSkills] = useState(member.skills.join(", "));
  return (
    <Modal title={`${first(member.name)}'s availability`} onClose={onClose}>
      <form className="flex flex-col gap-4" onSubmit={(e) => {
        e.preventDefault();
        update(member.id, { hoursPerWeek: hours, skills: skills.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean) });
        onClose();
      }}>
        <div>
          <label htmlFor="hours" className="label">Hours per week for this project: {hours}</label>
          <input id="hours" type="range" min={0} max={20} value={hours} onChange={(e) => setHours(Number(e.target.value))} className="h-11 w-full accent-[var(--color-mint)]" />
          <p className="text-sm text-muted">Fair shares are weighted by these hours.</p>
        </div>
        <div>
          <label htmlFor="skills" className="label">Skills (comma separated)</label>
          <input id="skills" className="input" value={skills} onChange={(e) => setSkills(e.target.value)} placeholder="writing, data, design" />
        </div>
        <button className="btn-primary">Save</button>
      </form>
    </Modal>
  );
}

export function Team() {
  const members = useStore((s) => s.members);
  const project = useStore(currentProject);
  const meIsLead = useStore((s) => s.members.find((m) => m.id === s.currentUserId)?.role === "lead");
  const activity = useStore((s) => s.activity);
  const simulate = useStore((s) => s.simulateProgress);
  const stats = useMemo(() => memberStats(members, project.tasks), [members, project.tasks]);
  const hasPanics = useStore((s) => s.panics.some((p) => p.projectId === s.currentProjectId));
  const [editing, setEditing] = useState<Member | null>(null);
  const [simFor, setSimFor] = useState("m4");

  const main = (
    <>
      <h1 className="text-3xl font-extrabold">Team</h1>
      <ul className="grid gap-4 sm:grid-cols-2">
        {members.map((m) => {
          const s = stats.find((x) => x.memberId === m.id)!;
          return (
            <li key={m.id} className="card flex flex-col gap-3 p-4">
              <div className="flex items-center gap-3">
                <Avatar member={m} size={48} />
                <div className="min-w-0 flex-1">
                  <p className="font-display text-lg font-bold text-green">{m.name}</p>
                  <p className="text-sm text-muted">{m.role === "lead" ? "Team lead" : "Member"} · <Clock size={13} className="inline" aria-hidden /> {m.hoursPerWeek} h/week</p>
                </div>
                <Ring value={s.progress} label={`${pct(s.progress)} of tasks done`} />
              </div>
              <div className="flex flex-wrap gap-1.5">{m.skills.map((k) => <span key={k} className="chip bg-mint-pale text-green">{k}</span>)}</div>
              <p className="text-sm">{s.completed} of {s.assigned} pts done · fair share {Math.round(s.fairShare * 10) / 10} pts</p>
              <div className="flex items-center justify-between gap-2">
                <ShareChip share={s.workloadShare} />
                <button className="btn-ghost min-h-11 px-3 text-sm" onClick={() => setEditing(m)}><Pencil size={16} aria-hidden /> Edit</button>
              </div>
            </li>
          );
        })}
      </ul>
      <WorkloadChart members={members} stats={stats} />
      <section className="card p-5">
        <h2 className="mb-2 text-xl font-bold">Help requests</h2>
        <HelpRequests showResolved />
        {!hasPanics && <p className="text-muted">No one has asked for help yet. When someone taps "I'm overloaded", it's logged here.</p>}
      </section>
    </>
  );

  const side = (
    <>
      <RebalanceCard />
      {meIsLead && (
        <section className="card flex flex-col gap-3 p-4">
          <div className="flex items-center gap-2"><h2 className="flex-1 text-lg font-bold">Simulate progress</h2><DemoTag>Admin</DemoTag></div>
          <p className="text-sm text-muted">Completes the chosen member's next task. Finish a few for Dana and a rebalance proposal appears.</p>
          <label htmlFor="sim" className="label">Member</label>
          <select id="sim" className="input" value={simFor} onChange={(e) => setSimFor(e.target.value)}>
            {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
          <button className="btn-primary" onClick={() => simulate(simFor)}><Play size={18} aria-hidden /> Complete next task</button>
        </section>
      )}
      <section className="card p-4">
        <h2 className="mb-2 text-lg font-bold">Activity</h2>
        <ul className="flex max-h-96 flex-col gap-2 overflow-y-auto text-sm">
          {activity.slice(0, 30).map((a) => <li key={a.id}><p>{a.text}</p><p className="text-muted">{ago(a.at)}</p></li>)}
        </ul>
      </section>
    </>
  );

  return (
    <>
      <TwoCol main={main} side={side} />
      {editing && <EditMember member={editing} onClose={() => setEditing(null)} />}
    </>
  );
}
