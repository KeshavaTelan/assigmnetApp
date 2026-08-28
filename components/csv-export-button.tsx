"use client";

import { useState } from "react";
import { Check, Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import { toCsv, UTF8_BOM, type CsvCell } from "@/lib/csv";

/**
 * Rows are built on the server and passed as plain arrays, so the export always
 * matches the table it sits above — there is no second query that could drift.
 */
export function CsvExportButton({
  filename,
  headers,
  rows,
  label = "Export CSV",
}: {
  filename: string;
  headers: string[];
  rows: CsvCell[][];
  label?: string;
}) {
  const [done, setDone] = useState(false);

  const download = () => {
    const blob = new Blob([UTF8_BOM + toCsv(headers, rows)], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);

    setDone(true);
    setTimeout(() => setDone(false), 2000);
  };

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      onClick={download}
      disabled={rows.length === 0}
      title={`${rows.length} row${rows.length === 1 ? "" : "s"}`}
    >
      {done ? <Check className="size-4" /> : <Download className="size-4" />}
      {done ? "Downloaded" : label}
    </Button>
  );
}
