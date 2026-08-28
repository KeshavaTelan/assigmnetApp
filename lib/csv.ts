export type CsvCell = string | number | null;

/**
 * RFC 4180: quote a field when it contains a comma, quote, newline or edge
 * whitespace, and double any quote inside it.
 */
function escapeCell(value: CsvCell): string {
  if (value === null || value === undefined) return "";
  const text = String(value);
  if (!/[",\r\n]/.test(text) && text.trim() === text) return text;
  return `"${text.replace(/"/g, '""')}"`;
}

export function toCsv(headers: string[], rows: CsvCell[][]): string {
  return [headers, ...rows].map((row) => row.map(escapeCell).join(",")).join("\r\n");
}

/** Excel reads a UTF-8 file as latin-1 without this. */
export const UTF8_BOM = "﻿";

export function csvFilename(name: string, period: string): string {
  const slug = `${name}-${period}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${slug}.csv`;
}
