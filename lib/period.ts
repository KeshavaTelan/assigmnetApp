import { availableYears, type Model, type PeriodFilter } from "@/lib/calc/model";
import type { MonthNumber } from "@/lib/domain/types";

/**
 * ?year=2025&month=5 → May 2025, ?year=2025 → the year, ?year=all → everything.
 * With nothing set, defaults to the most recent year that has data.
 */

export type SearchParams = Record<string, string | string[] | undefined>;

export function readPeriod(params: SearchParams, model: Model): PeriodFilter {
  const years = availableYears(model);
  const rawYear = single(params.year);
  const rawMonth = single(params.month);

  const year =
    rawYear === "all" ? null : rawYear && years.includes(Number(rawYear)) ? Number(rawYear) : (years[0] ?? null);

  const monthNumber = Number(rawMonth);
  const month =
    year !== null && monthNumber >= 1 && monthNumber <= 12 ? (monthNumber as MonthNumber) : null;

  return { year, month };
}

function single(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function periodQuery(filter: PeriodFilter): string {
  const params = new URLSearchParams();
  params.set("year", filter.year === null ? "all" : String(filter.year));
  if (filter.month !== null) params.set("month", String(filter.month));
  return `?${params.toString()}`;
}
