import Link from "next/link";
import { Suspense } from "react";

import { CsvExportButton } from "@/components/csv-export-button";
import { EmptyRow, NoDataState } from "@/components/empty-state";
import { PageBody, PageHeader } from "@/components/page-header";
import { PeriodFilter } from "@/components/period-filter";
import { StatCard } from "@/components/stat-card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { departmentRollups } from "@/lib/calc/aggregate";
import { availableMonths, availableYears, periodLabel, sum } from "@/lib/calc/model";
import { csvFilename } from "@/lib/csv";
import { MONTH_NAMES } from "@/lib/domain/types";
import { hours, money, percent, rate } from "@/lib/format";
import { periodQuery, readPeriod } from "@/lib/period";
import { loadModelOrEmpty } from "@/lib/server/load";

export default async function DepartmentsPage(props: PageProps<"/departments">) {
  const { model, isEmpty } = await loadModelOrEmpty();
  if (isEmpty) return <NoDataState />;

  const filter = readPeriod(await props.searchParams, model);
  const label = periodLabel(filter, MONTH_NAMES);
  const departments = departmentRollups(model, filter);
  const query = periodQuery(filter);

  const totalHours = sum(departments, (row) => row.hours);
  const billableHours = sum(departments, (row) => row.billableHours);
  const totalCost = sum(departments, (row) => row.cost);
  const busiest = departments[0];

  return (
    <>
      <PageHeader
        title="Departments"
        description={`${label} · ${departments.length} departments, ${hours(totalHours)} logged`}
        actions={
          <>
            <CsvExportButton
              filename={csvFilename("departments", label)}
              headers={[
                "Department",
                "People",
                "Total hours",
                "Billable hours",
                "Internal hours",
                "Productivity",
                "Cost (AED)",
                "Cost per billable hour (AED)",
              ]}
              rows={departments.map((row) => [
                row.department,
                row.people,
                round(row.hours),
                round(row.billableHours),
                round(row.nonBillableHours),
                row.productivity === null ? null : round(row.productivity * 100),
                round(row.cost, 2),
                row.costPerBillableHour === null ? null : round(row.costPerBillableHour, 2),
              ])}
            />
            <Suspense>
              <PeriodFilter
                years={availableYears(model)}
                months={availableMonths(model, filter.year)}
                year={filter.year}
                month={filter.month}
              />
            </Suspense>
          </>
        }
      />

      <PageBody>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Departments" value={String(departments.length)} hint="With logged hours" />
          <StatCard
            label="Billable share"
            value={percent(totalHours > 0 ? billableHours / totalHours : null)}
            hint={`${hours(billableHours)} of ${hours(totalHours)}`}
          />
          <StatCard label="Cost" value={money(totalCost)} hint="Charged to client work" />
          <StatCard
            label="Busiest"
            value={busiest?.department ?? "—"}
            className="[&>div:nth-child(2)]:text-lg"
            hint={busiest ? `${hours(busiest.hours)} · ${percent(busiest.share, 0)} of all time` : undefined}
          />
        </div>

        <div className="bg-card overflow-hidden rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Department</TableHead>
                <TableHead className="text-right">People</TableHead>
                <TableHead className="text-right">Hours</TableHead>
                <TableHead className="text-right">Billable</TableHead>
                <TableHead className="text-right">Internal</TableHead>
                <TableHead className="w-44">Productivity</TableHead>
                <TableHead className="text-right">Cost</TableHead>
                <TableHead className="text-right">Per billable hour</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {departments.length === 0 ? (
                <EmptyRow colSpan={8}>No hours were logged in this period.</EmptyRow>
              ) : (
                departments.map((row) => (
                  <TableRow key={row.department}>
                    <TableCell>
                      <Link
                        href={`/departments/${encodeURIComponent(row.department)}${query}`}
                        className="font-medium underline-offset-4 hover:underline"
                      >
                        {row.department}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-right tabular-nums">
                      {row.people}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{hours(row.hours)}</TableCell>
                    <TableCell className="text-right tabular-nums">{hours(row.billableHours)}</TableCell>
                    <TableCell className="text-muted-foreground text-right tabular-nums">
                      {hours(row.nonBillableHours)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <div className="bg-internal h-2 flex-1 overflow-hidden rounded-full">
                          <div
                            className="bg-billable h-full rounded-full"
                            style={{ width: `${(row.productivity ?? 0) * 100}%` }}
                          />
                        </div>
                        <span className="w-11 text-right text-xs tabular-nums">
                          {percent(row.productivity, 0)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{money(row.cost)}</TableCell>
                    <TableCell className="text-muted-foreground text-right tabular-nums">
                      {rate(row.costPerBillableHour)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <p className="text-muted-foreground text-xs">
          Cost per billable hour is what an hour of this department&rsquo;s client work actually costs
          once its own non-billable time and its share of the agency&rsquo;s overhead are carried.
        </p>
      </PageBody>
    </>
  );
}

function round(value: number, digits = 1): number {
  return Number(value.toFixed(digits));
}
