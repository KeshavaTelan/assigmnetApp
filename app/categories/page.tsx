import { Suspense } from "react";

import { EmptyRow, NoDataState } from "@/components/empty-state";
import { PageBody, PageHeader, SectionTitle } from "@/components/page-header";
import { PeriodFilter } from "@/components/period-filter";
import { StatCard } from "@/components/stat-card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { categoryRows } from "@/lib/calc/aggregate";
import { availableMonths, availableYears, periodLabel, sum } from "@/lib/calc/model";
import { MONTH_NAMES } from "@/lib/domain/types";
import { hours, money, percent } from "@/lib/format";
import { readPeriod } from "@/lib/period";
import { loadModelOrEmpty } from "@/lib/server/load";

export default async function CategoriesPage(props: PageProps<"/categories">) {
  const { model, isEmpty } = await loadModelOrEmpty();
  if (isEmpty) return <NoDataState />;

  const filter = readPeriod(await props.searchParams, model);
  const rows = categoryRows(model, filter);

  const billableHours = sum(rows, (row) => (row.billable ? row.hours : 0));
  const internalHours = sum(rows, (row) => (row.billable ? 0 : row.hours));
  const totalHours = billableHours + internalHours;
  const absorbed = sum(rows, (row) => (row.billable ? 0 : row.value));
  const biggestInternal = rows.find((row) => !row.billable);

  return (
    <>
      <PageHeader
        title="Categories"
        description={`${periodLabel(filter, MONTH_NAMES)} · where the time actually goes`}
        actions={
          <Suspense>
            <PeriodFilter
              years={availableYears(model)}
              months={availableMonths(model, filter.year)}
              year={filter.year}
              month={filter.month}
            />
          </Suspense>
        }
      />

      <PageBody>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Billable"
            value={hours(billableHours)}
            hint={`${percent(totalHours > 0 ? billableHours / totalHours : null)} of all hours`}
          />
          <StatCard
            label="Internal"
            value={hours(internalHours)}
            hint={`${percent(totalHours > 0 ? internalHours / totalHours : null)} of all hours`}
          />
          <StatCard
            label="Internal time, valued"
            value={money(absorbed)}
            hint="At each person's own direct rate"
          />
          <StatCard
            label="Largest internal draw"
            value={biggestInternal?.category ?? "—"}
            className="[&>div:nth-child(2)]:text-lg"
            hint={biggestInternal ? hours(biggestInternal.hours) : undefined}
          />
        </div>

        <section className="bg-card rounded-lg border p-4">
          <SectionTitle hint="share of every hour logged in the period">Hours by category</SectionTitle>
          <ul className="space-y-2.5">
            {rows.map((row) => (
              <li key={row.category} className="flex items-center gap-3">
                <span className="w-44 shrink-0 truncate text-sm">{row.category}</span>
                <div className="bg-muted h-5 min-w-0 flex-1 overflow-hidden rounded-sm">
                  <div
                    className={row.billable ? "bg-billable h-full" : "bg-internal h-full"}
                    style={{ width: `${Math.max(row.share * 100, 0.6)}%` }}
                  />
                </div>
                <span className="w-24 shrink-0 text-right text-sm tabular-nums">{hours(row.hours)}</span>
                <span className="text-muted-foreground w-14 shrink-0 text-right text-xs tabular-nums">
                  {percent(row.share, 0)}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <div className="bg-card overflow-hidden rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Category</TableHead>
                <TableHead>Treatment</TableHead>
                <TableHead className="text-right">Hours</TableHead>
                <TableHead className="text-right">Share</TableHead>
                <TableHead className="text-right">People</TableHead>
                <TableHead className="text-right">Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <EmptyRow colSpan={6}>No hours were logged in this period.</EmptyRow>
              ) : (
                rows.map((row) => (
                  <TableRow key={row.category}>
                    <TableCell className="font-medium">{row.category}</TableCell>
                    <TableCell>
                      <Badge variant={row.billable ? "secondary" : "outline"}>
                        {row.billable ? "Billable" : "Absorbed"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{hours(row.hours)}</TableCell>
                    <TableCell className="text-muted-foreground text-right tabular-nums">
                      {percent(row.share)}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-right tabular-nums">
                      {row.people}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{money(row.value)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <p className="text-muted-foreground text-xs">
          For billable categories, value is the fully-loaded cost charged to clients. For absorbed
          categories it is the same time valued at each person&rsquo;s direct rate — that money is
          already inside the indirect pool, so the two columns must not be added together.
        </p>
      </PageBody>
    </>
  );
}
