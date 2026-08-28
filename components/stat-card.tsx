import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  hint,
  tone,
  className,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: string;
  className?: string;
}) {
  return (
    <div className={cn("bg-card rounded-lg border p-4", className)}>
      <div className="text-muted-foreground text-xs font-medium tracking-wide uppercase">{label}</div>
      <div className={cn("mt-1.5 text-2xl font-semibold tabular-nums", tone)}>{value}</div>
      {hint ? <div className="text-muted-foreground mt-1 text-xs tabular-nums">{hint}</div> : null}
    </div>
  );
}

export function StatGrid({ children }: { children: ReactNode }) {
  return <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">{children}</div>;
}
