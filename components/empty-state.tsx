import Link from "next/link";
import type { ReactNode } from "react";
import { FileSpreadsheet } from "lucide-react";

import { Button } from "@/components/ui/button";

export function NoDataState() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-6 py-24 text-center">
      <div className="bg-muted text-muted-foreground grid size-12 place-items-center rounded-full">
        <FileSpreadsheet className="size-5" />
      </div>
      <div className="space-y-1.5">
        <h2 className="font-semibold">Nothing loaded yet</h2>
        <p className="text-muted-foreground text-sm">
          Upload the timesheet, salary and project price workbooks — or load the 2025 sample year to
          see the dashboard populated.
        </p>
      </div>
      <Button asChild size="sm">
        <Link href="/upload">Go to data</Link>
      </Button>
    </div>
  );
}

export function EmptyRow({ colSpan, children }: { colSpan: number; children: ReactNode }) {
  return (
    <tr>
      <td colSpan={colSpan} className="text-muted-foreground px-3 py-10 text-center text-sm">
        {children}
      </td>
    </tr>
  );
}
