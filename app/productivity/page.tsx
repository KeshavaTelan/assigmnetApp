import Link from "next/link";
import { Suspense } from "react";

import { EmptyRow, NoDataState } from "@/components/empty-state";
import { PageBody, PageHeader } from "@/components/page-header";
import { PeriodFilter } from "@/components/period-filter";
import { StatCard } from "@/components/stat-card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { productivityRows } from "@/lib/calc/aggregate";
import { availableMonths, availableYears, periodLabel, sum } from "@/lib/calc/model";
import { MONTH_NAMES } from "@/lib/domain/types";
import { hours, money, percent, rate } from "@/lib/format";
import { periodQuery, readPeriod } from "@/lib/period";
import { loadModelOrEmpty } from "@/lib/server/load";
import { cn } from "@/lib/utils";

export default async function ProductivityPage(props: PageProps<"/productivity">) {
  const { model, isEmpty } = await loadModelOrEmpty();
  if (isEmpty) return <NoDataState />;

  const searchParams = await props.searchParams;
  const filter = readPeriod(searchParams, model);
  const selectedDepartment =
    typeof searchParams.department === "string" ? searchParams.department : null;

  const everyone = productivityRows(model, filter);
  const departments = [...new Set(everyone.map((row) => row.department).filter(Boolean))].sort() as string[];
  const rows = selectedDepartment
    ? everyone.filter((row) => row.department === selectedDepartment)
    : everyone;

  const totalHours = sum(rows, (row) => row.totalHours);
  const billableHours = sum(rows, (row) => row.billableHours);
  const query = periodQuery(filter);

  return (
    <>
      <PageHeader
        title="Productivity"
        description={`${periodLabel(filter, MONTH_NAMES)} · billable hours as a share of everything logged`}
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
            label={selectedDepartment ? `${selectedDepartment} productivity` : "Agency productivity"}
            value={percent(totalHours > 0 ? billableHours / totalHours : null)}
            hint={`${hours(billableHours)} of ${hours(totalHours)}`}
          />
          <StatCard label="People" value={String(rows.length)} hint="With a salary or logged hours" />
          <StatCard
            label="Internal time"
            value={hours(totalHours - billableHours)}
            hint="Meetings, leave, learning, idle"
          />
          <StatCard
            label="Cost carried"
            value={money(sum(rows, (row) => row.cost))}
            hint="Charged to client work"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <DepartmentChip href={`/productivity${query}`} active={!selectedDepartment}>
            All departments
          </DepartmentChip>
          {departments.map((department) => (
            <DepartmentChip
              key={department}
              href={`/productivity${query}&department=${encodeURIComponent(department)}`}
              active={selectedDepartment === department}
            >
              {department}
            </DepartmentChip>
          ))}
        </div>

        <div className="bg-card overflow-hidden rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Person</TableHead>
                <TableHead>Department</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Billable</TableHead>
                <TableHead className="text-right">Internal</TableHead>
                <TableHead className="w-56">Productivity</TableHead>
                <TableHead className="text-right">Salary</TableHead>
                <TableHead className="text-right">Direct rate</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <EmptyRow colSpan={8}>Nobody logged hours in this period.</EmptyRow>
              ) : (
                rows.map((row) => (
                  <TableRow key={row.empNo}>
                    <TableCell>
                      <div className="font-medium">{row.empName}</div>
                      <div className="text-muted-foreground text-xs">{row.designation ?? "—"}</div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {row.department ?? <Badge variant="outline">No hours logged</Badge>}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{hours(row.totalHours)}</TableCell>
                    <TableCell className="text-right tabular-nums">{hours(row.billableHours)}</TableCell>
                    <TableCell className="text-muted-foreground text-right tabular-nums">
                      {hours(row.nonBillableHours)}
                    </TableCell>
                    <TableCell>
                      <ProductivityBar value={row.productivity} />
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {row.salary === null ? (
                        <Badge variant="outline">No salary</Badge>
                      ) : (
                        money(row.salary)
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-right tabular-nums">
                      {rate(row.salary !== null && row.totalHours > 0 ? row.salary / row.totalHours : null)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <p className="text-muted-foreground text-xs">
          Direct rate is that period&rsquo;s salary divided by every hour logged, billable or not — so
          a month spent in meetings raises the cost of the hours that were billable.
        </p>
      </PageBody>
    </>
  );
}

function DepartmentChip({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
        active
          ? "bg-primary text-primary-foreground border-primary"
          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
      )}
    >
      {children}
    </Link>
  );
}

function ProductivityBar({ value }: { value: number | null }) {
  if (value === null) {
    return <span className="text-muted-foreground text-xs">No hours logged</span>;
  }

  return (
    <div className="flex items-center gap-2.5">
      <div className="bg-internal h-2 flex-1 overflow-hidden rounded-full">
        <div className="bg-billable h-full rounded-full" style={{ width: `${value * 100}%` }} />
      </div>
      <span className="w-12 text-right text-xs tabular-nums">{percent(value, 0)}</span>
    </div>
  );
}
