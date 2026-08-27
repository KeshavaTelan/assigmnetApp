/** 1 = January … 12 = December. */
export type MonthNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

export type YearMonth = {
  year: number;
  month: MonthNumber;
};

/** One row per person, per task, per month. */
export type TimesheetRow = YearMonth & {
  empNo: string;
  empName: string;
  /** DL / IDL. Informational — the cost model keys off category, not this. */
  expenseType: string | null;
  department: string | null;
  designation: string | null;
  category: string;
  /** Non-billable rows repeat the category here rather than naming a project. */
  refCode: string | null;
  taskName: string | null;
  company: string | null;
  description: string | null;
  hours: number;
};

export type SalaryRow = YearMonth & {
  empNo: string;
  empName: string;
  salary: number;
};

export type ProjectPrice = {
  refCode: string;
  name: string;
  price: number;
  salesYear: number | null;
  salesMonth: MonthNumber | null;
  category: string | null;
  status: string | null;
};

export type Settings = {
  /** Everything not listed here is internal time the agency absorbs. */
  billableCategories: string[];
  monthlyOverhead: number;
};

export type Store = {
  version: 1;
  settings: Settings;
  timesheet: TimesheetRow[];
  salaries: SalaryRow[];
  prices: ProjectPrice[];
};

export const DEFAULT_SETTINGS: Settings = {
  billableCategories: ["Projects", "Enhancements", "Hosting"],
  monthlyOverhead: 0,
};

export const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

export function monthName(month: MonthNumber): string {
  return MONTH_NAMES[month - 1];
}

/** `2025-03` — sortable and comparable. */
export function monthKey(ym: YearMonth): string {
  return `${ym.year}-${String(ym.month).padStart(2, "0")}`;
}

export function shortMonthLabel(ym: YearMonth): string {
  return `${MONTH_NAMES[ym.month - 1].slice(0, 3)} ${String(ym.year).slice(2)}`;
}
