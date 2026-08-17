# Handoff — Mehola CRM demo

**Date:** 2026-08-17 · **Status:** demo complete and working · **Repo:** `mehola-crm-demo/` (git, branch `master`)

The previous session was cut off by a power failure before any code was written —
the repo held nothing but an empty `.git`. This session rebuilt the whole thing
from the three source inputs. Everything described below is in the repo and runs.

---

## 1. What exists now

A self-contained web demo of the management dashboard, driven by the **real**
Rosman (`רוסמן`) attendance sheet, with a costing engine that implements the
client's written requirements exactly.

| Screen | Route | What it shows |
| --- | --- | --- |
| סקירת אתר | `#/` | KPIs, profit-per-day chart, revenue-vs-cost trend, cost structure, carriers, top workers, monthly summary |
| רווח והפסד יומי | `#/pnl` | **The sheet the client asked for**: one row per day — worker cost, transport cost, day cost, units, revenue, profit, margin, break-even price. Totals row + CSV |
| פירוט יום | `#/day/<date>` | Worker-by-worker cost for one day (hours split 100/125/150, rate, transport share) + transport breakdown + day P&L |
| עובדים | `#/workers` | De-duplicated worker register, searchable/filterable, with days, hours, OT, cost |
| תיק עובד | `#/worker/<id>` | One worker: identity (incl. merged spellings), cost breakdown, monthly totals, full attendance log |
| תעריפים והגדרות | `#/rates` | The rate book — every input editable, whole period recalculates live |
| איכות נתונים | `#/quality` | What the Excel migration found: what was auto-fixed, what needs the office to decide |

**Two deliverable forms.** `dist/mehola-crm-demo.html` is a single 210 KB file with
CSS, JS, data and logo inlined — double-click, works offline, nothing to install.
That is what goes to the client. The multi-file source is what you edit.

### Stack decision

Plain HTML/CSS/ES5-style JS, one global (`window.M`), no framework, no build step,
no dependencies. Reason: the demo has to open on an unknown laptop in a meeting,
possibly offline, and keep working months later without an `npm install` that
may not resolve. Every screen is ~150–250 lines and reads top to bottom.
If this becomes a product, the engine (`src/lib/calc.js`) ports as-is; only the
view layer would be rewritten.

---

## 2. The numbers (sanity anchors)

Regenerate any time with `python tools/migrate_excel.py`. If a change breaks the
engine, these are what to check against.

**Dataset:** 34 work days (21/06/26–09/08/26, Sun–Thu) · 410 attendance rows ·
32 workers after de-duplication · 7 carriers · 1,250,382 units produced.

**Scenario A — 07:00–18:00 (default, as the client instructed):**

| | |
| --- | --- |
| Hours | 4,510 (3,485 @100% · 820 @125% · 205 @150%) |
| Worker cost | ₪194,557 |
| Transport cost | ₪21,220 |
| Total cost | ₪215,777 |
| Revenue @ ₪0.10/unit | ₪125,038 |
| **Profit** | **−₪83,406 (−66.7%)** |
| Break-even unit price | ₪0.167 |
| Profitable days | 0 of 33 costed days |

**Scenario B — hours actually punched in the sheet (07:00–15:30, 8.5h):**

| | |
| --- | --- |
| Hours | 3,477 (no overtime at all) |
| Worker cost | ₪140,391 |
| Total cost | ₪161,611 |
| **Profit** | **−₪31,083 (−24.9%)** |
| Break-even unit price | ₪0.125 |
| Profitable days | 4 of 33 |

**Transport by carrier (whole period):** גיסלין ₪13,600 · אבו רדאד ₪5,940 ·
שאדי ₪1,170 · נמר ₪330 · מאריא ₪120 · כריסתין ₪60 · עצמאי ₪0.

> **This is the headline finding, and it needs to be said out loud before the demo:**
> at ₪0.10 per unit the Rosman site loses money in every configuration we can
> compute — ₪31k over seven weeks on the hours actually worked, ₪83k on the
> 07:00–18:00 day the client asked us to model. The demo does not hide this; the
> dashboard opens with it and offers the break-even price. If the client expects
> a profitable site, the first question is whether ₪0.10 is really the contract
> price, or whether some revenue line (bonus, fixed monthly fee, a second billing
> stream) is missing from the sheet we were given.

---

## 3. Decisions and assumptions

Everything here is **visible in the UI**, not buried: assumed values carry an
"הנחה — טעון אישור" badge, auto-corrections are listed in `איכות נתונים`.

### Taken directly from the client brief
- Base rate ₪40/hour. Exceptions: בושרה ₪43, רנא ₪44.
- אבו רדאד private team transport: ₪30 per worker per day.
- גיסלין external transport company: ₪400 per day, flat, any headcount.
- Unit (sticker) price ₪0.10.
- Working day 07:00–18:00 "so that there are overtime hours to calculate".

### Taken from the feature report (`meeting-transcript.txt` §1.2)
- 125% after 8.5 daily hours, 150% after 10.5 daily hours.
- Rate priority: worker-specific override → site base rate.
- An 11-hour day at ₪40 therefore costs ₪470 (8.5×40 + 2×50 + 0.5×60).

### Assumptions made to fill gaps — **each needs client confirmation**
1. **Carriers not named in the brief** (שאדי, נמר, מאריא, כריסתין) are billed
   ₪30/worker like a team transport. Worth ₪1,680 over the period (7.9% of transport).
   `עצמאי / עצמאית` is treated as ₪0 (worker travels independently).
2. **Which בושרה gets ₪43** — the sheet has two: בושרה שויקי (26 days, ID 207308818)
   and בושרה סויואת (11 days, no ID). Applied to **שויקי**. If it is the other one,
   change it in `תעריפים והגדרות` — it is one field.
3. **רנא גיריס and רנא גריס are one person** (₪44 applied to the merged record).
4. Overtime is computed **daily only**. The report also mentions a 42-hour weekly
   trigger; it is not implemented, and with a Sun–Thu 11-hour day it would fire
   constantly, so it needs a rule before it is added.
5. Transport is charged **per day, not per direction** (no round-trip doubling).
6. Days with no production total are excluded from revenue and profit but their
   cost is still counted in cost totals. One day is affected: **30/07/26** (₪7,332).

### Data cleansing performed (all logged, nothing silently dropped)
- **12 name-spelling merges**, e.g. `סאלי שתיוי / סאלי שתוי / סאלי` → one worker.
  Full list is in `NAME_ALIASES` in `tools/migrate_excel.py` and on the איכות נתונים screen.
- **1 date repaired**: a block dated `21\06\26` sits between 20/07 and 22/07 and is
  labelled שלישי → read as **21/07/26**. Recovered from the Hebrew day name.
- Carrier spellings unified (`גסלין`→`גיסלין`, `כרסתין`→`כריסתין`, `עצמאית`→`עצמאי`).
- Two days carry a `בונס` figure (09/07: 11,420+2,580 → 14,000; 13/07: 20,178+5,000 → 25,178).
  The demo uses the combined total as units and shows a "כולל בונוס" badge.

---

## 4. Open questions for the client

Ask these in one go — most are one-line answers, and four of them change the numbers:

1. Is **₪0.10 per unit** the real contract price? At current costs the site needs ₪0.125–₪0.167.
   Is there another revenue line missing from the sheet?
2. Is the **07:00–18:00 day** an actual change to shifts, or a calculation exercise?
   (It moves the loss from ₪31k to ₪83k over seven weeks.)
3. **Transport rates for שאדי, נמר, מאריא, כריסתין** — confirm or replace the assumed ₪30/worker.
4. **בושרה = which one?** (שויקי or סויואת) — and confirm רנא גיריס = רנא גריס.
5. **ID 214621799** is written for three different people in the sheet
   (סאברין זידאן, פסיל עבד אלחמיד, עליא). Whose is it?
6. **20 of 32 workers have no ת.ז in the sheet.** Without it they cannot be merged
   across the 52 sites. Can the office supply the missing IDs?
7. **30/07/26 has no production total.** Was there no output, or is the figure missing?
8. Should overtime also use a **weekly 42-hour** trigger, and if so measured over which week?

---

## 5. Deliberately not built

The feature report describes a full system; this is a demo of its **financial core**.
Not present, and not pretended to be:

- Worker mobile app: GPS/geofenced check-in, NFC/QR, facial recognition, shift confirmation.
- Bulk `תלוש` PDF splitting/mapping/encryption, push notifications, digital טופס 101.
- Permissions matrix (Menahal / Office admin / Field coordinator) — the demo shows everything.
- WhatsApp / SendWise messaging and its audit trail.
- The other 51 sites, hourly ("Manpower Supply") billing, departments hierarchy.
- Real backend, database, authentication, audit trail with rollback.
  Rate edits persist in `localStorage` only, per browser.

---

## 6. Next steps, in the order I would do them

1. **Send the numbers before the meeting.** The loss finding should not be a
   surprise in the room. Section 2 above is the whole message.
2. **Get the eight answers** in §4; four of them change what the demo shows.
3. Re-run `python tools/migrate_excel.py && python tools/build_single.py` after any
   sheet or alias change, and re-send `dist/mehola-crm-demo.html`.
4. If the demo lands: the next real milestone is **multi-site + hourly billing**,
   because the rate-priority hierarchy and the "Berut" cross-site worker file only
   become meaningful with more than one site. That needs a backend and an import
   pipeline for the other 51 sheets — the migration script is the seed of it.
5. Keep `src/lib/calc.js` as the single source of arithmetic. If a number ever
   looks wrong, it is in that file or in the rate book, nowhere else.

---

## 7. Practical notes for whoever picks this up

- `src/data/rosman.js` is **generated**. Edit `tools/migrate_excel.py` and re-run;
  never hand-edit the data file.
- The source workbook lives one level up (`../רוסמן..xlsx`) and is **not** in the
  repo. The migration script takes an optional path argument if it moves.
- Hebrew + numbers: money/dates/percent go through `M.fmt`, which wraps values in
  Unicode isolates (U+2066/U+2069). Without that, a minus sign jumps to the wrong
  end of the number in RTL. If you print a raw number into Hebrew text, use `M.fmt`.
- Adding a screen: add a file in `src/views/`, register it in `ROUTES` in
  `src/app.js`, and add the `<script>` tag to `index.html` (order matters — the
  bundler inlines in exactly that order).
- The scenario switch in the header writes `scheduleMode` into the same config
  object as the rates screen; there is only one config, one engine, one render path.
