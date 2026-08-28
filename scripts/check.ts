import { dashboardSummary, dataGaps, reconcile } from "@/lib/calc/aggregate";
import { ALL_PERIODS, availableYears, buildModel } from "@/lib/calc/model";
import { monthName, type MonthNumber } from "@/lib/domain/types";
import { readStore } from "@/lib/store/repository";

/**
 * npm run check — with overhead at zero, total cost must equal total salaries
 * to the dirham. Exits non-zero if it doesn't.
 */

const aed = (value: number) =>
  value.toLocaleString("en-AE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).padStart(14);
const hrs = (value: number) =>
  value.toLocaleString("en-AE", { minimumFractionDigits: 1, maximumFractionDigits: 1 }).padStart(10);

async function main() {
  const store = await readStore();
  if (store.timesheet.length === 0) {
    console.error("No data in data/store.json. Run `npm run seed` first.");
    process.exit(1);
  }

  const model = buildModel(store);
  console.log(`Overhead assumption: AED ${store.settings.monthlyOverhead.toLocaleString()} / month`);
  console.log(`Billable categories: ${store.settings.billableCategories.join(", ")}\n`);

  for (const year of availableYears(model)) {
    const filter = { year, month: null };
    const summary = dashboardSummary(model, filter);
    const check = reconcile(model, filter);

    console.log(`── ${year} ────────────────────────────────────────────────────────────────`);
    console.log("month          salaries         cost     diff    total hrs  billable hrs   ind rate");
    for (const month of check.months) {
      const trend = summary.trend.find((point) => point.key === month.key);
      console.log(
        `${monthName(month.month as MonthNumber).slice(0, 3)} ${month.year}   ` +
          `${aed(month.salaryTotal)} ${aed(month.cost)} ${month.difference.toFixed(2).padStart(8)}  ` +
          `${hrs(trend?.hours ?? 0)} ${hrs(trend?.billableHours ?? 0)} ${aed(trend?.indirectRate ?? 0)}`,
      );
    }

    console.log(
      `\n  total salaries  ${aed(check.salaryTotal)}` +
        `\n  overhead        ${aed(check.overhead)}` +
        `\n  total cost      ${aed(check.cost)}` +
        `\n  difference      ${aed(check.difference)}   ${check.reconciles ? "✓ reconciles" : "✗ DOES NOT RECONCILE"}`,
    );

    console.log(
      `\n  total hours     ${hrs(summary.totalHours)}` +
        `\n  billable hours  ${hrs(summary.billableHours)}` +
        `\n  productivity    ${((summary.productivity ?? 0) * 100).toFixed(1).padStart(10)}%` +
        `\n  revenue         ${aed(summary.revenue)}` +
        `\n  margin          ${aed(summary.margin)}   ${((summary.marginPct ?? 0) * 100).toFixed(1)}%`,
    );

    const gaps = dataGaps(model, filter);
    const lines = [
      gaps.unpricedRefCodes.length && `${gaps.unpricedRefCodes.length} ref code(s) with hours but no price`,
      gaps.missingSalaries.length && `${gaps.missingSalaries.length} employee(s) with hours but no salary`,
      gaps.pricedWithoutHours.length && `${gaps.pricedWithoutHours.length} priced project(s) with no hours`,
      gaps.staffWithoutHours.length && `${gaps.staffWithoutHours.length} employee(s) on payroll with no hours`,
    ].filter(Boolean);
    console.log(`\n  data gaps       ${lines.length ? lines.join("\n                  ") : "none"}\n`);
  }

  const overall = reconcile(model, ALL_PERIODS);
  if (!overall.reconciles) {
    console.error(`FAILED: total cost is off by AED ${overall.difference.toFixed(2)}.`);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
