# Margin Dashboard

Three spreadsheets in, one question out: **did we actually make money on that project?**

Ingests the agency's timesheet, salary overview and project price workbooks, applies the cost model,
and answers it across a dashboard, per-project pages, departments, productivity and where the time
goes.

---

## Running it

Node 20.9 or newer. No database, no cloud account, no API key.

```bash
npm install
npm run dev
```

Open http://localhost:3000. The 2025 sample year is loaded automatically on first run, so the
dashboard is populated the moment it opens — `predev` seeds `data/store.json` from the three
workbooks in `public/` only if there is no store yet, so it never overwrites your uploads.

To load your own data, go to **Data** in the sidebar and upload the three `.xlsx` files there. You
can upload one on its own; the other two stay as they are.

| Command | What it does |
| --- | --- |
| `npm run dev` | Seeds if needed, then starts the app |
| `npm run seed` | Reloads the sample year, replacing whatever is in the store |
| `npm run check` | Prints the year's totals and runs the brief's reconciliation self-check |
| `npm test` | Parser, cost model, re-upload and CSV tests |

`npm run check` is the fastest way to confirm the numbers before opening anything:

```
  total salaries    2,400,000.00
  overhead                  0.00
  total cost        2,400,000.00
  difference                0.00   ✓ reconciles
```

---

## The cost model

Implemented as briefed, per person, per month:

```
direct cost rate / hour   = that month's salary ÷ that month's total logged hours
indirect cost pool        = salaries of people who logged no hours
                          + everyone else's non-billable time at their direct rate
                          + the monthly overhead
indirect cost rate / hour = indirect cost pool ÷ billable hours that month
employee cost on project  = hours × (direct rate + indirect rate)
```

The one thing everything hangs off: **cost is charged to billable hours only.** Non-billable time is
already inside the indirect pool, so charging it again is the double-count the self-check catches.
With overhead at zero, total company cost then equals total salaries exactly — AED 2,400,000 for
2025, every month as well as the year.

Rates are always derived from the whole month, never from the period on screen. A rate is a property
of the month; filtering first would change the rate itself.

---

## Assumptions

Where the brief left room, these are the calls I made.

**Revenue is earned as hours are logged.** A project has one price but its cost accrues monthly, so
revenue is recognised as `price × (hours in period ÷ total hours on the project)`. Over a project's
life that sums back to exactly the price. Recognising the whole price in its sales month would make
one month look spectacular and the delivery months that follow look like losses.

**Billable means the three named categories** — Projects, Enhancements, Hosting. Everything else is
internal time the agency absorbs. It's an allowlist rather than a denylist, so a category nobody
anticipated (the data contains a `Tentwenty` category the brief doesn't mention) is absorbed rather
than silently billed. Editable on the Data page.

**A missing value is never zero.** Someone with hours but no salary row has their hours counted and
their cost left out, rather than a salary invented for them; their billable hours are also excluded
from the indirect rate's denominator so the month still reconciles. An unpriced ref code shows its
cost with revenue and margin marked unknown. Both are flagged at the top of the dashboard, because
each one makes a number below it smaller than the truth.

**A blank month in the salary sheet means "not on payroll"**, not a salary of zero.

**The project page shows the whole project**, not the dashboard's filtered period — a project's
margin isn't a monthly quantity.

---

## Data handling

The sheets are messy and the parsers absorb it rather than assume it away. Header rows are found by
scoring, not hardcoded, which is what handles the salary sheet's header sitting in row 2 under a
title. Three date dialects (`January 2025`, `May '25`, bare `January`) all normalise to
`(year, month)`. `-` and `n/a` read as blank; numbers written as text parse. The wide salary sheet
is unpivoted to one row per person per month. A file that isn't what it claims is rejected naming
the columns it was missing and the ones it actually had, and nothing is written.

**Re-uploading** replaces only the months the incoming file covers. A workbook containing just May
replaces May and leaves the other eleven months untouched; uploading the same file twice changes
nothing. Prices are keyed by Ref Code and upserted. Every upload reports what it replaced, added and
left alone.

---

## How it's put together

```
app/                     one page per question, all server components
  page.tsx               dashboard
  projects/[ref]/        project detail
  departments/[name]/    department drill-down
  productivity/  categories/  upload/
lib/
  parse/                 xlsx → typed rows; months.ts, sheet.ts, one parser per file
  store/repository.ts    the JSON store and the month-scoped replace
  calc/rates.ts          the cost model — direct rates, indirect pool, indirect rate
  calc/aggregate.ts      the selectors each page renders
  format.ts              AED, hours, percentages — formatting only happens here
  csv.ts                 RFC 4180 escaping for the table exports
scripts/                 seed.ts, check.ts
data/store.json          the store (gitignored, rebuilt by `npm run seed`)
```

Nothing under `lib/calc` imports React or Next, which is why the whole cost model can be exercised
from `npm run check` and `npm test` without rendering anything. Every page is a server component
that calls one selector and renders it, and the period filter lives in the URL so all pages read the
same one.

Persistence is a single JSON file behind a repository module — no native modules on a clean
checkout, inspectable when a number looks wrong, and swapping in SQLite means changing one file.

---

## Notes

[NOTES.md](NOTES.md) — what I'd build next, what I cut and why, and what I'm not happy with.
