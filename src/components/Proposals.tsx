import { ArrowRight, Check, HandHeart, Scale, X } from "lucide-react";
import { first } from "../lib/fairness";
import { currentProject, useStore } from "../lib/store";
import type { Move } from "../lib/types";
import { Avatar, DemoTag, PointsChip, ago } from "./ui";

function MoveRow({ move }: { move: Move }) {
  const members = useStore((s) => s.members);
  const project = useStore(currentProject);
  const t = project.tasks.find((x) => x.id === move.taskId);
  const from = members.find((m) => m.id === move.fromId);
  const to = members.find((m) => m.id === move.toId);
  return (
    <li className="rounded-2xl bg-surface-alt p-3">
      <p className="font-semibold">{t?.title}</p>
      <p className="mt-1 flex flex-wrap items-center gap-1.5 text-sm">
        <PointsChip points={t?.points ?? 0} />
        <Avatar member={from} size={22} /> {first(from?.name ?? "")}
        <ArrowRight size={14} aria-label="to" />
        <Avatar member={to} size={22} /> {first(to?.name ?? "")}
      </p>
      <p className="mt-1 text-sm text-muted">{move.reason}</p>
    </li>
  );
}

export function RebalanceCard() {
  const proposal = useStore((s) => s.proposals.find((p) => p.status === "pending" && p.projectId === s.currentProjectId));
  const vote = useStore((s) => s.vote);
  const members = useStore((s) => s.members);
  if (!proposal) return null;
  return (
    <section className="card p-5 ring-2 ring-green/70" aria-labelledby="rb-title">
      <div className="mb-2 flex items-center gap-2">
        <Scale size={20} className="text-ink" aria-hidden />
        <h2 id="rb-title" className="flex-1 text-lg font-bold">A small rebalance</h2>
        <span className="text-sm text-muted">{ago(proposal.createdAt)}</span>
      </div>
      <p className="mb-3">Moving {proposal.moves.length === 1 ? "this unstarted task" : `these ${proposal.moves.length} unstarted tasks`} would even out the load.</p>
      <ul className="mb-3 flex flex-col gap-2">{proposal.moves.map((m) => <MoveRow key={m.taskId} move={m} />)}</ul>
      <p className="mb-3 flex items-center gap-1 text-sm text-muted">
        Team vote: {members.map((m) => <Avatar key={m.id} member={m} size={22} />)} <DemoTag>votes simulated</DemoTag>
      </p>
      <div className="flex gap-2">
        <button className="btn-primary flex-1" onClick={() => vote(proposal.id, "yes")}><Check size={18} aria-hidden /> Accept</button>
        <button className="btn-secondary" onClick={() => vote(proposal.id, "no")}><X size={18} aria-hidden /> Decline</button>
      </div>
    </section>
  );
}

export function HelpRequests({ showResolved = false }: { showResolved?: boolean }) {
  const all = useStore((s) => s.panics);
  const projectId = useStore((s) => s.currentProjectId);
  const me = useStore((s) => s.currentUserId);
  const meIsLead = useStore((s) => s.members.find((m) => m.id === s.currentUserId)?.role === "lead");
  const members = useStore((s) => s.members);
  const project = useStore(currentProject);
  const respond = useStore((s) => s.respondPanic);
  const list = all.filter((r) => r.projectId === projectId && (showResolved || r.status === "open"));
  if (list.length === 0) return null;
  const name = (id: string) => first(members.find((m) => m.id === id)?.name ?? "");

  return (
    <section className="flex flex-col gap-3" aria-label="Help requests">
      {list.map((r) => (
        <div key={r.id} className="card p-4">
          <div className="mb-2 flex items-center gap-2">
            <HandHeart size={20} className="text-ink" aria-hidden />
            <h3 className="flex-1 font-bold">{r.memberId === me ? "Your help request" : `${name(r.memberId)} could use a hand`}</h3>
            <span className="text-sm text-muted">{ago(r.createdAt)}</span>
          </div>
          {r.reason && (r.memberId === me || meIsLead) && <p className="mb-2 rounded-2xl bg-mint px-3 py-2 text-sm"><span className="font-semibold">Private note:</span> {r.reason}</p>}
          <ul className="flex flex-col gap-2">
            {r.moves.map((m) => {
              const t = project.tasks.find((x) => x.id === m.taskId);
              const res = r.responses[m.taskId];
              const asOther = m.toId !== me;
              return (
                <li key={m.taskId} className="flex flex-wrap items-center gap-2 rounded-2xl bg-surface-alt p-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{t?.title} <PointsChip points={t?.points ?? 0} /></p>
                    <p className="text-sm text-muted">Suggested for {name(m.toId)} · {m.reason}</p>
                  </div>
                  {res === "pending" ? (
                    <div className="flex gap-2">
                      <button className="btn-primary min-h-11" onClick={() => respond(r.id, m.taskId, "accepted")}><Check size={16} aria-hidden /> Take it{asOther ? ` (as ${name(m.toId)})` : ""}</button>
                      <button className="btn-secondary min-h-11" onClick={() => respond(r.id, m.taskId, "declined")} aria-label={`Decline${asOther ? ` as ${name(m.toId)}` : ""}`}><X size={16} aria-hidden /> Can't</button>
                    </div>
                  ) : (
                    <span className={`chip ${res === "accepted" ? "bg-mint text-green-700" : "bg-surface text-muted"}`}>
                      {res === "accepted" ? <><Check size={14} aria-hidden /> {name(m.toId)} took it</> : `${name(m.toId)} couldn't`}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </section>
  );
}
