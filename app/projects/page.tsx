import Link from "next/link";
import { Suspense } from "react";

import { EmptyRow, NoDataState } from "@/components/empty-state";
import { PageBody, PageHeader } from "@/components/page-header";
import { PeriodFilter } from "@/components/period-filter";
import { StatCard } from "@/components/stat-card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { projectRollups } from "@/lib/calc/aggregate";
import { availableMonths, availableYears, periodLabel, sum } from "@/lib/calc/model";
import { MONTH_NAMES } from "@/lib/domain/types";
import { hours, marginTone, money, percent, projectLabel } from "@/lib/format";
import { periodQuery, readPeriod } from "@/lib/period";
import { loadModelOrEmpty } from "@/lib/server/load";

export default async function ProjectsPage(props: PageProps<"/projects">) {
  const { model, isEmpty } = await loadModelOrEmpty();
  if (isEmpty) return <NoDataState />;

  const filter = readPeriod(await props.searchParams, model);
  const projects = projectRollups(model, filter);
  const query = periodQuery(filter);

  const priced = projects.filter((project) => project.price !== null);
  const revenue = sum(priced, (project) => project.revenue);
  const cost = sum(projects, (project) => project.cost);
  const thin = priced.filter((project) => (project.marginPct ?? 1) < 0.2).length;

  return (
    <>
      <PageHeader
        title="Projects"
        description={`${periodLabel(filter, MONTH_NAMES)} · ${projects.length} project${projects.length === 1 ? "" : "s"} with activity`}
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
          <StatCard label="Revenue" value={money(revenue)} hint={`${priced.length} priced`} />
          <StatCard label="Cost" value={money(cost)} hint="Fully loaded" />
          <StatCard
            label="Margin"
            value={money(revenue - cost)}
            tone={marginTone(revenue > 0 ? (revenue - cost) / revenue : null)}
            hint={percent(revenue > 0 ? (revenue - cost) / revenue : null)}
          />
          <StatCard
            label="Thin margins"
            value={String(thin)}
            hint="Projects under 20% margin"
            tone={thin > 0 ? "text-amber-600 dark:text-amber-500" : undefined}
          />
        </div>

        <div className="bg-card overflow-hidden rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Project</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Hours</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
                <TableHead className="text-right">Cost</TableHead>
                <TableHead className="text-right">Profit</TableHead>
                <TableHead className="w-20 text-right">Margin</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projects.length === 0 ? (
                <EmptyRow colSpan={9}>
                  No hours were logged against any project in this period.
                </EmptyRow>
              ) : (
                projects.map((project) => (
                  <TableRow key={project.refCode}>
                    <TableCell className="max-w-80">
                      <Link
                        href={`/projects/${encodeURIComponent(project.refCode)}${query}`}
                        title={project.name}
                        className="font-medium underline-offset-4 hover:underline"
                      >
                        {projectLabel(project.name)}
                      </Link>
                      <div className="text-muted-foreground mt-0.5 font-mono text-xs">
                        {project.refCode}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {project.category ?? "—"}
                    </TableCell>
                    <TableCell>
                      {project.status ? (
                        <Badge variant={project.status === "completed" ? "secondary" : "outline"}>
                          {project.status}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{hours(project.hours)}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {project.price === null ? (
                        <Badge variant="outline">Not priced</Badge>
                      ) : (
                        money(project.price)
                      )}
                    </TableCell>
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
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <p className="text-muted-foreground text-xs">
          Revenue is a project&rsquo;s price earned in proportion to the hours logged in this period.
          Over a project&rsquo;s life it sums back to the full price.
        </p>
      </PageBody>
    </>
  );
}
