import { ClearDataButton, SampleDataButton } from "@/components/data-actions";
import { PageBody, PageHeader, SectionTitle } from "@/components/page-header";
import { UploadForm } from "@/components/upload-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { monthKey } from "@/lib/domain/types";
import { hours, money } from "@/lib/format";
import { loadModel } from "@/lib/server/load";
import { storeIsEmpty } from "@/lib/store/repository";
import { updateAssumptions } from "./actions";

export default async function UploadPage() {
  const model = await loadModel();
  const { store } = model;
  const empty = storeIsEmpty(store);

  const months = [...new Set(store.timesheet.map(monthKey))].sort();
  const categories = [...new Set(store.timesheet.map((row) => row.category))].sort();
  const totalHours = store.timesheet.reduce((sum, row) => sum + row.hours, 0);
  const salaryTotal = store.salaries.reduce((sum, row) => sum + row.salary, 0);

  return (
    <>
      <PageHeader
        title="Data"
        description="Upload the three workbooks and set the assumptions the cost model runs on."
        actions={
          <div className="flex items-center gap-2">
            <SampleDataButton label={empty ? "Load the 2025 sample year" : "Reload sample year"} />
            {empty ? null : <ClearDataButton />}
          </div>
        }
      />

      <PageBody>
        <section className="bg-card rounded-lg border p-4">
          <SectionTitle hint="Re-uploading a month replaces that month only">
            Upload workbooks
          </SectionTitle>
          <UploadForm />
        </section>

        <div className="grid gap-6 lg:grid-cols-2">
          <section className="bg-card rounded-lg border p-4">
            <SectionTitle>What&rsquo;s loaded</SectionTitle>
            {empty ? (
              <p className="text-muted-foreground text-sm">
                Nothing yet. Upload the workbooks above, or load the sample year to see the dashboard
                populated.
              </p>
            ) : (
              <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                <Fact label="Timesheet rows" value={store.timesheet.length.toLocaleString()} />
                <Fact label="Hours logged" value={hours(totalHours)} />
                <Fact label="Salary rows" value={store.salaries.length.toLocaleString()} />
                <Fact label="Salaries on file" value={money(salaryTotal)} />
                <Fact label="Priced projects" value={store.prices.length.toLocaleString()} />
                <Fact
                  label="People"
                  value={String(new Set(store.timesheet.map((row) => row.empNo)).size)}
                />
                <div className="col-span-2">
                  <dt className="text-muted-foreground text-xs tracking-wide uppercase">
                    Months covered
                  </dt>
                  <dd className="mt-1.5 flex flex-wrap gap-1">
                    {months.map((month) => (
                      <Badge key={month} variant="outline" className="font-mono text-[11px]">
                        {month}
                      </Badge>
                    ))}
                  </dd>
                </div>
              </dl>
            )}
          </section>

          <section className="bg-card rounded-lg border p-4">
            <SectionTitle hint="Applied everywhere, immediately">Assumptions</SectionTitle>
            <form action={updateAssumptions} className="space-y-5">
              <div className="space-y-1.5">
                <label htmlFor="monthlyOverhead" className="text-sm font-medium">
                  Monthly overhead (AED)
                </label>
                <Input
                  id="monthlyOverhead"
                  name="monthlyOverhead"
                  type="number"
                  min={0}
                  step={100}
                  defaultValue={store.settings.monthlyOverhead}
                  className="max-w-48"
                />
                <p className="text-muted-foreground text-xs">
                  Rent, software, anything the sheets don&rsquo;t carry. It joins the indirect pool,
                  so at zero the company&rsquo;s total cost equals total salaries exactly.
                </p>
              </div>

              <fieldset className="space-y-2">
                <legend className="text-sm font-medium">Billable categories</legend>
                <p className="text-muted-foreground text-xs">
                  Everything unticked is internal time the agency absorbs.
                </p>
                <div className="grid gap-1.5 sm:grid-cols-2">
                  {(categories.length ? categories : store.settings.billableCategories).map(
                    (category) => (
                      <label key={category} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          name="billableCategories"
                          value={category}
                          defaultChecked={store.settings.billableCategories.includes(category)}
                          className="accent-primary size-3.5"
                        />
                        <span className="truncate">{category}</span>
                      </label>
                    ),
                  )}
                </div>
              </fieldset>

              <Button type="submit" size="sm">
                Save assumptions
              </Button>
            </form>
          </section>
        </div>

        <section className="bg-card rounded-lg border p-4">
          <SectionTitle>How re-uploads behave</SectionTitle>
          <ul className="text-muted-foreground space-y-1.5 text-sm">
            <li>
              <span className="text-foreground">Timesheet and salaries</span> are replaced month by
              month. A file containing only May {monthYearHint(months)} replaces May and leaves the
              rest of the year exactly as it was.
            </li>
            <li>
              <span className="text-foreground">Project prices</span> are matched on Ref Code: an
              existing project is updated in place, a new one is added, and projects absent from the
              file are kept.
            </li>
            <li>
              <span className="text-foreground">A file that isn&rsquo;t what it claims</span> is
              rejected with the columns it actually contained, and nothing is written.
            </li>
          </ul>
        </section>
      </PageBody>
    </>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted-foreground text-xs tracking-wide uppercase">{label}</dt>
      <dd className="mt-0.5 font-medium tabular-nums">{value}</dd>
    </div>
  );
}

function monthYearHint(months: string[]): string {
  const year = months[0]?.slice(0, 4);
  return year ?? String(new Date().getFullYear());
}

export const dynamic = "force-dynamic";
