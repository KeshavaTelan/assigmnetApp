import { monthKey, type SalaryRow } from "@/lib/domain/types";
import { findYearInText, parseMonth } from "@/lib/parse/months";
import {
  cellNumber,
  cellText,
  columnIndex,
  findHeaderRow,
  isEmptyRow,
  readSheet,
  SheetParseError,
  type SheetMatrix,
} from "@/lib/parse/sheet";
import type { ParseResult } from "@/lib/parse/timesheet";

/** Unpivots the wide sheet (one column per month) into one row per person per month. */

const REQUIRED = ["Employee Name"];

export async function parseSalaries(
  buffer: ArrayBuffer | Buffer,
  fallbackYear?: number,
): Promise<ParseResult<SalaryRow>> {
  return parseSalariesMatrix(await readSheet(buffer), fallbackYear);
}

export function parseSalariesMatrix(matrix: SheetMatrix, fallbackYear?: number): ParseResult<SalaryRow> {
  const { index: headerIndex, columns } = findHeaderRow(matrix, REQUIRED);
  const headerRow = matrix[headerIndex];

  const nameCol = columnIndex(columns, "Employee Name");
  const empNoCol = columnIndex(columns, "Employee No.", "Employee Number", "Emp No");

  const monthColumns: { index: number; month: number; year: number | null }[] = [];
  headerRow.forEach((cell, index) => {
    if (index === nameCol || index === empNoCol) return;
    const parsed = parseMonth(cell);
    if (parsed) monthColumns.push({ index, month: parsed.month, year: parsed.year });
  });

  if (monthColumns.length === 0) {
    throw new SheetParseError(
      "No month columns found in the salary sheet — expected columns named January through December.",
      { found: headerRow.filter(Boolean).map(String) },
    );
  }

  const year = resolveYear(matrix, headerIndex, monthColumns, fallbackYear);
  if (year === null) {
    throw new SheetParseError(
      "Could not work out which year this salary sheet covers. Add the year to the sheet title (e.g. \"Salary Overview 2025\") or to the month headers.",
    );
  }

  const rows: SalaryRow[] = [];
  const skipped: ParseResult<SalaryRow>["skipped"] = [];
  const months = new Set<string>();

  for (let i = headerIndex + 1; i < matrix.length; i++) {
    const row = matrix[i];
    if (isEmptyRow(row)) continue;

    const empName = cellText(row, nameCol);
    const empNo = cellText(row, empNoCol);
    if (!empName && !empNo) {
      skipped.push({ row: i + 1, reason: "No employee" });
      continue;
    }

    let monthsForPerson = 0;
    for (const column of monthColumns) {
      // A blank month means "not on payroll", not a salary of zero.
      const salary = cellNumber(row, column.index);
      if (salary === null) continue;

      const period = { year: column.year ?? year, month: column.month as SalaryRow["month"] };
      rows.push({
        ...period,
        empNo: empNo ?? `name:${empName}`,
        empName: empName ?? empNo ?? "Unknown",
        salary,
      });
      months.add(monthKey(period));
      monthsForPerson++;
    }

    if (monthsForPerson === 0) {
      skipped.push({ row: i + 1, reason: `No salary figures for ${empName ?? empNo}` });
    }
  }

  if (rows.length === 0) {
    throw new SheetParseError("The salary sheet parsed cleanly but contained no salary figures.");
  }

  return { rows, months: [...months].sort(), skipped };
}

function resolveYear(
  matrix: SheetMatrix,
  headerIndex: number,
  monthColumns: { year: number | null }[],
  fallbackYear?: number,
): number | null {
  const fromHeader = monthColumns.find((column) => column.year !== null)?.year;
  if (fromHeader) return fromHeader;

  for (let i = 0; i <= headerIndex; i++) {
    for (const cell of matrix[i] ?? []) {
      if (cell === null) continue;
      const found = findYearInText(String(cell));
      if (found) return found;
    }
  }

  return fallbackYear ?? null;
}
