import { promises as fs } from "node:fs";
import path from "node:path";

import {
  DEFAULT_SETTINGS,
  monthKey,
  type MonthNumber,
  type ProjectPrice,
  type SalaryRow,
  type Settings,
  type Store,
  type TimesheetRow,
} from "@/lib/domain/types";

const DATA_DIR = path.join(process.cwd(), "data");
const STORE_PATH = path.join(DATA_DIR, "store.json");

export function emptyStore(): Store {
  return { version: 1, settings: { ...DEFAULT_SETTINGS }, timesheet: [], salaries: [], prices: [] };
}

export async function readStore(): Promise<Store> {
  try {
    const raw = await fs.readFile(STORE_PATH, "utf8");
    const parsed = JSON.parse(raw) as Partial<Store>;
    return {
      version: 1,
      settings: { ...DEFAULT_SETTINGS, ...parsed.settings },
      timesheet: parsed.timesheet ?? [],
      salaries: parsed.salaries ?? [],
      prices: parsed.prices ?? [],
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return emptyStore();
    throw error;
  }
}

export async function writeStore(store: Store): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  // Write then rename, so an interrupted save can't truncate the store.
  const temp = `${STORE_PATH}.${process.pid}.tmp`;
  await fs.writeFile(temp, JSON.stringify(store, null, 2), "utf8");
  await fs.rename(temp, STORE_PATH);
}

export type ReplaceReport = {
  months: string[];
  removed: number;
  added: number;
  untouched: number;
};

/** Deletes and reinserts only the months the incoming file covers. */
export function replaceMonths<T extends { year: number; month: MonthNumber }>(
  existing: T[],
  incoming: T[],
  months: string[],
): { rows: T[]; report: ReplaceReport } {
  const scope = new Set(months);
  const kept = existing.filter((row) => !scope.has(monthKey(row)));

  return {
    rows: [...kept, ...incoming],
    report: {
      months: [...scope].sort(),
      removed: existing.length - kept.length,
      added: incoming.length,
      untouched: kept.length,
    },
  };
}

/** Prices are keyed by ref code rather than by month. */
export function upsertPrices(
  existing: ProjectPrice[],
  incoming: ProjectPrice[],
): { rows: ProjectPrice[]; report: { added: number; updated: number; untouched: number } } {
  const byRef = new Map(existing.map((price) => [price.refCode, price]));
  let updated = 0;
  let added = 0;

  for (const price of incoming) {
    if (byRef.has(price.refCode)) updated++;
    else added++;
    byRef.set(price.refCode, price);
  }

  return {
    rows: [...byRef.values()],
    report: { added, updated, untouched: existing.length - updated },
  };
}

export async function saveTimesheet(rows: TimesheetRow[], months: string[]): Promise<ReplaceReport> {
  const store = await readStore();
  const { rows: next, report } = replaceMonths(store.timesheet, rows, months);
  await writeStore({ ...store, timesheet: next });
  return report;
}

export async function saveSalaries(rows: SalaryRow[], months: string[]): Promise<ReplaceReport> {
  const store = await readStore();
  const { rows: next, report } = replaceMonths(store.salaries, rows, months);
  await writeStore({ ...store, salaries: next });
  return report;
}

export async function savePrices(rows: ProjectPrice[]) {
  const store = await readStore();
  const { rows: next, report } = upsertPrices(store.prices, rows);
  await writeStore({ ...store, prices: next });
  return report;
}

export async function saveSettings(settings: Partial<Settings>): Promise<Settings> {
  const store = await readStore();
  const next = { ...store.settings, ...settings };
  await writeStore({ ...store, settings: next });
  return next;
}

export async function clearStore(): Promise<void> {
  await writeStore(emptyStore());
}

export function storeIsEmpty(store: Store): boolean {
  return store.timesheet.length === 0 && store.salaries.length === 0 && store.prices.length === 0;
}
