"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { formatCurrency } from "@/lib/utils";

interface SalesDataPoint {
  month: string;
  totalSales: number;
}

interface ChartsProps {
  data: {
    salesData: SalesDataPoint[];
  };
}

export default function Charts({ data: { salesData } }: ChartsProps) {
  // Custom shorthand formatter to display clean axes numbers (e.g. 50,000 -> 50K TZS)
  const formatYAxisTicks = (value: number) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M TZS`;
    if (value >= 1000) return `${(value / 1000).toFixed(0)}K TZS`;
    return `${value} TZS`;
  };

  return (
    <div className="w-full h-[320px] pt-2 select-none">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={salesData}
          margin={{ top: 10, right: 5, left: -15, bottom: 0 }}
        >
          <XAxis
            dataKey="month"
            stroke="#94a3b8" // Soft Slate gray color tint
            fontSize={11}
            tickLine={false}
            axisLine={false}
            dy={8}
          />
          <YAxis
            stroke="#94a3b8"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            tickFormatter={formatYAxisTicks} // 🟢 FIXED: Switched from USD to readable TZS metrics
          />

          {/* Custom tooltip configuration providing responsive data reveals on cursor hovers */}
          <Tooltip
            cursor={{ fill: "#f8fafc" }}
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                return (
                  <div className="bg-slate-900 text-white p-2.5 rounded-xl border border-slate-800 shadow-xl text-xs space-y-0.5">
                    <p className="text-slate-400 font-medium">
                      Mwezi: {payload[0].payload.month}
                    </p>
                    <p className="font-extrabold text-orange-400">
                      Mauzo: {formatCurrency(Number(payload[0].value))}
                    </p>
                  </div>
                );
              }
              return null;
            }}
          />

          <Bar
            dataKey="totalSales"
            fill="#ea580c" // Stable dynamic brand corporate Orange Hex code color profile
            radius={[6, 6, 0, 0]}
            maxBarSize={45}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
