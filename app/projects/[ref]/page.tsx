import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { PageBody, PageHeader, SectionTitle } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { projectDetail } from "@/lib/calc/aggregate";
import { monthName, shortMonthLabel, type MonthNumber } from "@/lib/domain/types";
import { hours, marginTone, money, percent, projectLabel, rate } from "@/lib/format";
import { loadModel } from "@/lib/server/load";

export default async function ProjectPage(props: PageProps<"/projects/[ref]">) {
  const { ref } = await props.params;
  const model = await loadModel();
  const project = projectDetail(model, decodeURIComponent(ref));
  if (!project) notFound();

  const search = new URLSearchParams(
    Object.entries(await props.searchParams).flatMap(([key, value]) =>
      typeof value === "string" ? [[key, value] as [string, string]] : [],
    ),
  ).toString();

  const blended = project.hours > 0 ? project.cost / project.hours : null;

  return (
    <>
      <PageHeader
        title={projectLabel(project.name)}
        description={
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="font-mono">{project.refCode}</span>
            {project.category ? <>· {project.category}</> : null}
            {project.salesMonth ? (
              <>· sold {monthName(project.salesMonth as MonthNumber)} {project.salesYear}</>
            ) : null}
            {project.status ? (
              <Badge variant={project.status === "completed" ? "secondary" : "outline"}>
                {project.status}
              </Badge>
            ) : null}
          </span>
        }
        actions={
          <Link
            href={`/projects${search ? `?${search}` : ""}`}
            className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 text-sm"
          >
            <ArrowLeft className="size-4" />
            All projects
          </Link>
        }
      />

      <PageBody>
        {project.price === null ? (
          <Alert>
            <AlertTitle>No price on file for {project.refCode}</AlertTitle>
            <AlertDescription>
              {hours(project.hours)} have been logged against this ref code, so we know what it cost.
              Until it appears in the project price sheet its revenue and margin are unknown — not
              zero.
            </AlertDescription>
          </Alert>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <StatCard label="Price" value={money(project.price)} hint="Sold for" />
          <StatCard label="Cost" value={money(project.cost)} hint={`${hours(project.hours)} logged`} />
          <StatCard
            label="Profit"
            value={money(project.profit)}
            tone={marginTone(project.marginPct)}
            hint="Price less fully-loaded cost"
          />
          <StatCard
            label="Margin"
            value={percent(project.marginPct)}
            tone={marginTone(project.marginPct)}
            hint="Profit ÷ price"
          />
          <StatCard label="Blended rate" value={rate(blended)} hint="Cost per hour on this project" />
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
          <section className="bg-card rounded-lg border p-4">
            <SectionTitle hint="share of hours">Hours by department</SectionTitle>
            {project.departments.length === 0 ? (
              <p className="text-muted-foreground py-6 text-sm">No hours logged yet.</p>
            ) : (
              <ul className="space-y-3">
                {project.departments.map((department) => (
                  <li key={department.department}>
                    <div className="flex items-baseline justify-between gap-3 text-sm">
                      <Link
                        href={`/productivity?department=${encodeURIComponent(department.department)}`}
                        className="font-medium underline-offset-4 hover:underline"
                      >
                        {department.department}
                      </Link>
                      <span className="tabular-nums">{hours(department.hours)}</span>
                    </div>
                    <div className="mt-1.5 flex items-center gap-2">
                      <div className="bg-muted h-1.5 flex-1 overflow-hidden rounded-full">
                        <div
                          className="bg-billable h-full rounded-full"
                          style={{ width: `${Math.max(department.share * 100, 1.5)}%` }}
                        />
                      </div>
                      <span className="text-muted-foreground w-24 text-right text-xs tabular-nums">
                        {money(department.cost)}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="bg-card rounded-lg border p-4">
            <SectionTitle hint="hours logged per month">Effort over time</SectionTitle>
            {project.trend.length === 0 ? (
              <p className="text-muted-foreground py-6 text-sm">No hours logged yet.</p>
            ) : (
              <MonthlyEffort trend={project.trend} />
            )}
          </section>
        </div>

        <section className="bg-card overflow-hidden rounded-lg border">
          <div className="px-4 pt-4">
            <SectionTitle hint="revenue share = price × (their hours ÷ project hours)">
              Who worked on it
            </SectionTitle>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Person</TableHead>
                <TableHead>Department</TableHead>
                <TableHead className="text-right">Hours</TableHead>
                <TableHead className="text-right">Share</TableHead>
                <TableHead className="text-right">Revenue share</TableHead>
                <TableHead className="text-right">Cost</TableHead>
                <TableHead className="text-right">Profit</TableHead>
                <TableHead className="w-20 text-right">Margin</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {project.employees.map((employee) => (
                <TableRow key={employee.empNo}>
                  <TableCell>
                    <div className="font-medium">{employee.empName}</div>
                    <div className="text-muted-foreground text-xs">{employee.designation ?? "—"}</div>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {employee.department ?? "—"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{hours(employee.hours)}</TableCell>
                  <TableCell className="text-muted-foreground text-right tabular-nums">
                    {percent(project.hours > 0 ? employee.hours / project.hours : null, 0)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {project.price === null ? "—" : money(employee.revenueShare)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{money(employee.cost)}</TableCell>
                  <TableCell
                    className={`text-right tabular-nums ${marginTone(employee.profitabilityPct)}`}
                  >
                    {project.price === null ? "—" : money(employee.profit)}
                  </TableCell>
                  <TableCell
                    className={`text-right tabular-nums ${marginTone(employee.profitabilityPct)}`}
                  >
                    {percent(employee.profitabilityPct)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </section>

        <p className="text-muted-foreground text-xs">
          This page shows the project&rsquo;s whole life, not the dashboard period. Cost is each
          person&rsquo;s hours at their own direct rate for the month plus that month&rsquo;s indirect
          rate.
        </p>
      </PageBody>
    </>
  );
}

function MonthlyEffort({
  trend,
}: {
  trend: { key: string; year: number; month: MonthNumber; hours: number; cost: number }[];
}) {
  const peak = Math.max(...trend.map((point) => point.hours));

  return (
    <div className="flex h-[190px] items-end gap-1.5">
      {trend.map((point) => (
        <div key={point.key} className="group flex h-full min-w-0 flex-1 flex-col justify-end gap-1.5">
          <div
            className="bg-billable/85 group-hover:bg-billable w-full rounded-sm transition-colors"
            style={{ height: `${Math.max((point.hours / peak) * 100, 2)}%` }}
            title={`${shortMonthLabel(point)} — ${hours(point.hours)}, ${money(point.cost)}`}
          />
          <span className="text-muted-foreground truncate text-center text-[10px]">
            {shortMonthLabel(point).slice(0, 3)}
          </span>
        </div>
      ))}
    </div>
  );
}
