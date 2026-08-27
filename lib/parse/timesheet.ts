import type { TimesheetRow } from "@/lib/domain/types";
import { parseYearMonth } from "@/lib/parse/months";
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
import { monthKey } from "@/lib/domain/types";

export type ParseResult<T> = {
  rows: T[];
  /** `2025-05` keys covered by the file — the scope a re-upload replaces. */
  months: string[];
  skipped: { row: number; reason: string }[];
};

const REQUIRED = ["Month", "Employee Name", "Category", "Hours"];

export async function parseTimesheet(buffer: ArrayBuffer | Buffer): Promise<ParseResult<TimesheetRow>> {
  return parseTimesheetMatrix(await readSheet(buffer));
}

export function parseTimesheetMatrix(matrix: SheetMatrix): ParseResult<TimesheetRow> {
  const { index: headerIndex, columns } = findHeaderRow(matrix, REQUIRED);

  const col = {
    month: columnIndex(columns, "Month"),
    empNo: columnIndex(columns, "Employee No.", "Employee Number", "Emp No"),
    empName: columnIndex(columns, "Employee Name"),
    expenseType: columnIndex(columns, "Type of Expense"),
    department: columnIndex(columns, "Department"),
    designation: columnIndex(columns, "Designation"),
    category: columnIndex(columns, "Category"),
    refCode: columnIndex(columns, "Ref Code"),
    taskName: columnIndex(columns, "Project (Billable) / Task (Unbillable) Name", "Project / Task Name", "Project"),
    company: columnIndex(columns, "Company Name (Billable)/ Fixed Costs (Unbillable)", "Company"),
    description: columnIndex(columns, "Description"),
    hours: columnIndex(columns, "Hours"),
  };

  const rows: TimesheetRow[] = [];
  const skipped: ParseResult<TimesheetRow>["skipped"] = [];
  const months = new Set<string>();

  for (let i = headerIndex + 1; i < matrix.length; i++) {
    const row = matrix[i];
    if (isEmptyRow(row)) continue;

    const rowNumber = i + 1;
    const period = parseYearMonth(row[col.month ?? -1]);
    if (!period) {
      skipped.push({ row: rowNumber, reason: `Could not read a month from "${cellText(row, col.month) ?? "(blank)"}"` });
      continue;
    }

    const category = cellText(row, col.category);
    if (!category) {
      skipped.push({ row: rowNumber, reason: "No category" });
      continue;
    }

    const empName = cellText(row, col.empName);
    const empNo = cellText(row, col.empNo);
    if (!empName && !empNo) {
      skipped.push({ row: rowNumber, reason: "No employee" });
      continue;
    }

    const hours = cellNumber(row, col.hours);
    if (hours === null) {
      skipped.push({ row: rowNumber, reason: "No hours logged" });
      continue;
    }

    rows.push({
      ...period,
      empNo: empNo ?? `name:${empName}`,
      empName: empName ?? empNo ?? "Unknown",
      expenseType: cellText(row, col.expenseType),
      department: cellText(row, col.department),
      designation: cellText(row, col.designation),
      category,
      refCode: cellText(row, col.refCode),
      taskName: cellText(row, col.taskName),
      company: cellText(row, col.company),
      description: cellText(row, col.description),
      hours,
    });
    months.add(monthKey(period));
  }

  if (rows.length === 0) {
    throw new SheetParseError("The timesheet parsed cleanly but contained no usable rows.");
  }

  return { rows, months: [...months].sort(), skipped };
}
