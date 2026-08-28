import Link from "next/link";
import { Suspense } from "react";

import { MarginTrend } from "@/components/charts/margin-trend";
import { DataGapsNotice } from "@/components/data-gaps-notice";
import { NoDataState } from "@/components/empty-state";
import { PageBody, PageHeader, SectionTitle } from "@/components/page-header";
import { PeriodFilter } from "@/components/period-filter";
import { StatCard, StatGrid } from "@/components/stat-card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { dashboardSummary, dataGaps, reconcile } from "@/lib/calc/aggregate";
import { availableMonths, availableYears, periodLabel } from "@/lib/calc/model";
import { MONTH_NAMES, shortMonthLabel } from "@/lib/domain/types";
import { hours, marginTone, money, moneyExact, percent, projectLabel } from "@/lib/format";
import { periodQuery, readPeriod } from "@/lib/period";
import { loadModelOrEmpty } from "@/lib/server/load";

export default async function DashboardPage(props: PageProps<"/">) {
  const { model, isEmpty } = await loadModelOrEmpty();
  if (isEmpty) return <NoDataState />;

  const filter = readPeriod(await props.searchParams, model);
  const summary = dashboardSummary(model, filter);
  const gaps = dataGaps(model, filter);
  const check = reconcile(model, filter);
  const label = periodLabel(filter, MONTH_NAMES);

  const topProjects = [...summary.projects].sort((a, b) => b.revenue - a.revenue).slice(0, 6);

  return (
    <>
      <PageHeader
        title="Margin dashboard"
        description={`${label} · ${hours(summary.totalHours)} logged across ${summary.projects.length} project${summary.projects.length === 1 ? "" : "s"}`}
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
        <DataGapsNotice gaps={gaps} />

        <StatGrid>
          <StatCard
            label="Revenue"
            value={money(summary.revenue)}
            hint="Project prices, earned as hours are logged"
          />
          <StatCard
            label="Cost"
            value={money(summary.cost)}
            hint={`Salaries ${money(summary.salaryTotal)}${summary.overhead ? ` + overhead ${money(summary.overhead)}` : ""}`}
          />
          <StatCard
            label="Margin"
            value={money(summary.margin)}
            tone={marginTone(summary.marginPct)}
            hint={`${percent(summary.marginPct)} of revenue`}
          />
          <StatCard
            label="Hours"
            value={hours(summary.totalHours)}
            hint={`${hours(summary.billableHours)} billable`}
          />
          <StatCard
            label="Productivity"
            value={percent(summary.productivity)}
            hint={`${hours(summary.nonBillableHours)} internal`}
          />
        </StatGrid>

        <section className="bg-card rounded-lg border p-4">
          <SectionTitle hint="Revenue and cost by month, margin on the right axis">
            How the year is tracking
          </SectionTitle>
          {summary.trend.length > 1 ? (
            <MarginTrend
              data={summary.trend.map((point) => ({
                label: shortMonthLabel(point),
                revenue: point.revenue,
                cost: point.cost,
                marginPct: point.marginPct,
              }))}
            />
          ) : (
            <p className="text-muted-foreground py-10 text-center text-sm">
              A single month has nothing to trend against. Pick a full year to see the shape.
            </p>
          )}
        </section>

        <section className="bg-card overflow-hidden rounded-lg border">
          <div className="px-4 pt-4">
            <SectionTitle hint={<Link href={`/projects${periodQuery(filter)}`} className="hover:text-foreground underline-offset-4 hover:underline">All projects</Link>}>
              Where the money came from
            </SectionTitle>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Project</TableHead>
                <TableHead className="text-right">Hours</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
                <TableHead className="text-right">Cost</TableHead>
                <TableHead className="text-right">Margin</TableHead>
                <TableHead className="w-24 text-right">%</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topProjects.map((project) => (
                <TableRow key={project.refCode}>
                  <TableCell className="max-w-88">
                    <Link
                      href={`/projects/${encodeURIComponent(project.refCode)}${periodQuery(filter)}`}
                      title={project.name}
                      className="font-medium underline-offset-4 hover:underline"
                    >
                      {projectLabel(project.name)}
                    </Link>
                    <div className="text-muted-foreground mt-0.5 flex items-center gap-2 text-xs">
                      <span className="font-mono">{project.refCode}</span>
                      {project.price === null ? <Badge variant="outline">No price</Badge> : null}
                    </div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{hours(project.hours)}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {project.price === null ? "—" : money(project.revenue)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{money(project.cost)}</TableCell>
                  <TableCell className={`text-right tabular-nums ${marginTone(project.marginPct)}`}>
                    {project.price === null ? "—" : money(project.profit)}
                  </TableCell>
                  <TableCell className={`text-right tabular-nums ${marginTone(project.marginPct)}`}>
                    {percent(project.marginPct)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </section>

        <p className="text-muted-foreground text-xs">
          Cost reconciliation for {label}: total cost {moneyExact(check.cost)} against salaries{" "}
          {moneyExact(check.salaryTotal)}
          {check.overhead ? ` plus overhead ${moneyExact(check.overhead)}` : ""} —{" "}
          {check.reconciles ? "balanced to the dirham." : `off by ${moneyExact(check.difference)}.`}
        </p>
      </PageBody>
    </>
  );
}
