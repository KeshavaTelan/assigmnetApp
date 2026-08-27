import { monthKey, type ProjectPrice } from "@/lib/domain/types";
import { parseMonth } from "@/lib/parse/months";
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

const REQUIRED = ["Ref Code", "Project Price"];

export async function parsePrices(buffer: ArrayBuffer | Buffer): Promise<ParseResult<ProjectPrice>> {
  return parsePricesMatrix(await readSheet(buffer));
}

export function parsePricesMatrix(matrix: SheetMatrix): ParseResult<ProjectPrice> {
  const { index: headerIndex, columns } = findHeaderRow(matrix, REQUIRED);

  const col = {
    refCode: columnIndex(columns, "Ref Code"),
    name: columnIndex(columns, "Project (Billable) Name", "Project Name", "Project"),
    price: columnIndex(columns, "Project Price", "Price"),
    salesMonth: columnIndex(columns, "Sales month", "Sales Month"),
    category: columnIndex(columns, "Category"),
    status: columnIndex(columns, "Status"),
  };

  const rows: ProjectPrice[] = [];
  const skipped: ParseResult<ProjectPrice>["skipped"] = [];
  const months = new Set<string>();

  for (let i = headerIndex + 1; i < matrix.length; i++) {
    const row = matrix[i];
    if (isEmptyRow(row)) continue;

    const refCode = cellText(row, col.refCode);
    if (!refCode) {
      skipped.push({ row: i + 1, reason: "No ref code — nothing to join hours to" });
      continue;
    }

    const price = cellNumber(row, col.price);
    if (price === null) {
      // Kept out of the store so it reads as "price unknown", not revenue of zero.
      skipped.push({ row: i + 1, reason: `No price for ${refCode}` });
      continue;
    }

    const sales = parseMonth(row[col.salesMonth ?? -1]);
    rows.push({
      refCode,
      name: cellText(row, col.name) ?? refCode,
      price,
      salesYear: sales?.year ?? null,
      salesMonth: sales ? (sales.month as ProjectPrice["salesMonth"]) : null,
      category: cellText(row, col.category),
      status: cellText(row, col.status),
    });

    if (sales?.year) months.add(monthKey({ year: sales.year, month: sales.month }));
  }

  if (rows.length === 0) {
    throw new SheetParseError("The project price sheet parsed cleanly but contained no priced projects.");
  }

  return { rows, months: [...months].sort(), skipped };
}
