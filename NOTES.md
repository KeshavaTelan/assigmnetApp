# Notes

## What I'd build next

The employee × category matrix, the pivot the finance team builds by hand. The data is already
shaped for it, so it's a selector and a table.

An audit view showing how each month's rates were derived: every person's salary, hours and direct
rate, the three parts of the indirect pool, and the rate that came out. `npm run check` prints most
of this to the terminal already. Putting it on screen is what would make the model trustworthy to
someone who didn't write it, and I think it's the highest-value thing left.

Multi-year comparison. Years already come from the data rather than a constant, so loading 2023 and
2024 alongside 2025 is a page, not a refactor.

Sorting and search on the tables. Fine at eleven projects and twelve people, not fine at eighty.

## What I cut, and why

SQLite. It would look more production-shaped, but it's a native module that can fail to build on a
machine I don't control, and SQL buys nothing at this size. Everything goes through one repository
module, so swapping it later is one file. At ten years of data I'd change my mind.

Pagination and virtualised tables. 562 rows don't need them.

Charting beyond the one chart. The dashboard trend earns a real library because it has two axes and
a line. The project's monthly effort is twelve bars, so it's twelve divs.

## What I'm not happy with

Revenue recognition is a judgement call, not a specification. I pro-rate a project's price by hours
logged, because cost accrues monthly and a monthly margin is meaningless if revenue doesn't. But a
finance team might recognise on invoice or on milestone, and that changes every monthly number on
the dashboard. It's one function if you'd rather it worked differently, but I'd want to agree it
rather than assume it.

The sample year has no gaps in it. Every employee has a salary and every billable ref code has a
price, so the missing-salary and missing-price states never actually appear when you click around.
They're built and tested, but you have to go looking to see them. If you want to: on the Data page,
untick Projects from the billable categories and save.

No test drives the upload UI, only the parse-and-store path underneath it. I checked that path by
hand with a generated single-month workbook, but it isn't automated.

Project names are proposal filenames. I clean them for display and keep the original on hover, which
is a display fix for a data problem.

`round()` is copy-pasted across the five pages that export CSV. It should be in `lib/format.ts`.
