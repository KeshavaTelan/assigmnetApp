import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { CsvExportButton } from "@/components/csv-export-button";
import { PageBody, PageHeader, SectionTitle } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { departmentDetail } from "@/lib/calc/aggregate";
import { periodLabel } from "@/lib/calc/model";
import { csvFilename } from "@/lib/csv";
import { MONTH_NAMES } from "@/lib/domain/types";
import { hours, money, percent, projectLabel, rate } from "@/lib/format";
import { periodQuery, readPeriod } from "@/lib/period";
import { loadModel } from "@/lib/server/load";

export default async function DepartmentPage(props: PageProps<"/departments/[name]">) {
  const { name } = await props.params;
  const model = await loadModel();

  const filter = readPeriod(await props.searchParams, model);
  const department = departmentDetail(model, filter, decodeURIComponent(name));
  if (!department) notFound();

  const label = periodLabel(filter, MONTH_NAMES);
  const query = periodQuery(filter);

  return (
    <>
      <PageHeader
        title={department.department}
        description={`${label} · ${department.people} people · ${hours(department.hours)} logged`}
        actions={
          <>
            <CsvExportButton
              filename={csvFilename(`${department.department}-people`, label)}
              headers={[
                "Employee No.",
                "Name",
                "Designation",
                "Total hours",
                "Billable hours",
                "Internal hours",
                "Productivity",
                "Cost (AED)",
                "Salary (AED)",
              ]}
              rows={department.members.map((member) => [
                member.empNo,
                member.empName,
                member.designation,
                round(member.totalHours),
                round(member.billableHours),
                round(member.nonBillableHours),
                member.productivity === null ? null : round(member.productivity * 100),
                round(member.cost, 2),
                member.salary === null ? null : round(member.salary, 2),
              ])}
            />
            <Link
              href={`/departments${query}`}
              className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 text-sm"
            >
              <ArrowLeft className="size-4" />
              All departments
            </Link>
          </>
        }
      />

      <PageBody>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <StatCard label="Hours" value={hours(department.hours)} hint={`${percent(department.share, 0)} of the agency`} />
          <StatCard label="Billable" value={hours(department.billableHours)} hint={`${hours(department.nonBillableHours)} internal`} />
          <StatCard label="Productivity" value={percent(department.productivity)} hint="Billable ÷ total" />
          <StatCard label="Cost" value={money(department.cost)} hint="Charged to client work" />
          <StatCard label="Per billable hour" value={rate(department.costPerBillableHour)} hint="Fully loaded" />
        </div>

        <section className="bg-card overflow-hidden rounded-lg border">
          <div className="px-4 pt-4">
            <SectionTitle hint="hours and cost of every person in the department">
              Who&rsquo;s in {department.department}
            </SectionTitle>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Person</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Billable</TableHead>
                <TableHead className="text-right">Internal</TableHead>
                <TableHead className="w-44">Productivity</TableHead>
                <TableHead className="text-right">Salary</TableHead>
                <TableHead className="text-right">Cost</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {department.members.map((member) => (
                <TableRow key={member.empNo}>
                  <TableCell>
                    <div className="font-medium">{member.empName}</div>
                    <div className="text-muted-foreground text-xs">{member.designation ?? "—"}</div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{hours(member.totalHours)}</TableCell>
                  <TableCell className="text-right tabular-nums">{hours(member.billableHours)}</TableCell>
                  <TableCell className="text-muted-foreground text-right tabular-nums">
                    {hours(member.nonBillableHours)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <div className="bg-internal h-2 flex-1 overflow-hidden rounded-full">
                        <div
                          className="bg-billable h-full rounded-full"
                          style={{ width: `${(member.productivity ?? 0) * 100}%` }}
                        />
                      </div>
                      <span className="w-11 text-right text-xs tabular-nums">
                        {percent(member.productivity, 0)}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {member.salary === null ? <Badge variant="outline">No salary</Badge> : money(member.salary)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{money(member.cost)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </section>

        <section className="bg-card overflow-hidden rounded-lg border">
          <div className="px-4 pt-4">
            <SectionTitle hint="billable work this department contributed to">
              What they worked on
            </SectionTitle>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Project</TableHead>
                <TableHead className="text-right">Hours</TableHead>
                <TableHead className="text-right">Share of their billable time</TableHead>
                <TableHead className="text-right">Cost</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {department.projects.map((project) => (
                <TableRow key={project.refCode}>
                  <TableCell className="max-w-96">
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
                  <TableCell className="text-right tabular-nums">{hours(project.hours)}</TableCell>
                  <TableCell className="text-muted-foreground text-right tabular-nums">
                    {percent(
                      department.billableHours > 0 ? project.hours / department.billableHours : null,
                      0,
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{money(project.cost)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </section>
      </PageBody>
    </>
  );
}

function round(value: number, digits = 1): number {
  return Number(value.toFixed(digits));
}
