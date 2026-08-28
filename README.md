# Margin Dashboard

Three spreadsheets in, one question out: **did we actually make money on that project?**

Ingests the agency's timesheet, salary overview and project price workbooks, applies the cost model,
and answers it across a dashboard, per-project pages, productivity and where the time goes.

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

upload three excel files into the public folder


| Command | What it does |
| --- | --- |
| `npm run dev` | Seeds if needed, then starts the app |
| `npm run seed` | Reloads the sample year, replacing whatever is in the store |
| `npm run check` | Prints the year's totals and runs the brief's reconciliation self-check |
| `npm test` | Parser, cost model and re-upload tests |

`npm run check` is the fastest way to confirm the numbers before opening anything:



```
  total salaries    2,400,000.00
  overhead                  0.00
  total cost        2,400,000.00
  difference                0.00   ✓ reconciles
```

---
## How it's put together

```
app/                     one page per question, all server components
  page.tsx               dashboard
  projects/[ref]/        project detail
  productivity/  categories/  upload/
lib/
  parse/                 xlsx → typed rows; months.ts, sheet.ts, one parser per file
  store/repository.ts    the JSON store and the month-scoped replace
  calc/rates.ts          the cost model — direct rates, indirect pool, indirect rate
  calc/aggregate.ts      the selectors each page renders
  format.ts             AED, hours, percentages — formatting only happens here
scripts/                 seed.ts, check.ts
data/store.json          the store (gitignored, rebuilt by `npm run seed`)
```




