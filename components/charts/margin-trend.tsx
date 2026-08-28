"use client";

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { money, moneyCompact, percent } from "@/lib/format";

export type TrendPoint = {
  label: string;
  revenue: number;
  cost: number;
  marginPct: number | null;
};

export function MarginTrend({ data }: { data: TrendPoint[] }) {
  return (
    <div className="h-[260px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            interval="preserveStartEnd"
          />
          <YAxis
            yAxisId="money"
            tickLine={false}
            axisLine={false}
            width={64}
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            tickFormatter={(value: number) => moneyCompact(value)}
          />
          <YAxis
            yAxisId="pct"
            orientation="right"
            tickLine={false}
            axisLine={false}
            width={44}
            domain={[0, 1]}
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            tickFormatter={(value: number) => percent(value, 0)}
          />
          <Tooltip
            cursor={{ fill: "var(--muted)", opacity: 0.5 }}
            contentStyle={{
              background: "var(--popover)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-md)",
              fontSize: 12,
              color: "var(--popover-foreground)",
            }}
            formatter={(value, name) =>
              name === "Margin"
                ? [percent(Number(value)), String(name)]
                : [money(Number(value)), String(name)]
            }
          />
          <Bar yAxisId="money" dataKey="revenue" name="Revenue" fill="var(--revenue)" radius={[3, 3, 0, 0]} />
          <Bar yAxisId="money" dataKey="cost" name="Cost" fill="var(--cost)" radius={[3, 3, 0, 0]} />
          <Line
            yAxisId="pct"
            type="monotone"
            dataKey="marginPct"
            name="Margin"
            stroke="var(--margin)"
            strokeWidth={2}
            dot={false}
            connectNulls
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
