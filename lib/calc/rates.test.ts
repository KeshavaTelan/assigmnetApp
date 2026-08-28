import { describe, expect, it } from "vitest";

import { dashboardSummary, dataGaps, projectDetail, productivityRows, reconcile } from "@/lib/calc/aggregate";
import { ALL_PERIODS, buildModel } from "@/lib/calc/model";
import { buildRateIndex } from "@/lib/calc/rates";
import { DEFAULT_SETTINGS, type Store, type TimesheetRow } from "@/lib/domain/types";

/**
 * A three-person month small enough to check by hand.
 *
 *   Ana   10,000  100 h — 80 billable on P1, 20 in meetings   direct rate 100/h
 *   Ben    6,000   50 h — 50 billable on P1                   direct rate 120/h
 *   Cara   4,000    0 h — support staff
 *
 *   pool  4,000 + (20 × 100) = 6,000    indirect rate  6,000 ÷ 130 = 46.153…/h
 *   cost  (130 × 46.153…) + (80 × 100) + (50 × 120) = 20,000 = total salaries
 */
function tinyStore(overrides: Partial<Store> = {}): Store {
  const row = (
    empNo: string,
    empName: string,
    category: string,
    refCode: string | null,
    hours: number,
    department = "Design",
  ): TimesheetRow => ({
    year: 2025,
    month: 1,
    empNo,
    empName,
    expenseType: "DL",
    department,
    designation: "Designer",
    category,
    refCode,
    taskName: refCode,
    company: null,
    description: null,
    hours,
  });

  return {
    version: 1,
    settings: { ...DEFAULT_SETTINGS },
    timesheet: [
      row("1", "Ana", "Projects", "P1", 80),
      row("1", "Ana", "FC - Meetings", "FC - Meetings", 20),
      row("2", "Ben", "Projects", "P1", 50, "Backend"),
    ],
    salaries: [
      { year: 2025, month: 1, empNo: "1", empName: "Ana", salary: 10000 },
      { year: 2025, month: 1, empNo: "2", empName: "Ben", salary: 6000 },
      { year: 2025, month: 1, empNo: "3", empName: "Cara", salary: 4000 },
    ],
    prices: [
      {
        refCode: "P1",
        name: "Project One",
        price: 30000,
        salesYear: 2025,
        salesMonth: 1,
        category: "Projects",
        status: "completed",
      },
    ],
    ...overrides,
  };
}

describe("monthly rates", () => {
  const rates = buildRateIndex(tinyStore()).get("2025-01")!;

  it("derives a direct rate from the month's salary and the month's total hours", () => {
    expect(rates.employees.get("1")!.directRate).toBe(100);
    expect(rates.employees.get("2")!.directRate).toBe(120);
  });

  it("builds the indirect pool from support salaries, non-billable time and overhead", () => {
    expect(rates.poolBreakdown).toEqual({
      unloggedSalaries: 4000,
      nonBillableTime: 2000,
      overhead: 0,
    });
    expect(rates.indirectPool).toBe(6000);
    expect(rates.indirectRate).toBeCloseTo(6000 / 130, 10);
  });

  it("names the support staff rather than hiding them in the pool", () => {
    expect(rates.employeesWithoutHours).toEqual([
      { empNo: "3", empName: "Cara", salary: 4000 },
    ]);
  });
});

describe("the self-check", () => {
  it("total cost equals total salaries when overhead is zero", () => {
    const check = reconcile(buildModel(tinyStore()), ALL_PERIODS);
    expect(check.cost).toBeCloseTo(20000, 8);
    expect(check.reconciles).toBe(true);
  });

  it("total cost equals salaries plus overhead once overhead is set", () => {
    const store = tinyStore();
    store.settings.monthlyOverhead = 5000;
    const check = reconcile(buildModel(store), ALL_PERIODS);
    expect(check.cost).toBeCloseTo(25000, 8);
    expect(check.reconciles).toBe(true);
  });

  it("does not double-count when a category moves from non-billable to billable", () => {
    const store = tinyStore();
    store.settings.billableCategories = [...store.settings.billableCategories, "FC - Meetings"];
    const check = reconcile(buildModel(store), ALL_PERIODS);
    expect(check.cost).toBeCloseTo(20000, 8);
  });
});

describe("project economics", () => {
  const model = buildModel(tinyStore());
  const detail = projectDetail(model, "P1")!;

  it("splits revenue by hours and costs each person at their own loaded rate", () => {
    const ana = detail.employees.find((employee) => employee.empName === "Ana")!;
    const ben = detail.employees.find((employee) => employee.empName === "Ben")!;

    // 30,000 × 80/130 and 30,000 × 50/130
    expect(ana.revenueShare).toBeCloseTo(30000 * (80 / 130), 8);
    expect(ben.revenueShare).toBeCloseTo(30000 * (50 / 130), 8);
    expect(ana.cost + ben.cost).toBeCloseTo(detail.cost, 8);
    expect(detail.cost).toBeCloseTo(20000, 8);
  });

  it("reports project margin against the price", () => {
    expect(detail.profit).toBeCloseTo(10000, 8);
    expect(detail.marginPct).toBeCloseTo(10000 / 30000, 8);
  });

  it("breaks hours down by department", () => {
    expect(detail.departments.map((row) => [row.department, row.hours])).toEqual([
      ["Design", 80],
      ["Backend", 50],
    ]);
  });
});

describe("productivity", () => {
  it("is billable ÷ total hours, and keeps zero-hours staff on the list", () => {
    const rows = productivityRows(buildModel(tinyStore()), ALL_PERIODS);
    expect(rows.find((row) => row.empName === "Ben")!.productivity).toBe(1);
    expect(rows.find((row) => row.empName === "Ana")!.productivity).toBeCloseTo(0.8, 10);

    const cara = rows.find((row) => row.empName === "Cara")!;
    expect(cara.totalHours).toBe(0);
    expect(cara.productivity).toBeNull();
  });
});

describe("gaps in the data", () => {
  it("flags hours logged against a ref code with no price", () => {
    const store = tinyStore({ prices: [] });
    const gaps = dataGaps(buildModel(store), ALL_PERIODS);
    expect(gaps.unpricedRefCodes).toEqual([{ refCode: "P1", name: "P1", hours: 130 }]);
  });

  it("flags hours logged by someone with no salary, and does not invent a cost for them", () => {
    const store = tinyStore();
    store.salaries = store.salaries.filter((row) => row.empNo !== "2");

    const model = buildModel(store);
    const gaps = dataGaps(model, ALL_PERIODS);
    expect(gaps.missingSalaries).toEqual([{ empNo: "2", empName: "Ben", months: ["2025-01"], hours: 50 }]);

    // His hours count; his cost is absent rather than guessed, and the pool is
    // spread only over hours that can carry it, so the rest still reconciles.
    const summary = dashboardSummary(model, ALL_PERIODS);
    expect(summary.totalHours).toBe(150);
    expect(summary.cost).toBeCloseTo(14000, 8);
    expect(reconcile(model, ALL_PERIODS).reconciles).toBe(true);
  });

  it("still recognises a priced project that nobody logged hours against", () => {
    const store = tinyStore({ timesheet: [] });
    const summary = dashboardSummary(buildModel(store), ALL_PERIODS);
    expect(summary.revenue).toBe(30000);
    expect(dataGaps(buildModel(store), ALL_PERIODS).pricedWithoutHours).toHaveLength(1);
  });
});

describe("revenue recognition", () => {
  it("spreads a project's price across the months its hours were logged", () => {
    const store = tinyStore();
    store.timesheet = store.timesheet.map((row) =>
      row.empNo === "2" ? { ...row, month: 2 as const } : row,
    );
    store.salaries = [
      ...store.salaries,
      { year: 2025, month: 2, empNo: "2", empName: "Ben", salary: 6000 },
    ];

    const model = buildModel(store);
    const january = dashboardSummary(model, { year: 2025, month: 1 });
    const february = dashboardSummary(model, { year: 2025, month: 2 });

    expect(january.revenue).toBeCloseTo(30000 * (80 / 130), 8);
    expect(february.revenue).toBeCloseTo(30000 * (50 / 130), 8);
    expect(january.revenue + february.revenue).toBeCloseTo(30000, 8);
  });
});
