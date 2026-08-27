import { MONTH_NAMES, type MonthNumber, type YearMonth } from "@/lib/domain/types";

const MONTH_LOOKUP = new Map<string, MonthNumber>();
MONTH_NAMES.forEach((name, index) => {
  const month = (index + 1) as MonthNumber;
  MONTH_LOOKUP.set(name.toLowerCase(), month);
  MONTH_LOOKUP.set(name.slice(0, 3).toLowerCase(), month);
});
MONTH_LOOKUP.set("sept", 9);

export type ParsedMonth = {
  month: MonthNumber;
  year: number | null;
};

/** Handles "January 2025", "May '25", "January", "Jan-25" and Excel date cells. */
export function parseMonth(value: unknown): ParsedMonth | null {
  if (value instanceof Date) {
    return { month: (value.getUTCMonth() + 1) as MonthNumber, year: value.getUTCFullYear() };
  }

  const raw = String(value ?? "").trim();
  if (!raw || raw === "-") return null;

  const nameMatch = raw.match(/[A-Za-z]+/);
  if (!nameMatch) return null;
  const month = MONTH_LOOKUP.get(nameMatch[0].toLowerCase());
  if (!month) return null;

  return { month, year: parseYear(raw) };
}

function parseYear(raw: string): number | null {
  const fourDigit = raw.match(/\b(19|20)\d{2}\b/);
  if (fourDigit) return Number(fourDigit[0]);

  const twoDigit = raw.match(/['\-/\s](\d{2})\b/);
  if (twoDigit) return 2000 + Number(twoDigit[1]);

  return null;
}

export function parseYearMonth(value: unknown, defaultYear?: number): YearMonth | null {
  const parsed = parseMonth(value);
  if (!parsed) return null;

  const year = parsed.year ?? defaultYear;
  if (year === undefined) return null;

  return { year, month: parsed.month };
}

export function findYearInText(text: string): number | null {
  const match = text.match(/\b(19|20)\d{2}\b/);
  return match ? Number(match[0]) : null;
}
