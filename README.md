# Fairshare

An AI group-project planner for college students. It turns an assignment brief into tasks, splits the work fairly, and keeps it fair as work progresses. **This is the hackathon demo build**: front end only, no login, with seeded demo data saved in your browser.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # fairness + planner unit tests
npm run build      # type check + production build (also enables the PWA service worker)
```

## Demo script (about 3 minutes)

1. **Home**: "Hi Aoife, your next task is…". Aoife shows as **110% · Overloaded** and Ben as **90% · Has room**. A rebalance proposal is already waiting.
2. **Accept** the rebalance. Everyone is now on track. Try **Undo** in the toast.
3. **Team → Simulate progress**: complete Dana's next task twice. She finishes early, so a new rebalance proposal appears.
4. **I'm overloaded**: add a private reason, then **Suggest a split** and **Ask my team**. Accept a task on the teammate's behalf.
5. **New plan**: pick a sample Notion page (or paste a brief), then **Draft the plan**, edit the review screen, and **Confirm**. The work is split evenly, with a reason on every card.
6. **Settings → Connect Notion**: change a status in the mirrored Notion table, then **Sync now**. The board updates.
7. **Report**: weekly digest, contribution report, export to PDF/CSV.
8. **Settings → Reset demo** restores the starting state.

## What's real vs simulated

| Feature | Status |
|---|---|
| Fair share, workload share, progress, completion | Real (`src/lib/fairness.ts`, unit-tested, deterministic) |
| Even distribution + one-line reasons | Real |
| Rebalancer (unstarted tasks only, max 3 moves, vote / auto-apply) | Real logic; teammates' votes are simulated |
| Panic button split | Real logic; teammates' responses are clicked on their behalf |
| AI planner | Simulated locally from keywords, but output is still validated against a schema with error + retry |
| Weekly digest | Templated from real numbers (auto-generated each Monday on open, or on demand) |
| Notion OAuth, database, two-way sync | Simulated (polls every 20s; latest edit wins) |
| PWA install + notifications | Real (installable from a production build; local notifications, no push server) |
| Data storage | Browser `localStorage` (no server, no accounts) |

The production design (Supabase auth/Postgres/RLS, Edge Functions for AI and Notion, Web Push) is described in the original spec. No secrets are needed for this build.

Colours live in `src/theme/tokens.ts` and as CSS variables in `src/index.css`.
