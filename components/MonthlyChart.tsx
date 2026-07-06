"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type MonthlyDatum = { month: string; amount: number };

function formatAxisYen(value: number): string {
  if (value >= 10000) return `${(value / 10000).toLocaleString("ja-JP")}万`;
  return value.toLocaleString("ja-JP");
}

export default function MonthlyChart({ data }: { data: MonthlyDatum[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="#e5e7eb" strokeWidth={0.5} />
        <XAxis
          dataKey="month"
          tickLine={false}
          axisLine={{ stroke: "#d1d5db" }}
          tick={{ fontSize: 11, fill: "#6b7280" }}
          interval={0}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 12, fill: "#6b7280" }}
          tickFormatter={formatAxisYen}
          width={52}
        />
        <Tooltip
          cursor={{ fill: "rgba(0,0,0,0.04)" }}
          formatter={(value) => [
            `¥${Number(value).toLocaleString("ja-JP")}`,
            "売上",
          ]}
          contentStyle={{ fontSize: 12, borderRadius: 8 }}
        />
        <Bar
          dataKey="amount"
          fill="#0284c7"
          radius={[4, 4, 0, 0]}
          maxBarSize={40}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
