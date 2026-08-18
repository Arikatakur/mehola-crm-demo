# Changelog

All notable changes to the Mehola CRM demo.
Format follows [Keep a Changelog](https://keepachangelog.com/); dates are ISO.

## [Unreleased]

### Added
- Vercel deployment. `vercel.json` at the repository root builds the site with
  `tools/build_web.mjs` and publishes `public/` — a dependency-free Node script
  that copies `index.html`, `src/` and `assets/` into an output directory and
  verifies every reference resolves. Nothing else in the repo is published, so
  the source workbook, the meeting transcript and `docs/` stay unserved.
- Security headers on the deployment: a CSP that keeps the page to same-origin
  resources (`'unsafe-inline'` is required for the generated `onclick` row
  handlers), `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`,
  and `noindex` — the demo is shared by link, not through search.
- `<!-- ai:start -->` / `<!-- ai:end -->` markers around the AI drawer in
  `index.html`, so one region can be excluded from a build.

### Changed
- The AI assistant is not part of the Vercel deployment: it depends on the
  `/api/ai` proxy in `tools/serve.py` holding an `OPENAI_API_KEY`, which a static
  deployment has nowhere to keep. `tools/build_web.mjs` strips it. Local
  development through `tools/serve.py` is unchanged.

## [0.2.0] — 2026-08-17

The demo becomes usable, not just readable: workers can be added and paid, and
attendance and production can be entered — each change recalculating the P&L.

### Added
- `src/lib/store.js` — an editable overlay on the imported dataset. New workers,
  edits to imported ones, attendance assignments, production totals and new work
  days are kept in `localStorage` and layered over `src/data/rosman.js` on every
  render. The imported sheet is never mutated, and every created record is tagged
  so it cannot be confused with source data.
- `עובד חדש` / `עריכת עובד` screen (`src/views/workerform.js`): full name, ת.ז,
  phone, team, default carrier, active status, notes, and hourly pay — either the
  site base rate or a worker-specific exception, written into the same rate book
  the client's ₪43/₪44 exceptions live in. Live cost-of-a-full-day preview,
  Israeli ID check-digit validation, and duplicate-ID detection against the register.
- Assign a worker to a work day, and remove an assignment, from `פירוט יום`.
  Hours default to the active schedule; the carrier defaults to the worker's.
- Enter or correct a day's production total from `פירוט יום` — this closes the
  loop on the one day the sheet is missing (30/07/26), turning it from "no revenue
  computable" into a costed, profitable-or-not day.
- Open a new work day from `רווח והפסד יומי`, with optional production total.
- `תעריפים והגדרות` now reports how many records were created in the app and
  clears them in one click (two-step confirm).
- A carrier typed into any form that has no billing rule gets the assumed
  ₪30/worker rule rather than silently costing nothing.

### Changed
- Workers with no shifts yet stay visible in the register and the rate book, and
  their file shows a short form explaining they are not yet in the P&L.
- Worker file gained an edit action, phone/status/notes rows, and a check-digit
  warning next to an invalid ת.ז.

### Fixed
- Saving a worker read the form *after* the store update had re-rendered the view,
  so a custom hourly rate was silently dropped. Form values are now captured first.
- Deleting a worker created in the app no longer leaves an orphaned rate override
  behind in the rate book.

## [0.1.0] — 2026-08-17

First working demo. Built in one session from the three source inputs
(`what-the-company-wants.txt`, `meeting-transcript.txt`, `רוסמן..xlsx`) after a
power cut ended the previous session with an empty repository.

### Added — data pipeline
- `tools/migrate_excel.py` — Excel → normalized dataset in one pass:
  staging, cleansing, de-duplication, audit. Emits `src/data/rosman.js`.
  Result: 34 work days (21/06/26–09/08/26), 410 attendance rows, 32 workers,
  7 carriers, 1,250,382 production units.
- Cleansing rules: 12 worker name-spelling merges; carrier spellings unified
  (`גסלין`→`גיסלין`, `כרסתין`→`כריסתין`, `עצמאית`→`עצמאי`); Israeli ID check-digit
  validation; per-day production totals parsed, including the two `בונס` days.
- Chronological date repair: a block written `21\06\26` between 20/07 and 22/07
  and labelled שלישי is recovered as 21/07/26 from the Hebrew day name.
- Audit log: 36 findings emitted with the data — 13 auto-corrected (with the
  before/after recorded), 23 left for the office (20 workers without ת.ז,
  1 worker with two IDs, 1 ID shared by three people, 1 day without production).
  Nothing is dropped silently.

### Added — costing engine (`src/lib/calc.js`)
- Hours split into 100% / 125% / 150% tiers (125% above 8.5h, 150% above 10.5h).
- Rate resolution: worker-specific override → site base rate (₪40; בושרה ₪43, רנא ₪44).
- Transport costed per carrier in two modes: flat per day (גיסלין ₪400) or
  per worker (אבו רדאד ₪30), plus a no-charge mode for `עצמאי`.
- Revenue from production units × unit price (₪0.10), profit, margin, and the
  break-even unit price per day and per period.
- Aggregations: per day, per carrier, per worker ("Berut"), per month.

### Added — screens
- `סקירת אתר` — KPIs, profit-per-day column chart, revenue-vs-cost trend,
  cost structure, carrier and worker breakdowns, monthly summary.
- `רווח והפסד יומי` — the daily P&L sheet the client asked for in writing:
  worker cost, transport cost and day cost each in its own column, against
  revenue, profit, margin and break-even price. Totals row, CSV export.
- `פירוט יום` — worker-by-worker costing for one day, transport breakdown, day P&L.
- `עובדים` + `תיק עובד` — de-duplicated register with search/filter/sort, and a
  per-worker file with merged spellings, cost breakdown, monthly totals and log.
- `תעריפים והגדרות` — the whole rate book, editable, recalculating the entire
  period live; shows the delta against the client's stated rates; one click sets
  the break-even unit price. Persists to `localStorage`, resettable.
- `איכות נתונים` — the migration audit, grouped by finding type, with the
  business impact of each.

### Added — packaging
- `tools/build_single.py` — bundles CSS, all scripts, data and logo into one
  210 KB `dist/mehola-crm-demo.html` that opens by double-click, offline.
- `tools/serve.py` + `start.bat` — local dev server that opens the browser.
- `README.md`, `docs/HANDOFF.md`, and a 10-minute demo walkthrough in both
  Hebrew (`docs/demo-script-he.md`) and English (`docs/demo-script-en.md`).

### Notes
- Assumed, pending client confirmation: ₪30/worker transport for the four carriers
  the brief does not name (שאדי, נמר, מאריא, כריסתין — ₪1,680 over the period);
  בושרה ₪43 applied to בושרה שויקי; רנא גיריס = רנא גריס.
- Finding: at ₪0.10/unit the site loses money in both scenarios — −₪31,083
  on the hours actually punched, −₪83,406 on the 07:00–18:00 day the client asked
  us to model. Break-even is ₪0.125 and ₪0.167 respectively.
- Overtime is daily only; the weekly 42-hour trigger from the feature report is
  not implemented.
- Out of scope for this demo: mobile app, GPS/NFC attendance, תלוש PDF splitting,
  טופס 101, permissions matrix, WhatsApp integration, the other 51 sites, backend.
