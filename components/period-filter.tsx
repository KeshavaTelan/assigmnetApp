"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MONTH_NAMES, type MonthNumber } from "@/lib/domain/types";

export function PeriodFilter({
  years,
  months,
  year,
  month,
}: {
  years: number[];
  months: MonthNumber[];
  year: number | null;
  month: MonthNumber | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const update = (changes: { year?: string; month?: string | null }) => {
    const params = new URLSearchParams(searchParams);
    if (changes.year !== undefined) {
      params.set("year", changes.year);
      if (changes.year === "all") params.delete("month");
    }
    if (changes.month !== undefined) {
      if (changes.month === null) params.delete("month");
      else params.set("month", changes.month);
    }
    startTransition(() => router.push(`${pathname}?${params.toString()}`, { scroll: false }));
  };

  return (
    <div className="flex items-center gap-2" data-pending={isPending ? "" : undefined}>
      <Select value={year === null ? "all" : String(year)} onValueChange={(value) => update({ year: value })}>
        <SelectTrigger size="sm" className="w-[110px]" aria-label="Year">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {years.map((option) => (
            <SelectItem key={option} value={String(option)}>
              {option}
            </SelectItem>
          ))}
          <SelectItem value="all">All years</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={month === null ? "all" : String(month)}
        onValueChange={(value) => update({ month: value === "all" ? null : value })}
        disabled={year === null}
      >
        <SelectTrigger size="sm" className="w-[150px]" aria-label="Month">
          <SelectValue placeholder="Full year" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Full year</SelectItem>
          {months.map((option) => (
            <SelectItem key={option} value={String(option)}>
              {MONTH_NAMES[option - 1]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
