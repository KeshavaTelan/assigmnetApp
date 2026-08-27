import ExcelJS from "exceljs";

export type CellValue = string | number | Date | null;
export type SheetMatrix = CellValue[][];

export class SheetParseError extends Error {
  constructor(
    message: string,
    readonly detail?: { expected?: string[]; found?: string[] },
  ) {
    super(message);
    this.name = "SheetParseError";
  }
}

export async function readSheet(buffer: ArrayBuffer | Buffer): Promise<SheetMatrix> {
  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(buffer as ExcelJS.Buffer);
  } catch {
    throw new SheetParseError(
      "That file could not be opened as an .xlsx workbook. Export it from Excel or Google Sheets as .xlsx and try again.",
    );
  }

  const worksheet = workbook.worksheets[0];
  if (!worksheet) throw new SheetParseError("The workbook has no worksheets.");

  const matrix: SheetMatrix = [];
  worksheet.eachRow({ includeEmpty: true }, (row) => {
    // ExcelJS row.values is 1-indexed with a hole at [0].
    const values = Array.isArray(row.values) ? row.values.slice(1) : [];
    matrix.push(values.map(normaliseCell));
  });

  return matrix;
}

// ExcelJS returns objects for formula, hyperlink and rich-text cells.
function normaliseCell(value: unknown): CellValue {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number" || typeof value === "string") return blankToNull(value);
  if (value instanceof Date) return value;

  if (typeof value === "object") {
    const cell = value as Record<string, unknown>;
    if ("result" in cell) return normaliseCell(cell.result);
    if ("text" in cell) return normaliseCell(cell.text);
    if ("richText" in cell && Array.isArray(cell.richText)) {
      return blankToNull(cell.richText.map((part) => String((part as { text: string }).text)).join(""));
    }
    if ("error" in cell) return null;
  }

  return blankToNull(String(value));
}

function blankToNull(value: string | number): CellValue {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const trimmed = value.trim();
  if (!trimmed || trimmed === "-" || trimmed === "–" || trimmed === "—") return null;
  if (/^n\/?a$/i.test(trimmed)) return null;
  return trimmed;
}

/** Scores the first `searchDepth` rows against the columns we need. */
export function findHeaderRow(
  matrix: SheetMatrix,
  required: string[],
  searchDepth = 15,
): { index: number; columns: Map<string, number> } {
  let best: { index: number; columns: Map<string, number>; score: number } | null = null;

  for (let i = 0; i < Math.min(matrix.length, searchDepth); i++) {
    const columns = mapColumns(matrix[i]);
    const score = required.filter((name) => columns.has(normaliseHeader(name))).length;
    if (!best || score > best.score) best = { index: i, columns, score };
    if (score === required.length) break;
  }

  if (!best || best.score < required.length) {
    const found = best ? [...best.columns.keys()] : [];
    throw new SheetParseError(
      `This doesn't look like the expected sheet — missing column${
        required.length > 1 ? "s" : ""
      }: ${required.filter((name) => !best?.columns.has(normaliseHeader(name))).join(", ")}.`,
      { expected: required, found },
    );
  }

  return { index: best.index, columns: best.columns };
}

function mapColumns(row: CellValue[] | undefined): Map<string, number> {
  const columns = new Map<string, number>();
  (row ?? []).forEach((cell, index) => {
    if (cell === null) return;
    const key = normaliseHeader(String(cell));
    if (key && !columns.has(key)) columns.set(key, index);
  });
  return columns;
}

export function normaliseHeader(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function columnIndex(columns: Map<string, number>, ...aliases: string[]): number | null {
  for (const alias of aliases) {
    const index = columns.get(normaliseHeader(alias));
    if (index !== undefined) return index;
  }
  // "Project (Billable) Name" should still match "Project Name".
  for (const alias of aliases) {
    const key = normaliseHeader(alias);
    for (const [header, index] of columns) {
      if (header.startsWith(key) || key.startsWith(header)) return index;
    }
  }
  return null;
}

export function cellText(row: CellValue[], index: number | null): string | null {
  if (index === null) return null;
  const value = row[index];
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value.toISOString();
  return String(value).trim() || null;
}

export function cellNumber(row: CellValue[], index: number | null): number | null {
  if (index === null) return null;
  const value = row[index];
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (value instanceof Date) return null;

  const cleaned = String(value).replace(/[^0-9.\-]/g, "");
  if (!cleaned || cleaned === "-" || cleaned === ".") return null;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

export function isEmptyRow(row: CellValue[] | undefined): boolean {
  return !row || row.every((cell) => cell === null);
}
