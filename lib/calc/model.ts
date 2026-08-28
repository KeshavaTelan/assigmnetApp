import { monthKey, type MonthNumber, type Store, type TimesheetRow } from "@/lib/domain/types";
import { buildRateIndex, isBillable, rowAbsorbedValue, rowCost, type RateIndex } from "@/lib/calc/rates";

export type CostedRow = TimesheetRow & {
  billable: boolean;
  cost: number;
  absorbedValue: number;
};

export type Model = {
  store: Store;
  rates: RateIndex;
  rows: CostedRow[];
};

// Rates are built for every whole month before any period filter is applied.
export function buildModel(store: Store): Model {
  const rates = buildRateIndex(store);
  const rows = store.timesheet.map<CostedRow>((row) => ({
    ...row,
    billable: isBillable(row.category, store.settings),
    cost: rowCost(row, rates, store.settings),
    absorbedValue: rowAbsorbedValue(row, rates, store.settings),
  }));

  return { store, rates, rows };
}

/** `year: null` means every year; `month: null` means the whole year. */
export type PeriodFilter = {
  year: number | null;
  month: MonthNumber | null;
};

export const ALL_PERIODS: PeriodFilter = { year: null, month: null };

export function matchesPeriod(row: { year: number; month: number }, filter: PeriodFilter): boolean {
  if (filter.year !== null && row.year !== filter.year) return false;
  if (filter.month !== null && row.month !== filter.month) return false;
  return true;
}

export function filterRows(model: Model, filter: PeriodFilter): CostedRow[] {
  return model.rows.filter((row) => matchesPeriod(row, filter));
}

export function monthsInPeriod(model: Model, filter: PeriodFilter) {
  return [...model.rates.values()]
    .filter((month) => matchesPeriod(month, filter))
    .sort((a, b) => a.key.localeCompare(b.key));
}

export function availableYears(model: Model): number[] {
  const years = new Set<number>();
  for (const month of model.rates.values()) years.add(month.year);
  return [...years].sort((a, b) => b - a);
}

export function availableMonths(model: Model, year: number | null): MonthNumber[] {
  const months = new Set<MonthNumber>();
  for (const month of model.rates.values()) {
    if (year === null || month.year === year) months.add(month.month);
  }
  return [...months].sort((a, b) => a - b);
}

export function periodLabel(filter: PeriodFilter, monthNames: readonly string[]): string {
  if (filter.year === null) return "All time";
  if (filter.month === null) return String(filter.year);
  return `${monthNames[filter.month - 1]} ${filter.year}`;
}

export function sum<T>(items: T[], pick: (item: T) => number): number {
  return items.reduce((total, item) => total + pick(item), 0);
}

export function groupBy<T>(items: T[], key: (item: T) => string): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const group = groups.get(key(item));
    if (group) group.push(item);
    else groups.set(key(item), [item]);
  }
  return groups;
}

export { monthKey };
