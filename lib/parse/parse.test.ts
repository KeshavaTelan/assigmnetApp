import { describe, expect, it } from "vitest";

import { parseMonth, parseYearMonth } from "@/lib/parse/months";
import { parsePricesMatrix } from "@/lib/parse/prices";
import { parseSalariesMatrix } from "@/lib/parse/salaries";
import { parseTimesheetMatrix } from "@/lib/parse/timesheet";
import { SheetParseError, type SheetMatrix } from "@/lib/parse/sheet";

describe("month parsing", () => {
  it("reads all three dialects the sheets use", () => {
    expect(parseMonth("January 2025")).toEqual({ month: 1, year: 2025 });
    expect(parseMonth("May '25")).toEqual({ month: 5, year: 2025 });
    expect(parseMonth("January")).toEqual({ month: 1, year: null });
  });

  it("absorbs abbreviations, casing and stray punctuation", () => {
    expect(parseMonth("sept-25")).toEqual({ month: 9, year: 2025 });
    expect(parseMonth("  DEC 2026 ")).toEqual({ month: 12, year: 2026 });
    expect(parseMonth(new Date(Date.UTC(2024, 6, 15)))).toEqual({ month: 7, year: 2024 });
  });

  it("returns null for blanks and placeholders rather than guessing", () => {
    expect(parseMonth("-")).toBeNull();
    expect(parseMonth("")).toBeNull();
    expect(parseMonth(null)).toBeNull();
    expect(parseMonth("Q1")).toBeNull();
  });

  it("falls back to a supplied year when the cell names only a month", () => {
    expect(parseYearMonth("March", 2025)).toEqual({ year: 2025, month: 3 });
    expect(parseYearMonth("March")).toBeNull();
  });
});

describe("timesheet parsing", () => {
  const header = [
    "Month",
    "Employee No.",
    "Employee Name",
    "Type of Expense",
    "Department",
    "Designation",
    "Category",
    "Ref Code",
    "Project (Billable) / Task (Unbillable) Name",
    "Company Name (Billable)/ Fixed Costs (Unbillable)",
    "Description",
    "Hours",
  ];

  const row = (month: string, category: string, ref: string, hours: unknown) => [
    month,
    "10201",
    "Ayesha Rahman",
    "DL",
    "Design",
    "Senior UI/UX Designer",
    category,
    ref,
    "Something",
    "Acme",
    "notes",
    hours,
  ];

  it("finds a header that isn't in row 1", () => {
    const matrix = [
      ["Timesheet 2025", null],
      [],
      header,
      row("January 2025", "Projects", "Q1", 8),
    ] as SheetMatrix;

    const result = parseTimesheetMatrix(matrix);
    expect(result.rows).toHaveLength(1);
    expect(result.months).toEqual(["2025-01"]);
  });

  it("skips unusable rows with a reason instead of dropping them silently", () => {
    const matrix = [
      header,
      row("January 2025", "Projects", "Q1", 8),
      row("not a month", "Projects", "Q1", 8),
      row("February 2025", "Projects", "Q1", "-"),
      [],
    ] as SheetMatrix;

    const result = parseTimesheetMatrix(matrix);
    expect(result.rows).toHaveLength(1);
    expect(result.skipped).toHaveLength(2);
    expect(result.skipped[1].reason).toBe("No hours logged");
  });

  it("reads hours written as text", () => {
    const matrix = [header, row("March 2025", "Projects", "Q1", "1,204.5")] as SheetMatrix;
    expect(parseTimesheetMatrix(matrix).rows[0].hours).toBe(1204.5);
  });

  it("names the missing columns when handed the wrong file", () => {
    const matrix = [["Ref Code", "Project Price"], ["Q1", 100]] as SheetMatrix;
    expect(() => parseTimesheetMatrix(matrix)).toThrow(SheetParseError);
    expect(() => parseTimesheetMatrix(matrix)).toThrow(/Month/);
  });
});

describe("salary parsing", () => {
  it("unpivots month columns and takes the year from the sheet title", () => {
    const matrix = [
      ["Salary Overview 2025 (AED)"],
      ["Employee No.", "Employee Name", "January", "February"],
      ["10201", "Ayesha Rahman", 18000, 18000],
      ["10202", "Rohit Menon", 12000, "-"],
    ] as SheetMatrix;

    const result = parseSalariesMatrix(matrix);
    expect(result.rows).toHaveLength(3);
    expect(result.months).toEqual(["2025-01", "2025-02"]);
    expect(result.rows.filter((row) => row.empNo === "10202")).toHaveLength(1);
  });

  it("refuses to guess a year it was never told", () => {
    const matrix = [
      ["Employee Name", "January"],
      ["Ayesha Rahman", 18000],
    ] as SheetMatrix;
    expect(() => parseSalariesMatrix(matrix)).toThrow(/which year/);
  });
});

describe("price parsing", () => {
  it("keeps unpriced projects out of the store so they can't read as zero revenue", () => {
    const matrix = [
      ["Ref Code", "Project (Billable) Name", "Project Price", "Sales month", "Category", "Status"],
      ["Q2025001a", "Meridian", 560000, "January '25", "Projects", "in progress"],
      ["Q2025002b", "Nameless", "-", "February '25", "Projects", "in progress"],
    ] as SheetMatrix;

    const result = parsePricesMatrix(matrix);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toMatchObject({ price: 560000, salesYear: 2025, salesMonth: 1 });
    expect(result.skipped[0].reason).toContain("Q2025002b");
  });
});
