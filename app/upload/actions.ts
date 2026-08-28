"use server";

import { revalidatePath } from "next/cache";

import { DEFAULT_SETTINGS } from "@/lib/domain/types";
import { parsePrices } from "@/lib/parse/prices";
import { parseSalaries } from "@/lib/parse/salaries";
import { SheetParseError } from "@/lib/parse/sheet";
import { parseTimesheet } from "@/lib/parse/timesheet";
import { clearStore, savePrices, saveSalaries, saveSettings, saveTimesheet } from "@/lib/store/repository";
import { seedFromSampleFiles } from "@/lib/store/seed";

export type FileOutcome = {
  kind: "timesheet" | "salaries" | "prices";
  fileName: string;
  ok: boolean;
  headline: string;
  details: string[];
};

export type UploadState = {
  status: "idle" | "done";
  outcomes: FileOutcome[];
};

const LABELS = {
  timesheet: "Timesheet",
  salaries: "Salary overview",
  prices: "Project prices",
} as const;

/** Each file is handled independently so one bad workbook can't block the others. */
export async function uploadWorkbooks(_previous: UploadState, formData: FormData): Promise<UploadState> {
  const outcomes: FileOutcome[] = [];

  for (const kind of ["timesheet", "salaries", "prices"] as const) {
    const file = formData.get(kind);
    if (!(file instanceof File) || file.size === 0) continue;

    try {
      outcomes.push(await ingest(kind, file));
    } catch (error) {
      outcomes.push({
        kind,
        fileName: file.name,
        ok: false,
        headline:
          error instanceof SheetParseError
            ? error.message
            : `${LABELS[kind]} could not be read: ${(error as Error).message}`,
        details:
          error instanceof SheetParseError && error.detail?.found?.length
            ? [`Columns found: ${error.detail.found.slice(0, 12).join(", ")}`]
            : [],
      });
    }
  }

  if (outcomes.length === 0) {
    outcomes.push({
      kind: "timesheet",
      fileName: "",
      ok: false,
      headline: "Nothing to upload — choose at least one file.",
      details: [],
    });
  }

  revalidatePath("/", "layout");
  return { status: "done", outcomes };
}

async function ingest(kind: FileOutcome["kind"], file: File): Promise<FileOutcome> {
  const buffer = Buffer.from(await file.arrayBuffer());

  if (kind === "prices") {
    const parsed = await parsePrices(buffer);
    const report = await savePrices(parsed.rows);
    return {
      kind,
      fileName: file.name,
      ok: true,
      headline: `${parsed.rows.length} projects read — ${report.added} added, ${report.updated} updated.`,
      details: skippedDetails(parsed.skipped),
    };
  }

  if (kind === "timesheet") {
    const parsed = await parseTimesheet(buffer);
    const report = await saveTimesheet(parsed.rows, parsed.months);
    return {
      kind,
      fileName: file.name,
      ok: true,
      headline: `${report.added} rows loaded for ${describeMonths(report.months)}.`,
      details: [replacementNote(report), ...skippedDetails(parsed.skipped)],
    };
  }

  const parsed = await parseSalaries(buffer);
  const report = await saveSalaries(parsed.rows, parsed.months);
  return {
    kind,
    fileName: file.name,
    ok: true,
    headline: `${report.added} salary rows loaded for ${describeMonths(report.months)}.`,
    details: [replacementNote(report), ...skippedDetails(parsed.skipped)],
  };
}

function replacementNote(report: { removed: number; untouched: number }): string {
  return report.removed > 0
    ? `Replaced ${report.removed} existing rows for those months. ${report.untouched} rows for other months were left untouched.`
    : `${report.untouched} rows for other months were left untouched.`;
}

function describeMonths(months: string[]): string {
  if (months.length === 0) return "no months";
  if (months.length === 1) return months[0];
  return `${months.length} months (${months[0]} – ${months[months.length - 1]})`;
}

function skippedDetails(skipped: { row: number; reason: string }[]): string[] {
  if (skipped.length === 0) return [];
  const sample = skipped.slice(0, 3).map((entry) => `row ${entry.row}: ${entry.reason}`);
  return [
    `${skipped.length} row${skipped.length === 1 ? "" : "s"} skipped — ${sample.join("; ")}${
      skipped.length > 3 ? "; …" : ""
    }`,
  ];
}

export async function loadSampleData(): Promise<void> {
  await seedFromSampleFiles();
  revalidatePath("/", "layout");
}

export async function clearAllData(): Promise<void> {
  await clearStore();
  revalidatePath("/", "layout");
}

export async function updateAssumptions(formData: FormData): Promise<void> {
  const overhead = Number(formData.get("monthlyOverhead"));
  const categories = formData.getAll("billableCategories").map(String);

  await saveSettings({
    monthlyOverhead: Number.isFinite(overhead) && overhead >= 0 ? overhead : 0,
    // An empty billable set would divide the indirect pool by zero hours.
    billableCategories: categories.length > 0 ? categories : DEFAULT_SETTINGS.billableCategories,
  });

  revalidatePath("/", "layout");
}
