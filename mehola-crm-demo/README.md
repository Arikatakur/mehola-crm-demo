# Mehola CRM — demo

A working demo of the management dashboard for **Mehola Group**, built on the real
attendance sheet of the **רוסמן (Rosman)** site: 34 work days, 410 attendance rows,
32 workers, 21/06/26 – 09/08/26.

It answers, end to end, what the client asked for in writing:

| Client's requirement (`what-the-company-wants.txt`) | Where it is in the demo |
| --- | --- |
| Working day 07:00–18:00 so overtime exists | Scenario switch in the header; hours split 100% / 125% / 150% |
| Detailed worker cost | `רווח והפסד יומי` → click a day → `עלות עובדים מפורטת` |
| Transport cost, itemised separately | Same screen, `עלות הסעות — פירוט`; totals per carrier on the dashboard |
| Day cost | Column `עלות יום` in the P&L sheet |
| Unit price 0.1 ₪ | `תעריפים והגדרות` → `הכנסה`, editable live |
| Profit / loss per day, in its own sheet | `רווח והפסד יומי` — one row per day, with a totals row and CSV export |

Beyond the brief, the demo can also be **used**, not just read: add a worker with
their own hourly rate, correct an imported record, assign someone to a work day,
open a new day, or fill in a missing production total — each one recalculates the
P&L immediately. Those records live in the browser over the imported sheet, which
is never modified; see "Records created in the app" below.

## Run it

**The copy you send to the client** — no install, no server, no network:

```
dist\mehola-crm-demo.html      double-click it
```

**During development** (multi-file, easier to edit):

```
start.bat                      or:  python tools/serve.py
```

A server is needed for the multi-file version only because browsers block
`file://` pages from loading sibling files in some configurations; the bundled
file has no such problem.

## Deploy to Vercel

The repo is Vercel-ready as it stands — `vercel.json` sits at the repository
root and needs no project settings changed:

```
npm i -g vercel        # once
vercel                 # preview deployment
vercel --prod          # production
```

Or import the repo in the Vercel dashboard and press Deploy; leave *Framework
Preset* on **Other** and *Root Directory* at the repository root.

What the deploy does:

| | |
| --- | --- |
| Build | `node mehola-crm-demo/tools/build_web.mjs` — no dependencies, no install step |
| Serves | `mehola-crm-demo/public/` only — the source workbook, transcript and `docs/` are never published |
| Routing | none needed; the app is a hash router, so every screen is one static `index.html` |
| Headers | CSP, `nosniff`, `X-Frame-Options`, `noindex` — set in `vercel.json` |

The **AI assistant is excluded from the deployed copy**. It needs a server-side
`OPENAI_API_KEY`, which the static deployment has no place to hold; the build
strips the `<!-- ai:start -->…<!-- ai:end -->` regions out of `index.html` and
leaves `src/ai.js` behind. Local development is unaffected — `tools/serve.py`
still serves the drawer and proxies to OpenAI. To put the assistant back on
Vercel, port the `/api/ai` handler from `tools/serve.py` into a Vercel Function
and drop the `ai:` markers.

`public/` is generated and git-ignored. Build it locally to see exactly what
ships:

```
node tools/build_web.mjs
python tools/serve.py           # then browse public/ however you like
```

Note that the dataset carries real worker names and ת.ז numbers, and the
deployment is public — anyone with the link can read it. Vercel's *Deployment
Protection* (project → Settings → Deployment Protection) adds a password or a
team-only login if that changes.

## Rebuild after a change

```
python tools/migrate_excel.py     # Excel -> src/data/rosman.js   (only if the sheet changed)
python tools/build_single.py      # src/**  -> dist/mehola-crm-demo.html
```

## Layout

```
index.html               shell: sidebar, top bar, script order
src/styles.css           all styling (light, RTL-first)
src/lib/format.js        he-IL money / dates / hours, RTL-safe number isolates
src/lib/config.js        the rate book: defaults from the client brief + localStorage
src/lib/store.js         records created in the app, layered over the imported sheet
src/lib/calc.js          the engine: hours -> tiers -> cost -> transport -> P&L
src/lib/ui.js            DOM/table/chart/CSV helpers (no dependencies)
src/views/*.js           one file per screen
src/data/rosman.js       GENERATED dataset — do not hand-edit
tools/migrate_excel.py   Excel -> dataset, with cleansing + audit log
tools/build_single.py    bundle everything into dist/
tools/build_web.mjs      assemble public/ for the Vercel deployment
tools/serve.py           local dev server (also proxies /api/ai)
docs/                    handoff, demo script
```

No framework and no build step by design: the demo has to open on any laptop in
a meeting room, offline, years from now. `window.M` is the single global namespace.

## Where the numbers come from

Every figure on screen is produced by `src/lib/calc.js` from three inputs — the
migrated sheet, the rate book, and the schedule mode. Nothing is hard-coded.
Rates, overtime thresholds, carrier rules and the unit price are all editable in
`תעריפים והגדרות`, and the whole period recalculates immediately (changes are
kept in the browser's localStorage; `החזר לתעריפי הדרישות` clears them).

## Records created in the app

`src/lib/store.js` holds everything the user creates — new workers, edits to
imported ones, attendance assignments, production totals, new work days — as an
overlay in `localStorage`, applied over `src/data/rosman.js` on every render.

Two properties this buys, both of which matter in front of a client:

- the imported sheet is never modified, so "what the sheet said" stays available;
- anything added is tagged, and shows up badged (`נוסף במערכת`, `נוסף`, `עודכן`),
  so a record made during a demo is never mistaken for source data.

`תעריפים והגדרות` shows the count of such records and clears them in one click.
This module is also the seam where a real API client would go: replace the four
localStorage calls and every screen keeps working unchanged.

See `docs/HANDOFF.md` for decisions, assumptions and open questions,
and `CHANGELOG.md` for what changed when.
