"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { formatCurrency } from "@/lib/utils";

interface DailySalesDataPoint {
  day: string;
  totalSales: number;
}

interface DailyChartsProps {
  data: {
    salesByDayData: DailySalesDataPoint[];
  };
}

export default function DailySalesChart({
  data: { salesByDayData },
}: DailyChartsProps) {
  // Matches your corporate shorthand axes numbers style (TZS)
  const formatYAxisTicks = (value: number) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M TZS`;
    if (value >= 1000) return `${(value / 1000).toFixed(0)}K TZS`;
    return `${value} TZS`;
  };

  // Dynamically calculate current system date in identical "MM/DD/YY" schema
  const currentDayStr = new Date().toLocaleDateString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "2-digit",
  });

  return (
    <div className="w-full h-[320px] pt-2 select-none">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={salesByDayData}
          margin={{ top: 10, right: 15, left: -15, bottom: 0 }}
        >
          {/* Subtle horizontal grid lines to help map daily peaks */}
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke="#f1f5f9"
          />

          <XAxis
            dataKey="day"
            stroke="#94a3b8"
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
            tickFormatter={formatYAxisTicks}
          />

          {/* Styled custom tooltip optimized for specific daily records */}
          <Tooltip
            cursor={{
              stroke: "#cbd5e1",
              strokeWidth: 1,
              strokeDasharray: "4 4",
            }}
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                return (
                  <div className="bg-slate-900 text-white p-2.5 rounded-xl border border-slate-800 shadow-xl text-xs space-y-0.5">
                    <p className="text-slate-400 font-medium">
                      Tarehe: {payload[0].payload.day}
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

          {/* Smooth curved trend line maintaining the identical brand Orange Hex profile */}
          {/* The dot property conditionally enlarges and updates colors if the point matches currentDayStr */}
          <Line
            type="monotone"
            dataKey="totalSales"
            stroke="#ea580c"
            strokeWidth={3}
            dot={(props) => {
              const isCurrentDay = props.payload.day === currentDayStr;
              return (
                <circle
                  cx={props.cx}
                  cy={props.cy}
                  r={isCurrentDay ? 5 : 3}
                  fill={isCurrentDay ? "#0d9488" : "#ea580c"}
                  stroke={isCurrentDay ? "#f97316" : "none"}
                  strokeWidth={isCurrentDay ? 2 : 0}
                  key={`dot-${props.index}`}
                />
              );
            }}
            activeDot={{ r: 6, strokeWidth: 0, fill: "#0d9488" }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// black dot hex #0f172a
