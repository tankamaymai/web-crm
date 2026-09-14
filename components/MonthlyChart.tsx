"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from "recharts";

export type SalesSeries = {
  key: string;
  label: string;
  color: string;
};

export type MonthlyDatum = { month: string } & Record<string, string | number>;

function formatAxisYen(value: number): string {
  if (value >= 10000) return `${(value / 10000).toLocaleString("ja-JP")}万`;
  return value.toLocaleString("ja-JP");
}

function yen(n: number): string {
  return `¥${n.toLocaleString("ja-JP")}`;
}

function SalesTooltip({
  active,
  payload,
  label,
  series,
}: TooltipContentProps<number, string> & { series: SalesSeries[] }) {
  if (!active || !payload || payload.length === 0) return null;
  const labelOf = new Map(series.map((s) => [s.key, s.label]));
  // 積み上げの上側（後着の系列）から表示する
  const entries = [...payload]
    .reverse()
    .filter((p) => typeof p.value === "number" && p.value > 0);
  if (entries.length === 0) return null;
  const total = entries.reduce((sum, p) => sum + (p.value as number), 0);
  return (
    <div className="max-w-64 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs shadow-lg">
      <p className="mb-1.5 font-bold text-gray-700">{label}</p>
      <ul className="space-y-1">
        {entries.map((p) => (
          <li key={String(p.dataKey)} className="flex items-center gap-1.5">
            <span
              className="size-2.5 shrink-0 rounded-sm"
              style={{ backgroundColor: p.color }}
            />
            <span className="min-w-0 flex-1 truncate text-gray-600">
              {labelOf.get(String(p.dataKey)) ?? String(p.dataKey)}
            </span>
            <span className="tabular-nums font-medium text-gray-800">
              {yen(p.value as number)}
            </span>
          </li>
        ))}
      </ul>
      <div className="mt-1.5 flex items-center justify-between border-t border-gray-100 pt-1.5 font-bold text-gray-800">
        <span>合計</span>
        <span className="tabular-nums">{yen(total)}</span>
      </div>
    </div>
  );
}

export default function MonthlyChart({
  data,
  series,
}: {
  data: MonthlyDatum[];
  series: SalesSeries[];
}) {
  return (
    <ResponsiveContainer width="100%" height={280}>
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
          content={(props) => (
            <SalesTooltip
              {...(props as TooltipContentProps<number, string>)}
              series={series}
            />
          )}
        />
        <Legend
          iconSize={8}
          iconType="square"
          wrapperStyle={{ fontSize: 11, color: "#4b5563" }}
        />
        {series.map((s) => (
          <Bar
            key={s.key}
            dataKey={s.key}
            name={s.label}
            stackId="sales"
            fill={s.color}
            stroke="#ffffff"
            strokeWidth={1}
            maxBarSize={40}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
