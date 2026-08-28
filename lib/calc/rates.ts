import {
  monthKey,
  type MonthNumber,
  type SalaryRow,
  type Settings,
  type Store,
  type TimesheetRow,
} from "@/lib/domain/types";

export type EmployeeMonthRates = {
  empNo: string;
  empName: string;
  salary: number | null;
  totalHours: number;
  billableHours: number;
  nonBillableHours: number;
  directRate: number | null;
};

export type MonthRates = {
  key: string;
  year: number;
  month: MonthNumber;

  totalHours: number;
  billableHours: number;
  nonBillableHours: number;
  costableBillableHours: number;

  salaryTotal: number;
  overhead: number;

  indirectPool: number;
  indirectRate: number;
  poolBreakdown: {
    unloggedSalaries: number;
    nonBillableTime: number;
    overhead: number;
  };

  employees: Map<string, EmployeeMonthRates>;

  employeesMissingSalary: { empNo: string; empName: string; hours: number }[];
  employeesWithoutHours: { empNo: string; empName: string; salary: number }[];
};

export type RateIndex = Map<string, MonthRates>;

export function isBillable(category: string, settings: Settings): boolean {
  return settings.billableCategories.includes(category);
}

export function buildRateIndex(store: Pick<Store, "timesheet" | "salaries" | "settings">): RateIndex {
  const index: RateIndex = new Map();

  for (const key of collectMonths(store.timesheet, store.salaries)) {
    index.set(key, buildMonthRates(key, store));
  }

  return index;
}

function collectMonths(timesheet: TimesheetRow[], salaries: SalaryRow[]): string[] {
  const months = new Set<string>();
  for (const row of timesheet) months.add(monthKey(row));
  for (const row of salaries) months.add(monthKey(row));
  return [...months].sort();
}

function buildMonthRates(
  key: string,
  store: Pick<Store, "timesheet" | "salaries" | "settings">,
): MonthRates {
  const [year, month] = key.split("-").map(Number) as [number, MonthNumber];
  const timesheet = store.timesheet.filter((row) => monthKey(row) === key);
  const salaries = store.salaries.filter((row) => monthKey(row) === key);

  const salaryByEmp = new Map(salaries.map((row) => [row.empNo, row]));
  const employees = new Map<string, EmployeeMonthRates>();

  for (const row of timesheet) {
    const employee = employees.get(row.empNo) ?? {
      empNo: row.empNo,
      empName: row.empName,
      salary: salaryByEmp.get(row.empNo)?.salary ?? null,
      totalHours: 0,
      billableHours: 0,
      nonBillableHours: 0,
      directRate: null,
    };

    employee.totalHours += row.hours;
    if (isBillable(row.category, store.settings)) employee.billableHours += row.hours;
    else employee.nonBillableHours += row.hours;

    employees.set(row.empNo, employee);
  }

  for (const employee of employees.values()) {
    employee.directRate =
      employee.salary !== null && employee.totalHours > 0 ? employee.salary / employee.totalHours : null;
  }

  let unloggedSalaries = 0;
  const employeesWithoutHours: MonthRates["employeesWithoutHours"] = [];
  for (const salary of salaries) {
    if (employees.has(salary.empNo)) continue;
    unloggedSalaries += salary.salary;
    employeesWithoutHours.push({ empNo: salary.empNo, empName: salary.empName, salary: salary.salary });
  }

  let nonBillableTime = 0;
  let costableBillableHours = 0;
  const employeesMissingSalary: MonthRates["employeesMissingSalary"] = [];
  for (const employee of employees.values()) {
    if (employee.directRate === null) {
      employeesMissingSalary.push({
        empNo: employee.empNo,
        empName: employee.empName,
        hours: employee.totalHours,
      });
      continue;
    }
    nonBillableTime += employee.nonBillableHours * employee.directRate;
    costableBillableHours += employee.billableHours;
  }

  const overhead = store.settings.monthlyOverhead;
  const indirectPool = unloggedSalaries + nonBillableTime + overhead;

  const totals = sumHours(employees);
  const indirectRate = costableBillableHours > 0 ? indirectPool / costableBillableHours : 0;

  return {
    key,
    year,
    month,
    ...totals,
    costableBillableHours,
    salaryTotal: salaries.reduce((sum, row) => sum + row.salary, 0),
    overhead,
    indirectPool,
    indirectRate,
    poolBreakdown: { unloggedSalaries, nonBillableTime, overhead },
    employees,
    employeesMissingSalary,
    employeesWithoutHours,
  };
}

function sumHours(employees: Map<string, EmployeeMonthRates>) {
  let totalHours = 0;
  let billableHours = 0;
  let nonBillableHours = 0;
  for (const employee of employees.values()) {
    totalHours += employee.totalHours;
    billableHours += employee.billableHours;
    nonBillableHours += employee.nonBillableHours;
  }
  return { totalHours, billableHours, nonBillableHours };
}

// Non-billable rows return 0: their value is already inside the indirect pool.
export function rowCost(row: TimesheetRow, rates: RateIndex, settings: Settings): number {
  if (!isBillable(row.category, settings)) return 0;

  const month = rates.get(monthKey(row));
  const directRate = month?.employees.get(row.empNo)?.directRate;
  if (!month || directRate == null) return 0;

  return row.hours * (directRate + month.indirectRate);
}

// Reporting only — never added to company cost.
export function rowAbsorbedValue(row: TimesheetRow, rates: RateIndex, settings: Settings): number {
  if (isBillable(row.category, settings)) return 0;
  const directRate = rates.get(monthKey(row))?.employees.get(row.empNo)?.directRate;
  return directRate == null ? 0 : row.hours * directRate;
}
