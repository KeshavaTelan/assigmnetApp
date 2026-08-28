import { AlertTriangle } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { hours, money } from "@/lib/format";
import type { DataGaps } from "@/lib/calc/aggregate";

/** Renders nothing when the data is clean. */
export function DataGapsNotice({ gaps }: { gaps: DataGaps }) {
  const items: { text: string; detail: string }[] = [];

  if (gaps.unpricedRefCodes.length) {
    items.push({
      text: `${gaps.unpricedRefCodes.length} ref code${gaps.unpricedRefCodes.length > 1 ? "s have" : " has"} hours but no price`,
      detail: gaps.unpricedRefCodes
        .slice(0, 4)
        .map((entry) => `${entry.refCode} (${hours(entry.hours)})`)
        .join(", "),
    });
  }

  if (gaps.missingSalaries.length) {
    items.push({
      text: `${gaps.missingSalaries.length} employee${gaps.missingSalaries.length > 1 ? "s have" : " has"} hours but no salary — their cost is missing from these totals`,
      detail: gaps.missingSalaries
        .slice(0, 4)
        .map((entry) => `${entry.empName} (${hours(entry.hours)})`)
        .join(", "),
    });
  }

  if (gaps.pricedWithoutHours.length) {
    items.push({
      text: `${gaps.pricedWithoutHours.length} priced project${gaps.pricedWithoutHours.length > 1 ? "s have" : " has"} no logged hours`,
      detail: gaps.pricedWithoutHours
        .slice(0, 4)
        .map((entry) => `${entry.refCode} (${money(entry.price)})`)
        .join(", "),
    });
  }

  if (items.length === 0) return null;

  return (
    <Alert>
      <AlertTriangle />
      <AlertTitle>Gaps in the source data</AlertTitle>
      <AlertDescription>
        <ul className="space-y-1">
          {items.map((item) => (
            <li key={item.text}>
              <span className="text-foreground">{item.text}</span>
              <span className="text-muted-foreground"> — {item.detail}</span>
            </li>
          ))}
        </ul>
      </AlertDescription>
    </Alert>
  );
}
