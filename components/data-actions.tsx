"use client";

import { useTransition } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { clearAllData, loadSampleData } from "@/app/upload/actions";

export function SampleDataButton({ label = "Load the 2025 sample year" }: { label?: string }) {
  const [pending, start] = useTransition();

  return (
    <Button size="sm" variant="secondary" disabled={pending} onClick={() => start(() => loadSampleData())}>
      {pending ? <Loader2 className="size-4 animate-spin" /> : null}
      {label}
    </Button>
  );
}

export function ClearDataButton() {
  const [pending, start] = useTransition();

  return (
    <Button
      size="sm"
      variant="ghost"
      className="text-destructive hover:text-destructive"
      disabled={pending}
      onClick={() => {
        if (!window.confirm("Remove every uploaded timesheet, salary and price row?")) return;
        start(() => clearAllData());
      }}
    >
      {pending ? <Loader2 className="size-4 animate-spin" /> : null}
      Clear all data
    </Button>
  );
}
