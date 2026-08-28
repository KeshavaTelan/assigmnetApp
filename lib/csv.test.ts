import { describe, expect, it } from "vitest";

import { csvFilename, toCsv } from "@/lib/csv";

describe("csv", () => {
  it("writes a header row and one line per row", () => {
    expect(toCsv(["Name", "Hours"], [["Ana", 100]])).toBe("Name,Hours\r\nAna,100");
  });

  it("quotes fields containing a comma, a quote or a newline", () => {
    const csv = toCsv(
      ["Project", "Note"],
      [["Meridian, Website", 'He said "no"'], ["Two", "line\nbreak"]],
    );

    expect(csv).toContain('"Meridian, Website"');
    expect(csv).toContain('"He said ""no"""');
    expect(csv).toContain('"line\nbreak"');
  });

  it("writes an empty field for null rather than the word null", () => {
    expect(toCsv(["A", "B"], [[null, 0]])).toBe("A,B\r\n,0");
  });

  it("builds a filename from the table and the period", () => {
    expect(csvFilename("Projects", "May 2025")).toBe("projects-may-2025.csv");
    expect(csvFilename("Productivity", "All time")).toBe("productivity-all-time.csv");
  });
});
