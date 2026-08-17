# Demo script — 10 minutes

What to open, in what order, and what to say. English counterpart of
`demo-script-he.md` — the app itself is in Hebrew, so each step names the screen
in English and gives the Hebrew nav item you actually click.

File to present: `dist/mehola-crm-demo.html` (double-click; works offline).

---

### 0 · Before you walk in (30 seconds)

Say the bottom line up front — don't let it detonate mid-demo:

**At ₪0.10 per unit, the Rosman site loses money.** ₪31,083 over the seven weeks
on the hours actually recorded in the sheet; ₪83,406 on the 07:00–18:00 day they
asked us to calculate. Break-even unit price: ₪0.125 and ₪0.167 respectively.

This is not a bug in the demo — it is what their own sheet says.

---

### 1 · Site overview — `סקירת אתר` (2 min)

- The four numbers at the top: revenue, total cost, profit, break-even unit price.
- The chart: **34 work days, every one of them red.** This is the thing an Excel
  sheet cannot show them.
- Below: cost structure — worker cost and transport cost **separately**, exactly
  as they asked in writing.

> "Everything here comes out of your own sheet, untouched. Not one number was retyped."

---

### 2 · Daily P&L — `רווח והפסד יומי` (2 min) — the thing they asked for

- One row per day. A column for worker cost, a column for transport cost, a column
  for day cost, then units, revenue, profit, margin.
- Last column: **that day's break-even price** — what they'd have needed per unit
  to avoid a loss.
- Point at **30/07/26**: marked `חסר` (missing). No production total in the sheet,
  so no revenue can be computed — but the day's ₪7,332 of cost is still counted.
  The system refuses to invent the number.
- **CSV export** — opens in Excel, in Hebrew, if they want to work the familiar way.

---

### 3 · Day detail — click the 05/08/26 row (2 min)

- Every worker on one line: in, out, hours split into 100% / 125% / 150%, rate, cost.
- בושרה is tagged **חריג** (exception) — ₪43 instead of ₪40, exactly as they specified.
- Below it: **transport, itemised** — Ghislain ₪400 flat for the day regardless of
  headcount (5 riders), Abu Radad ₪30 × 9 workers = ₪270.
- Shadi is tagged **"הנחה — טעון אישור"** (assumed — needs approval): they never gave
  us a rate for him, so we assumed ₪30. That needs confirming.
- Day result: ₪7,785 cost against ₪6,099 revenue on 60,986 units → **−₪1,687**,
  break-even ₪0.128.

---

### 4 · Rates & settings — `תעריפים והגדרות` (2 min) — the strong moment

- Change **unit price** from 0.1 to 0.167 → the entire system flips to green instantly.
- Or click **"קבע מחיר איזון"** and let it compute the break-even price itself.
- Restore with **"החזר לתעריפי הדרישות"**.

> "Any rate change — wage, transport, unit price — recalculates the whole period in
> a second. In a spreadsheet that's a day of somebody's work in the office, with a
> good chance of an error."

---

### 5 · Data quality — `איכות נתונים` (1.5 min) — why a system is needed at all

- **20 of 32 workers have no ID number.** Without it, a worker cannot be merged
  across the 52 sites.
- **One ID number is recorded for three different people.**
- **12 names** were written several ways and had to be merged —
  סאלי שתיוי / סאלי שתוי / סאלי.
- **One date** was written 21/06 in the middle of July — recovered from the day name.
- **One day (30/07) has no production total** — no revenue can be calculated for it.

> "These aren't demo bugs, this is your data as it stands. In a purpose-built system
> they simply can't happen: ID is a required field, worker names are picked from a
> list, the date comes from the system, and closing a day requires a production total."

---

### 6 · Close with the questions (30 seconds)

1. Is ₪0.10 per unit really the contract price? Is there a revenue stream not in this sheet?
2. 07:00–18:00 — are shifts actually changing, or was that a calculation exercise?
3. Transport rates for Shadi, Nimer, Maria, Christine?
4. Bushra — Shweiki or Suyuwat?
5. Can the office supply the missing ID numbers?

---

**Not in the demo** (if asked): worker mobile app, GPS attendance, payslip PDF
splitting, Form 101, role-based permissions, WhatsApp, and the other 51 sites.
This is a demo of the financial core — what they asked to see first.
