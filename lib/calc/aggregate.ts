import type { MonthNumber, ProjectPrice } from "@/lib/domain/types";
import {
  filterRows,
  groupBy,
  matchesPeriod,
  monthsInPeriod,
  sum,
  type CostedRow,
  type Model,
  type PeriodFilter,
} from "@/lib/calc/model";

/* ------------------------------------------------------------------ revenue */

export type ProjectHours = {
  refCode: string;
  totalHours: number;
  totalCost: number;
};

export function projectHoursIndex(model: Model): Map<string, ProjectHours> {
  const index = new Map<string, ProjectHours>();
  for (const row of model.rows) {
    if (!row.billable || !row.refCode) continue;
    const entry = index.get(row.refCode) ?? { refCode: row.refCode, totalHours: 0, totalCost: 0 };
    entry.totalHours += row.hours;
    entry.totalCost += row.cost;
    index.set(row.refCode, entry);
  }
  return index;
}

function revenueInPeriod(
  price: ProjectPrice,
  lifetime: ProjectHours | undefined,
  hoursInPeriod: number,
  filter: PeriodFilter,
): number {
  if (lifetime && lifetime.totalHours > 0) {
    return price.price * (hoursInPeriod / lifetime.totalHours);
  }

  // Nothing to pro-rate against, so fall back to the sales month.
  if (price.salesYear === null || price.salesMonth === null) {
    return filter.year === null ? price.price : 0;
  }
  return matchesPeriod({ year: price.salesYear, month: price.salesMonth }, filter) ? price.price : 0;
}

/* ----------------------------------------------------------------- projects */

export type ProjectRollup = {
  refCode: string;
  name: string;
  category: string | null;
  status: string | null;
  price: number | null;
  hours: number;
  cost: number;
  revenue: number;
  profit: number;
  marginPct: number | null;
  hasHours: boolean;
};

export function projectRollups(model: Model, filter: PeriodFilter): ProjectRollup[] {
  const lifetime = projectHoursIndex(model);
  const priceByRef = new Map(model.store.prices.map((price) => [price.refCode, price]));
  const periodRows = filterRows(model, filter).filter((row) => row.billable && row.refCode);
  const byRef = groupBy(periodRows, (row) => row.refCode!);

  const refCodes = new Set<string>([...byRef.keys(), ...priceByRef.keys()]);
  const rollups: ProjectRollup[] = [];

  for (const refCode of refCodes) {
    const rows = byRef.get(refCode) ?? [];
    const price = priceByRef.get(refCode);
    const hours = sum(rows, (row) => row.hours);
    const cost = sum(rows, (row) => row.cost);
    const revenue = price ? revenueInPeriod(price, lifetime.get(refCode), hours, filter) : 0;

    if (hours === 0 && revenue === 0) continue;

    rollups.push({
      refCode,
      name: price?.name ?? rows[0]?.taskName ?? refCode,
      category: price?.category ?? rows[0]?.category ?? null,
      status: price?.status ?? null,
      price: price?.price ?? null,
      hours,
      cost,
      revenue,
      profit: revenue - cost,
      marginPct: price && revenue > 0 ? (revenue - cost) / revenue : null,
      hasHours: hours > 0,
    });
  }

  return rollups.sort((a, b) => b.revenue - a.revenue);
}

/* ---------------------------------------------------------------- dashboard */

export type MonthTrendPoint = {
  key: string;
  year: number;
  month: MonthNumber;
  hours: number;
  billableHours: number;
  cost: number;
  revenue: number;
  margin: number;
  marginPct: number | null;
  indirectRate: number;
};

export type DashboardSummary = {
  totalHours: number;
  billableHours: number;
  nonBillableHours: number;
  productivity: number | null;
  cost: number;
  revenue: number;
  margin: number;
  marginPct: number | null;
  salaryTotal: number;
  overhead: number;
  trend: MonthTrendPoint[];
  projects: ProjectRollup[];
};

export function dashboardSummary(model: Model, filter: PeriodFilter): DashboardSummary {
  const rows = filterRows(model, filter);
  const months = monthsInPeriod(model, filter);
  const projects = projectRollups(model, filter);

  const totalHours = sum(rows, (row) => row.hours);
  const billableHours = sum(rows, (row) => (row.billable ? row.hours : 0));
  const cost = sum(rows, (row) => row.cost);
  const revenue = sum(projects, (project) => project.revenue);

  return {
    totalHours,
    billableHours,
    nonBillableHours: totalHours - billableHours,
    productivity: totalHours > 0 ? billableHours / totalHours : null,
    cost,
    revenue,
    margin: revenue - cost,
    marginPct: revenue > 0 ? (revenue - cost) / revenue : null,
    salaryTotal: sum(months, (month) => month.salaryTotal),
    overhead: sum(months, (month) => month.overhead),
    trend: months.map((month) => {
      const monthFilter: PeriodFilter = { year: month.year, month: month.month };
      const monthRows = filterRows(model, monthFilter);
      const monthRevenue = sum(projectRollups(model, monthFilter), (project) => project.revenue);
      const monthCost = sum(monthRows, (row) => row.cost);
      return {
        key: month.key,
        year: month.year,
        month: month.month,
        hours: month.totalHours,
        billableHours: month.billableHours,
        cost: monthCost,
        revenue: monthRevenue,
        margin: monthRevenue - monthCost,
        marginPct: monthRevenue > 0 ? (monthRevenue - monthCost) / monthRevenue : null,
        indirectRate: month.indirectRate,
      };
    }),
    projects,
  };
}

/* ------------------------------------------------------------- project page */

export type EmployeeContribution = {
  empNo: string;
  empName: string;
  department: string | null;
  designation: string | null;
  hours: number;
  cost: number;
  revenueShare: number;
  profit: number;
  profitabilityPct: number | null;
};

export type DepartmentContribution = {
  department: string;
  hours: number;
  cost: number;
  share: number;
};

export type ProjectDetail = {
  refCode: string;
  name: string;
  category: string | null;
  status: string | null;
  price: number | null;
  salesYear: number | null;
  salesMonth: MonthNumber | null;
  hours: number;
  cost: number;
  profit: number | null;
  marginPct: number | null;
  employees: EmployeeContribution[];
  departments: DepartmentContribution[];
  trend: { key: string; year: number; month: MonthNumber; hours: number; cost: number }[];
};

// Unfiltered by period: a project's margin is a property of the whole project.
export function projectDetail(model: Model, refCode: string): ProjectDetail | null {
  const price = model.store.prices.find((item) => item.refCode === refCode) ?? null;
  const rows = model.rows.filter((row) => row.billable && row.refCode === refCode);
  if (!price && rows.length === 0) return null;

  const hours = sum(rows, (row) => row.hours);
  const cost = sum(rows, (row) => row.cost);

  const employees = [...groupBy(rows, (row) => row.empNo).values()]
    .map<EmployeeContribution>((group) => {
      const employeeHours = sum(group, (row) => row.hours);
      const employeeCost = sum(group, (row) => row.cost);
      const revenueShare = price && hours > 0 ? price.price * (employeeHours / hours) : 0;
      return {
        empNo: group[0].empNo,
        empName: group[0].empName,
        department: group[0].department,
        designation: group[0].designation,
        hours: employeeHours,
        cost: employeeCost,
        revenueShare,
        profit: revenueShare - employeeCost,
        profitabilityPct: revenueShare > 0 ? (revenueShare - employeeCost) / revenueShare : null,
      };
    })
    .sort((a, b) => b.hours - a.hours);

  const departments = [...groupBy(rows, (row) => row.department ?? "Unassigned").values()]
    .map<DepartmentContribution>((group) => {
      const departmentHours = sum(group, (row) => row.hours);
      return {
        department: group[0].department ?? "Unassigned",
        hours: departmentHours,
        cost: sum(group, (row) => row.cost),
        share: hours > 0 ? departmentHours / hours : 0,
      };
    })
    .sort((a, b) => b.hours - a.hours);

  const trend = [...groupBy(rows, (row) => `${row.year}-${String(row.month).padStart(2, "0")}`).entries()]
    .map(([key, group]) => ({
      key,
      year: group[0].year,
      month: group[0].month,
      hours: sum(group, (row) => row.hours),
      cost: sum(group, (row) => row.cost),
    }))
    .sort((a, b) => a.key.localeCompare(b.key));

  return {
    refCode,
    name: price?.name ?? rows[0]?.taskName ?? refCode,
    category: price?.category ?? rows[0]?.category ?? null,
    status: price?.status ?? null,
    price: price?.price ?? null,
    salesYear: price?.salesYear ?? null,
    salesMonth: price?.salesMonth ?? null,
    hours,
    cost,
    profit: price ? price.price - cost : null,
    marginPct: price && price.price > 0 ? (price.price - cost) / price.price : null,
    employees,
    departments,
    trend,
  };
}

/* -------------------------------------------------------------- productivity */

export type ProductivityRow = {
  empNo: string;
  empName: string;
  department: string | null;
  designation: string | null;
  totalHours: number;
  billableHours: number;
  nonBillableHours: number;
  productivity: number | null;
  cost: number;
  salary: number | null;
};

export function productivityRows(model: Model, filter: PeriodFilter): ProductivityRow[] {
  const rows = filterRows(model, filter);
  const salary = new Map<string, number>();
  for (const row of model.store.salaries) {
    if (!matchesPeriod(row, filter)) continue;
    salary.set(row.empNo, (salary.get(row.empNo) ?? 0) + row.salary);
  }

  const result = [...groupBy(rows, (row) => row.empNo).values()].map<ProductivityRow>((group) => {
    const totalHours = sum(group, (row) => row.hours);
    const billableHours = sum(group, (row) => (row.billable ? row.hours : 0));
    return {
      empNo: group[0].empNo,
      empName: group[0].empName,
      department: group[0].department,
      designation: group[0].designation,
      totalHours,
      billableHours,
      nonBillableHours: totalHours - billableHours,
      productivity: totalHours > 0 ? billableHours / totalHours : null,
      cost: sum(group, (row) => row.cost),
      salary: salary.get(group[0].empNo) ?? null,
    };
  });

  // Payroll with no hours still belongs on the page.
  for (const row of model.store.salaries) {
    if (!matchesPeriod(row, filter)) continue;
    if (result.some((entry) => entry.empNo === row.empNo)) continue;
    result.push({
      empNo: row.empNo,
      empName: row.empName,
      department: null,
      designation: null,
      totalHours: 0,
      billableHours: 0,
      nonBillableHours: 0,
      productivity: null,
      cost: 0,
      salary: salary.get(row.empNo) ?? null,
    });
  }

  return result.sort((a, b) => (b.productivity ?? -1) - (a.productivity ?? -1));
}

/* ---------------------------------------------------------------- categories */

export type CategoryRow = {
  category: string;
  billable: boolean;
  hours: number;
  share: number;
  value: number;
  people: number;
};

export function categoryRows(model: Model, filter: PeriodFilter): CategoryRow[] {
  const rows = filterRows(model, filter);
  const totalHours = sum(rows, (row) => row.hours);

  return [...groupBy(rows, (row) => row.category).values()]
    .map<CategoryRow>((group) => {
      const hours = sum(group, (row) => row.hours);
      return {
        category: group[0].category,
        billable: group[0].billable,
        hours,
        share: totalHours > 0 ? hours / totalHours : 0,
        value: sum(group, (row) => (row.billable ? row.cost : row.absorbedValue)),
        people: new Set(group.map((row) => row.empNo)).size,
      };
    })
    .sort((a, b) => b.hours - a.hours);
}

/* --------------------------------------------------------------- data gaps */

export type DataGaps = {
  unpricedRefCodes: { refCode: string; name: string; hours: number }[];
  missingSalaries: { empNo: string; empName: string; months: string[]; hours: number }[];
  pricedWithoutHours: { refCode: string; name: string; price: number }[];
  staffWithoutHours: { empNo: string; empName: string; months: string[] }[];
};

export function dataGaps(model: Model, filter: PeriodFilter): DataGaps {
  const rows = filterRows(model, filter);
  const priced = new Set(model.store.prices.map((price) => price.refCode));

  const unpriced = new Map<string, { refCode: string; name: string; hours: number }>();
  for (const row of rows) {
    if (!row.billable || !row.refCode || priced.has(row.refCode)) continue;
    const entry = unpriced.get(row.refCode) ?? {
      refCode: row.refCode,
      name: row.taskName ?? row.refCode,
      hours: 0,
    };
    entry.hours += row.hours;
    unpriced.set(row.refCode, entry);
  }

  const months = monthsInPeriod(model, filter);

  const missing = new Map<string, { empNo: string; empName: string; months: string[]; hours: number }>();
  const withoutHours = new Map<string, { empNo: string; empName: string; months: string[] }>();
  for (const month of months) {
    for (const employee of month.employeesMissingSalary) {
      const entry = missing.get(employee.empNo) ?? {
        empNo: employee.empNo,
        empName: employee.empName,
        months: [],
        hours: 0,
      };
      entry.months.push(month.key);
      entry.hours += employee.hours;
      missing.set(employee.empNo, entry);
    }
    for (const employee of month.employeesWithoutHours) {
      const entry = withoutHours.get(employee.empNo) ?? {
        empNo: employee.empNo,
        empName: employee.empName,
        months: [],
      };
      entry.months.push(month.key);
      withoutHours.set(employee.empNo, entry);
    }
  }

  const hoursByRef = projectHoursIndex(model);

  return {
    unpricedRefCodes: [...unpriced.values()].sort((a, b) => b.hours - a.hours),
    missingSalaries: [...missing.values()].sort((a, b) => b.hours - a.hours),
    pricedWithoutHours: model.store.prices
      .filter((price) => (hoursByRef.get(price.refCode)?.totalHours ?? 0) === 0)
      .map((price) => ({ refCode: price.refCode, name: price.name, price: price.price })),
    staffWithoutHours: [...withoutHours.values()],
  };
}

export function hasGaps(gaps: DataGaps): boolean {
  return (
    gaps.unpricedRefCodes.length > 0 ||
    gaps.missingSalaries.length > 0 ||
    gaps.pricedWithoutHours.length > 0
  );
}

/* ------------------------------------------------------------- reconciliation */

export type Reconciliation = {
  months: {
    key: string;
    year: number;
    month: MonthNumber;
    salaryTotal: number;
    cost: number;
    difference: number;
  }[];
  salaryTotal: number;
  cost: number;
  overhead: number;
  difference: number;
  reconciles: boolean;
};

export function reconcile(model: Model, filter: PeriodFilter): Reconciliation {
  const months = monthsInPeriod(model, filter).map((month) => {
    const cost = sum(
      filterRows(model, { year: month.year, month: month.month }),
      (row) => row.cost,
    );
    return {
      key: month.key,
      year: month.year,
      month: month.month,
      salaryTotal: month.salaryTotal,
      cost,
      difference: cost - month.salaryTotal - month.overhead,
    };
  });

  const salaryTotal = sum(months, (month) => month.salaryTotal);
  const cost = sum(months, (month) => month.cost);
  const overhead = sum(monthsInPeriod(model, filter), (month) => month.overhead);
  const difference = cost - salaryTotal - overhead;

  return {
    months,
    salaryTotal,
    cost,
    overhead,
    difference,
    reconciles: Math.abs(difference) < 0.01,
  };
}

export type { CostedRow, PeriodFilter };
