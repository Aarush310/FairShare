# Fairshare

**Group projects, split fairly.** Fairshare is an AI group-project planner for students. It reads your assignment brief, turns it into tasks, splits the work evenly across the team, and keeps it fair as the weeks go by. When someone is struggling, they can ask for help before it piles up.

Built for the **Notion x Dublin AI Week Hackathon**.

---

## The challenge

> *How can we use AI and technology to improve student life?*
> Pick one real friction in student life and use AI or technology to make it better. Narrow beats vague.

We picked one friction that almost every student has hit: **the group project where the work isn't shared fairly.**

## The problem

Group work is meant to teach collaboration. More often it teaches resentment.

- **Splitting the work is awkward.** Nobody wants to be the one who hands out tasks, so the split happens by who speaks first, or not at all.
- **"Even" isn't even.** Four tasks for four people sounds fair until one of them is "write the literature review" and another is "book a room".
- **Imbalance shows up too late.** By the time someone notices one person is doing everything, it's the week before the deadline.
- **Asking for help feels like failing.** Students who are overloaded (exams, jobs, life) tend to go quiet rather than say so, and the whole team pays for it.
- **Marking contribution is guesswork.** Lecturers ask "who did what?" and the honest answer lives in a group chat.

## Our idea

Fairshare does three things, and keeps them small enough to actually work:

1. **Plan:** paste the brief (or import it from Notion) and AI drafts the deliverables and tasks, each sized at **1, 3 or 5 effort points**. The team reviews and edits the plan before anything is assigned. The AI only plans the work; it never writes the assignment.
2. **Split fairly:** tasks are assigned so everyone's points match their **fair share**, weighted by how many hours they actually have that week and matched to their skills. Every assignment comes with a one-line reason ("Good at writing and had room in their share"), so the split is transparent rather than arbitrary.
3. **Keep it fair:** as work moves, Fairshare watches the balance. When people drift apart it proposes a small rebalance for the team to vote on. And anyone can tap **"I'm overloaded"** or **"Need help with this?"** on a task to get a suggested hand-off to a teammate with spare time, privately and without having to make a fuss.

Everything lives where students already work: tasks sync to a **Notion database**, and the weekly digest and final contribution report are posted to Notion automatically.

### Which challenge areas it covers

| Area | How Fairshare helps |
|---|---|
| **Studying and productivity** | Turns a vague brief into a clear task list, a Kanban board and a "your next task is…" home screen. Deadlines and pace nudges keep things moving. |
| **Student wellbeing** | Makes asking for help a one-tap, private, supportive action. Wording is deliberately kind ("You're 10% behind pace, want help catching up?"), never shaming. |
| **Accessibility and inclusion** | Availability-weighted shares mean students with jobs, caring duties or disabilities aren't silently held to the same hours as everyone else. The UI meets WCAG AA contrast, uses 44px tap targets, and never relies on colour alone. |

## How fairness works

Fairshare uses a few simple, explainable numbers. The maths is deliberately boring: students need to trust it.

| Term | Definition |
|---|---|
| **Effort points** | Every task is 1, 3 or 5 points. |
| **Fair share** | Total project points split across members, weighted by their available hours. |
| **Workload share** | Points assigned ÷ fair share. 110% means overloaded, 90% means room for more. |
| **Progress** | Points completed ÷ points assigned, per member. |
| **Project completion** | Completed points ÷ total points. |

**Even distribution.** Tasks are taken biggest first. Each one goes to the member with the most room left against their fair share. A skills match wins when it doesn't push that member noticeably over.

**Rebalancer.** Compares each member's *remaining* points against their fair share of what's left. If someone is above 105% and someone else below 95%, it proposes moving **unstarted tasks only**, at most **3 per cycle**, choosing the moves that improve the balance most. The team accepts or declines; the team lead can opt into auto-apply.

**Help requests.** "I'm overloaded" proposes handing off a few of your unstarted tasks; "Need help with this?" on a board card proposes one specific task, even one already in progress. Each goes to the teammate with the most spare capacity, with a bonus for matching skills. Nothing moves until the teammate says yes, every request is logged, and the optional reason is visible only to the requester and the team lead.

All of this lives in [`src/lib/fairness.ts`](src/lib/fairness.ts) as **pure, deterministic functions** with unit tests, so the same input always gives the same result and the demo is repeatable.

## Features

- **Brief ingestion and AI planning:** paste text, upload a `.txt`/`.md` file, or pick a Notion page. The AI output is validated against a schema; if it's malformed you get a clear message and a retry button.
- **Review screen:** rename, re-point, add or remove tasks before confirming.
- **Kanban board:** To do / Doing / Review / Done, with drag and drop on desktop and a single column at a time on mobile. Each card shows points, due date, assignee and why they got it.
- **Home screen:** a greeting, your next task with one clear action, then the team with a small progress ring and workload share beside each person, plus one project completion bar.
- **Team page:** availability and skills per member, and the one workload chart in the app (share against the 100% fair-share line).
- **Rebalance proposals:** accept or decline, with undo.
- **Panic button and per-task help:** private reason, AI-drafted split, teammates accept or decline.
- **Notifications and PWA:** installable app, browser notifications for pace nudges, deadlines, stalled tasks and rebalance votes.
- **Notion integration:** connect, import a brief, mirror tasks to a database (Title, Assignee, Status, Points, Due date), two-way status sync where the latest edit wins, and a "Synced with Notion" badge.
- **Weekly digest and report:** completion, deliverables done, each member's balance in supportive language, risks, and one suggested team action. Export as PDF or CSV, or send to Notion.
- **Responsive:** floating pill navigation on desktop, a bottom tab bar on mobile.

## Try the demo

```bash
npm install
npm run dev        # http://localhost:5173
```

The app opens as **Aoife**, the team lead of a four-person geography project (*Urban Heat Islands*, 18 tasks, 40 points). The data is seeded so the interesting moments are visible straight away.

**Demo script (about 3 minutes)**

1. **Home:** "Hi, Aoife". Her next task is front and centre. Aoife is at **110% · Overloaded** and Ben at **90% · Has room**, and a rebalance proposal is already waiting.
2. **Accept** the rebalance. Everyone is now on track. Try **Undo** in the toast.
3. **Team → Simulate progress:** complete Dana's next task twice. She finishes early, so a new rebalance proposal appears.
4. **Board → Need help with this?** on Aoife's literature review. Fairshare suggests Ben (writing and research). Send it, then accept it as Ben from Home.
5. **I'm overloaded** (header): add a private reason, get a suggested split, ask the team.
6. **New plan:** pick a sample Notion page or paste a brief, **Draft the plan**, edit it, **Confirm**. The work is split evenly with a reason on every card.
7. **Settings → Connect Notion:** change a status in the mirrored Notion table, then **Sync now**. The board updates.
8. **Report:** weekly digest, contribution report, export to PDF or CSV.
9. **Settings → Reset demo** restores the starting state. **Viewing as** lets you switch between team members.

## What's real and what's simulated

This is a hackathon build: a working front end with seeded data, no accounts and no server. We were deliberate about what to fake and labelled it in the UI with a "Demo" tag.

| Feature | Status |
|---|---|
| Fair share, workload share, progress, completion | **Real.** Unit-tested and deterministic. |
| Even distribution with reasons | **Real.** |
| Rebalancer (unstarted only, max 3 moves, vote or auto-apply) | **Real logic.** Teammates' votes are simulated. |
| Panic button and per-task help | **Real logic.** Teammates' responses are clicked on their behalf. |
| AI planner | **Simulated** locally from keywords in the brief. Its output still goes through the real schema validation, error and retry path. |
| Weekly digest | **Templated** from the real numbers. Generated each Monday on open, or on demand. |
| Notion OAuth, database and two-way sync | **Simulated.** Polls every 20 seconds; the latest edit wins. |
| PWA install and notifications | **Real.** Installable from a production build. Notifications are local (no push server). |
| Data storage | Browser `localStorage`. No accounts. |

## Where it goes next

The production design swaps the simulated parts for real services:

- **Supabase** for auth, Postgres (with row-level security on every table so users only see their own workspace) and storage.
- **Supabase Edge Functions** for every AI and Notion call, so API keys never reach the browser.
- **An LLM** (Claude) to extract deliverables, tasks, points, dependencies and deadlines as structured JSON, and to write the weekly digest.
- **Notion OAuth** with tokens stored server-side, a scheduled sync job, and digests and contribution reports written to a Notion page.
- **Web Push** with VAPID keys for real background notifications.
- **Lecturer view:** an exportable, honest record of who did what, built from the activity log rather than self-reporting.

## Tech stack

- React 19, TypeScript, Vite
- Tailwind CSS v4 with theme tokens
- Zustand (state, persisted to `localStorage`)
- React Router (hash routing)
- Vitest for unit tests
- lucide-react icons, Inter and JetBrains Mono fonts
- A minimal service worker and web manifest for the PWA

## Project structure

```
src/
  lib/
    fairness.ts      Fair share, distribution, rebalancer, help hand-offs (pure, tested)
    planner.ts       Simulated AI planner + schema validation (tested)
    insights.ts      Pace nudges and weekly digest
    store.ts         Demo "back end": state, actions, undo, Notion mirror
    seed.ts          Demo team, project and sample briefs
    types.ts
  components/        Layout, dialogs, proposal cards, UI primitives
  pages/             Home, Board, Team, Plan, Report, Settings
  theme/tokens.ts    Colour tokens (mirrored as CSS variables in index.css)
public/              Manifest, service worker, app icon
```

## Scripts

```bash
npm run dev        # start the dev server
npm test           # unit tests for the fairness maths and planner
npm run typecheck  # TypeScript check
npm run build      # type check + production build (enables the PWA service worker)
npm run preview    # serve the production build
```

## Design

A calm, friendly shared workspace rather than an analytics dashboard: tasks and people first, numbers as supporting detail, at most one chart per screen, and one obvious action on every screen. The "Fresh air" palette (paper white, ink and greens) is defined in [`src/theme/tokens.ts`](src/theme/tokens.ts). Help actions use a warm red that's noticeable without being alarming. The visual style was inspired by the HomesAbove project.

## Team

Built at the Notion x Dublin AI Week Hackathon by:

- _Add team members here_
