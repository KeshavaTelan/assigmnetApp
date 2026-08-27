import { describe, expect, it } from "vitest";

import { replaceMonths, upsertPrices } from "@/lib/store/repository";
import type { MonthNumber, ProjectPrice } from "@/lib/domain/types";

describe("re-upload", () => {
  const row = (month: number, hours: number) => ({ year: 2025, month: month as MonthNumber, hours });

  it("replaces only the months the incoming file covers", () => {
    const existing = [row(1, 10), row(2, 20), row(3, 30)];
    const incoming = [row(2, 25), row(2, 5)];

    const { rows, report } = replaceMonths(existing, incoming, ["2025-02"]);

    expect(rows).toHaveLength(4);
    expect(rows.filter((entry) => entry.month === 2)).toEqual(incoming);
    expect(rows.filter((entry) => entry.month === 1)).toEqual([row(1, 10)]);
    expect(report).toEqual({ months: ["2025-02"], removed: 1, added: 2, untouched: 2 });
  });

  it("does not duplicate when the same file is uploaded twice", () => {
    const existing = [row(1, 10), row(2, 20)];
    const once = replaceMonths(existing, existing, ["2025-01", "2025-02"]).rows;
    const twice = replaceMonths(once, existing, ["2025-01", "2025-02"]).rows;
    expect(twice).toHaveLength(2);
  });

  it("leaves other years alone", () => {
    const existing = [{ year: 2024, month: 2 as MonthNumber, hours: 1 }, row(2, 20)];
    const { rows } = replaceMonths(existing, [row(2, 99)], ["2025-02"]);
    expect(rows).toContainEqual({ year: 2024, month: 2, hours: 1 });
  });
});

describe("price upsert", () => {
  const price = (refCode: string, value: number): ProjectPrice => ({
    refCode,
    name: refCode,
    price: value,
    salesYear: 2025,
    salesMonth: 1,
    category: "Projects",
    status: "in progress",
  });

  it("updates by ref code rather than appending a second row for the same project", () => {
    const { rows, report } = upsertPrices([price("A", 100), price("B", 200)], [price("A", 150), price("C", 300)]);

    expect(rows).toHaveLength(3);
    expect(rows.find((row) => row.refCode === "A")!.price).toBe(150);
    expect(report).toEqual({ added: 1, updated: 1, untouched: 1 });
  });
});
