import { Check, Download, FileText, Heart, Lightbulb, RefreshCw, Send, TriangleAlert } from "lucide-react";
import { useMemo } from "react";
import { TwoCol } from "../components/Layout";
import { Avatar, Bar, Empty, ShareChip, ago, pct } from "../components/ui";
import { memberStats } from "../lib/fairness";
import { currentProject, memberName, useStore } from "../lib/store";

function download(name: string, text: string, type = "text/csv") {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = Object.assign(document.createElement("a"), { href: url, download: name });
  a.click();
  URL.revokeObjectURL(url);
}
const csvCell = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;

export function Report() {
  const project = useStore(currentProject);
  const members = useStore((s) => s.members);
  const all = useStore((s) => s.digests);
  const notionConnected = useStore((s) => s.notion.connected);
  const generate = useStore((s) => s.generateDigest);
  const sendToNotion = useStore((s) => s.sendDigestToNotion);
  const toast = useStore((s) => s.toast);
  const digests = all.filter((d) => d.projectId === project.id);
  const latest = digests[0];
  const stats = useMemo(() => memberStats(members, project.tasks), [members, project.tasks]);

  const exportCsv = () => {
    const rows = [["Member", "Fair share (pts)", "Assigned (pts)", "Completed (pts)", "Workload share", "Progress"].map(csvCell).join(",")];
    for (const s of stats) rows.push([memberName({ members }, s.memberId), s.fairShare.toFixed(1), s.assigned, s.completed, pct(s.workloadShare), pct(s.progress)].map(csvCell).join(","));
    rows.push("", ["Task", "Assignee", "Status", "Points", "Due"].map(csvCell).join(","));
    for (const t of project.tasks) rows.push([t.title, memberName({ members }, t.assigneeId), t.status, t.points, t.due].map(csvCell).join(","));
    download(`${project.name.replace(/\W+/g, "-")}-contributions.csv`, rows.join("\n"));
    toast("CSV downloaded");
  };

  const main = (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="flex-1 text-3xl font-extrabold">Weekly digest</h1>
        <button className="btn-primary no-print" onClick={generate}><RefreshCw size={18} aria-hidden /> Generate now</button>
      </div>
      {!latest ? (
        <Empty icon={<FileText size={32} />} title="No digest yet">Digests arrive every Monday morning. Tap "Generate now" to get one today.</Empty>
      ) : (
        <article className="card flex flex-col gap-5 p-5">
          <p className="text-sm text-muted">Written {ago(latest.at)} · {new Date(latest.at).toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}</p>
          <div>
            <div className="mb-2 flex justify-between"><span className="font-semibold text-green">{project.name} is {pct(latest.completion)} complete</span></div>
            <Bar value={latest.completion} label="Project completion at time of digest" />
            <p className="mt-2 text-sm">{latest.deliverablesDone.length ? <>Finished: {latest.deliverablesDone.join(", ")}.</> : "No deliverables fully finished yet. That's normal this early."}</p>
          </div>
          <section>
            <h2 className="mb-2 flex items-center gap-2 text-lg font-bold"><Heart size={18} aria-hidden /> How everyone's doing</h2>
            <ul className="flex flex-col gap-2">
              {latest.balance.map((b) => (
                <li key={b.memberId} className="flex items-start gap-3"><Avatar member={members.find((m) => m.id === b.memberId)} size={32} /><span>{b.line}</span></li>
              ))}
            </ul>
          </section>
          {latest.risks.length > 0 && (
            <section>
              <h2 className="mb-2 flex items-center gap-2 text-lg font-bold"><TriangleAlert size={18} aria-hidden /> Worth watching</h2>
              <ul className="ml-5 list-disc">{latest.risks.map((r) => <li key={r}>{r}</li>)}</ul>
            </section>
          )}
          <section className="rounded-[12px] bg-mint-pale p-4">
            <h2 className="mb-1 flex items-center gap-2 text-lg font-bold"><Lightbulb size={18} aria-hidden /> One thing to try this week</h2>
            <p>{latest.action}</p>
          </section>
          <div className="no-print flex flex-wrap gap-2">
            {latest.sentToNotion
              ? <span className="chip bg-mint-pale text-green"><Check size={14} aria-hidden /> Posted to Notion</span>
              : <button className="btn-secondary" disabled={!notionConnected} title={notionConnected ? "" : "Connect Notion in Settings first"} onClick={() => sendToNotion(latest.id)}><Send size={18} aria-hidden /> Send to Notion</button>}
            {!latest.sentToNotion && !notionConnected && <p className="self-center text-sm text-muted">Connect Notion in Settings to post digests there.</p>}
          </div>
        </article>
      )}

      <section className="card p-5">
        <h2 className="mb-1 text-xl font-bold">Contribution report</h2>
        <p className="mb-3 text-sm text-muted">Who did what, for the final hand-in.</p>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="text-sm text-muted"><tr><th className="py-2 pr-3 font-semibold">Member</th><th className="py-2 pr-3 font-semibold">Done</th><th className="py-2 pr-3 font-semibold">Assigned</th><th className="py-2 font-semibold">Share</th></tr></thead>
            <tbody className="divide-y divide-line">
              {stats.map((s) => {
                const m = members.find((x) => x.id === s.memberId)!;
                return (
                  <tr key={s.memberId}>
                    <td className="py-2 pr-3"><span className="flex items-center gap-2"><Avatar member={m} size={28} />{m.name}</span></td>
                    <td className="py-2 pr-3">{s.completed} pts</td>
                    <td className="py-2 pr-3">{s.assigned} pts</td>
                    <td className="py-2"><ShareChip share={s.workloadShare} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );

  const side = (
    <>
      <section className="card no-print flex flex-col gap-2 p-4">
        <h2 className="text-lg font-bold">Export report</h2>
        <button className="btn-secondary" onClick={() => window.print()}><Download size={18} aria-hidden /> PDF</button>
        <button className="btn-secondary" onClick={exportCsv}><Download size={18} aria-hidden /> CSV</button>
        <p className="text-sm text-muted">PDF uses your browser's print dialog: choose "Save as PDF".</p>
      </section>
      <section className="card no-print p-4">
        <h2 className="mb-2 text-lg font-bold">Past digests</h2>
        {digests.length <= 1 ? <p className="text-sm text-muted">Older digests will collect here each Monday.</p> : (
          <ul className="flex flex-col gap-1 text-sm">
            {digests.slice(1).map((g) => <li key={g.id} className="flex justify-between"><span>{new Date(g.at).toLocaleDateString()}</span><span>{pct(g.completion)} complete</span></li>)}
          </ul>
        )}
      </section>
    </>
  );

  return <TwoCol main={main} side={side} />;
}
