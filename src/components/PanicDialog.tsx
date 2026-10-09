import { ArrowRight, LifeBuoy, Sparkles, Trash2 } from "lucide-react";
import { useState } from "react";
import { first } from "../lib/fairness";
import { currentProject, useStore } from "../lib/store";
import type { Move } from "../lib/types";
import { Avatar, DemoTag, Modal, PointsChip } from "./ui";

export function PanicDialog({ onClose, taskId }: { onClose: () => void; taskId?: string }) {
  const me = useStore((s) => s.currentUserId);
  const members = useStore((s) => s.members);
  const project = useStore(currentProject);
  const draftPanic = useStore((s) => s.draftPanic);
  const sendPanic = useStore((s) => s.sendPanic);
  const [reason, setReason] = useState("");
  const [step, setStep] = useState<"ask" | "drafting" | "review">("ask");
  const [moves, setMoves] = useState<Move[]>([]);
  const member = (id: string) => members.find((m) => m.id === id);
  const task = (id: string) => project.tasks.find((t) => t.id === id);

  const draft = () => {
    setStep("drafting");
    setTimeout(() => { setMoves(draftPanic(me, taskId)); setStep("review"); }, 900);
  };

  return (
    <Modal title={taskId ? "Need a hand with this?" : "Feeling overloaded?"} onClose={onClose}>
      {step === "ask" && (
        <div className="flex flex-col gap-4">
          {taskId ? (
            <>
              <div className="rounded-2xl bg-alert-soft px-4 py-3">
                <p className="eyebrow text-danger-ink">Asking for help with</p>
                <p className="mt-0.5 font-semibold">{task(taskId)?.title}</p>
              </div>
              <p>Fairshare will suggest the teammate with the most spare time and the right skills. Nothing moves until they say yes.</p>
            </>
          ) : (
            <p>That's okay, it happens. Fairshare will suggest which of your unstarted tasks teammates with spare time could take. Nothing moves until they say yes.</p>
          )}
          <div>
            <label htmlFor="reason" className="label">What's going on? (optional, private)</label>
            <textarea id="reason" className="input min-h-24 py-2" value={reason} onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Two exams this week" />
            <p className="mt-1 text-sm text-muted">Only you and your team lead can see this.</p>
          </div>
          <button className="btn-alert" onClick={draft}><Sparkles size={18} aria-hidden /> {taskId ? "Find someone to help" : "Suggest a split"}</button>
        </div>
      )}
      {step === "drafting" && <p className="py-6 text-center text-muted" role="status">Looking at skills and spare time…</p>}
      {step === "review" && (
        <div className="flex flex-col gap-4">
          {moves.length === 0 ? (
            <p>There's nothing to hand off right now. Try messaging your team, or split a big task into smaller ones on the board.</p>
          ) : (
            <>
              <div className="flex items-center gap-2"><p className="flex-1">Here's a suggested split. Remove anything you'd rather keep.</p><DemoTag>AI draft</DemoTag></div>
              <ul className="flex flex-col gap-2">
                {moves.map((m) => (
                  <li key={m.taskId} className="flex items-center gap-3 rounded-2xl bg-surface-alt p-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">{task(m.taskId)?.title}</p>
                      <p className="flex items-center gap-1 text-sm text-muted">
                        <PointsChip points={task(m.taskId)?.points ?? 0} /> <ArrowRight size={14} aria-hidden /> <Avatar member={member(m.toId)} size={22} /> {first(member(m.toId)?.name ?? "")}
                      </p>
                      <p className="text-sm text-muted">{m.reason}</p>
                    </div>
                    <button className="btn-ghost px-2" aria-label={`Keep ${task(m.taskId)?.title}`} onClick={() => setMoves(moves.filter((x) => x !== m))}><Trash2 size={18} /></button>
                  </li>
                ))}
              </ul>
            </>
          )}
          <div className="flex flex-wrap gap-2">
            {moves.length > 0 && (
              <button className="btn-alert flex-1" onClick={() => { sendPanic(me, reason, moves); onClose(); }}>
                <LifeBuoy size={18} aria-hidden /> Ask my team
              </button>
            )}
            <button className="btn-secondary" onClick={onClose}>Not now</button>
          </div>
        </div>
      )}
    </Modal>
  );
}
