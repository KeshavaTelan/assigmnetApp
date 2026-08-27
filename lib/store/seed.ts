import { promises as fs } from "node:fs";
import path from "node:path";

import { parsePrices } from "@/lib/parse/prices";
import { parseSalaries } from "@/lib/parse/salaries";
import { parseTimesheet } from "@/lib/parse/timesheet";
import { emptyStore, writeStore } from "@/lib/store/repository";

export const SAMPLE_FILES = {
  timesheet: "timesheet-2025.xlsx",
  salaries: "salaries-2025.xlsx",
  prices: "project-prices-2025.xlsx",
} as const;

export type SeedSummary = {
  timesheetRows: number;
  salaryRows: number;
  priceRows: number;
  months: string[];
};

export async function seedFromSampleFiles(): Promise<SeedSummary> {
  const dir = path.join(process.cwd(), "public");
  const read = (file: string) => fs.readFile(path.join(dir, file));

  const [timesheet, salaries, prices] = await Promise.all([
    read(SAMPLE_FILES.timesheet).then(parseTimesheet),
    read(SAMPLE_FILES.salaries).then(parseSalaries),
    read(SAMPLE_FILES.prices).then(parsePrices),
  ]);

  // A seed is a full reset, not a merge.
  await writeStore({
    ...emptyStore(),
    timesheet: timesheet.rows,
    salaries: salaries.rows,
    prices: prices.rows,
  });

  return {
    timesheetRows: timesheet.rows.length,
    salaryRows: salaries.rows.length,
    priceRows: prices.rows.length,
    months: timesheet.months,
  };
}
