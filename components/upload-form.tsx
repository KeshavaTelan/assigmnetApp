"use client";

import { useActionState } from "react";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { uploadWorkbooks, type UploadState } from "@/app/upload/actions";

const SLOTS = [
  {
    name: "timesheet" as const,
    label: "Timesheet",
    hint: "One row per person, per task, per month. Only the months in the file are replaced.",
  },
  {
    name: "salaries" as const,
    label: "Salary overview",
    hint: "One row per person, one column per month.",
  },
  {
    name: "prices" as const,
    label: "Project prices",
    hint: "One row per project, matched on Ref Code.",
  },
];

const INITIAL: UploadState = { status: "idle", outcomes: [] };

export function UploadForm() {
  const [state, formAction, pending] = useActionState(uploadWorkbooks, INITIAL);

  return (
    <form action={formAction} className="space-y-5">
      <div className="grid gap-4 md:grid-cols-3">
        {SLOTS.map((slot) => (
          <div key={slot.name} className="space-y-1.5">
            <label htmlFor={slot.name} className="text-sm font-medium">
              {slot.label}
            </label>
            <Input id={slot.name} name={slot.name} type="file" accept=".xlsx" disabled={pending} />
            <p className="text-muted-foreground text-xs">{slot.hint}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : null}
          {pending ? "Reading workbooks…" : "Upload"}
        </Button>
        <span className="text-muted-foreground text-xs">
          Upload any one of them on its own — the others stay as they are.
        </span>
      </div>

      {state.status === "done" ? (
        <ul className="space-y-2">
          {state.outcomes.map((outcome, index) => (
            <li
              key={`${outcome.kind}-${index}`}
              className="bg-muted/40 flex gap-3 rounded-md border p-3 text-sm"
            >
              {outcome.ok ? (
                <CheckCircle2 className="text-margin mt-0.5 size-4 shrink-0" />
              ) : (
                <XCircle className="text-destructive mt-0.5 size-4 shrink-0" />
              )}
              <div className="min-w-0">
                <div>
                  {outcome.fileName ? (
                    <span className="font-medium">{outcome.fileName} — </span>
                  ) : null}
                  {outcome.headline}
                </div>
                {outcome.details.map((detail) => (
                  <div key={detail} className="text-muted-foreground mt-0.5 text-xs">
                    {detail}
                  </div>
                ))}
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </form>
  );
}
