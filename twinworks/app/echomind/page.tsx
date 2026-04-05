"use client";

import { motion } from "framer-motion";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { TrendingUp } from "lucide-react";

const ACCENT = "#2563eb";
const ACCENT_SOFT = "#93c5fd";
const MUTED = "#64748b";

const scenarios = [
  { id: "now", label: "Сейчас", short: "Сейчас" },
  { id: "e1", label: "С EchoMind 1", short: "EM 1" },
  { id: "e2", label: "С EchoMind 2", short: "EM 2" },
  { id: "e3", label: "С EchoMind 3", short: "EM 3" },
] as const;

const tableRows: {
  metric: string;
  values: [string, string, string, string];
  highlight?: boolean;
}[] = [
  {
    metric: "Бюджет, ₽",
    values: ["1 000 000", "1 000 000", "1 000 000", "1 000 000"],
  },
  {
    metric: "Цена лида, ₽",
    values: ["5 000", "5 000", "5 000", "5 000"],
  },
  {
    metric: "Лидов, шт",
    values: ["200", "200", "200", "200"],
  },
  {
    metric: "Конверсия",
    values: ["5%", "7%", "9%", "12%"],
    highlight: true,
  },
  {
    metric: "Сделок, шт",
    values: ["10", "14", "18", "24"],
    highlight: true,
  },
  {
    metric: "Средний чек, ₽",
    values: ["100 000", "100 000", "100 000", "100 000"],
  },
  {
    metric: "Выручка, ₽",
    values: ["1 000 000", "1 400 000", "1 800 000", "2 400 000"],
    highlight: true,
  },
  {
    metric: "ROMI",
    values: ["0%", "40%", "80%", "140%"],
    highlight: true,
  },
  {
    metric: "Прирост выручки, ₽",
    values: ["—", "400 000", "800 000", "1 400 000"],
    highlight: true,
  },
];

const staticCards = [
  { label: "Бюджет", value: "1 000 000", unit: "₽" },
  { label: "Цена лида", value: "5 000", unit: "₽" },
  { label: "Лидов", value: "200", unit: "шт" },
  { label: "Средний чек", value: "100 000", unit: "₽" },
];

const chartRevenue = scenarios.map((s, i) => ({
  name: s.short,
  full: s.label,
  Выручка: [1_000_000, 1_400_000, 1_800_000, 2_400_000][i],
}));

const chartDeals = scenarios.map((s, i) => ({
  name: s.short,
  Сделок: [10, 14, 18, 24][i],
}));

const chartConversion = scenarios.map((s, i) => ({
  name: s.short,
  "Конверсия, %": [5, 7, 9, 12][i],
}));

const chartRomi = scenarios.map((s, i) => ({
  name: s.short,
  ROMI: [0, 40, 80, 140][i],
}));

const chartGrowth = [
  { name: "EM 1", "Прирост, ₽": 400_000 },
  { name: "EM 2", "Прирост, ₽": 800_000 },
  { name: "EM 3", "Прирост, ₽": 1_400_000 },
];

const barColors = ["#cbd5e1", ACCENT_SOFT, "#3b82f6", ACCENT];

function formatRub(n: number) {
  return new Intl.NumberFormat("ru-RU").format(n);
}

const tooltipStyle = {
  backgroundColor: "#ffffff",
  border: "1px solid #e2e8f0",
  borderRadius: "8px",
  boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.08)",
};

export default function EchoMindPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <motion.header
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10"
        >
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm shadow-blue-600/25">
              <TrendingUp className="h-5 w-5" strokeWidth={2.2} />
            </span>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
                Сценарии EchoMind
              </h1>
              <p className="mt-1 text-sm text-slate-600">
                Сравнение базового сценария и трёх вариантов роста конверсии
              </p>
            </div>
          </div>
        </motion.header>

        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="mb-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          {staticCards.map((c) => (
            <div
              key={c.label}
              className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm"
            >
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                {c.label}
              </p>
              <p className="mt-2 text-2xl font-semibold tabular-nums text-slate-900">
                {c.value}
                <span className="ml-1 text-base font-normal text-slate-500">
                  {c.unit}
                </span>
              </p>
            </div>
          ))}
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-10 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm"
        >
          <div className="border-b border-slate-100 bg-slate-50/80 px-6 py-4">
            <h2 className="text-lg font-semibold text-slate-900">
              Сводная таблица
            </h2>
            <p className="text-sm text-slate-600">
              Все показатели по четырём сценариям
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-white">
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">
                    Показатель
                  </th>
                  {scenarios.map((s) => (
                    <th
                      key={s.id}
                      className="px-4 py-3 text-right font-semibold text-slate-700"
                    >
                      {s.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tableRows.map((row, ri) => (
                  <tr
                    key={row.metric}
                    className={
                      ri % 2 === 0 ? "bg-white" : "bg-slate-50/60"
                    }
                  >
                    <td
                      className={`px-4 py-3 font-medium ${
                        row.highlight ? "text-blue-700" : "text-slate-800"
                      }`}
                    >
                      {row.metric}
                    </td>
                    {row.values.map((v, vi) => (
                      <td
                        key={vi}
                        className={`px-4 py-3 text-right tabular-nums ${
                          row.highlight
                            ? "font-semibold text-slate-900"
                            : "text-slate-700"
                        }`}
                      >
                        {v}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.section>

        <div className="grid gap-8 lg:grid-cols-2">
          <ChartCard
            title="Выручка по сценариям"
            subtitle="Рост за счёт конверсии при неизменных вводных"
            delay={0.15}
          >
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartRevenue} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: MUTED, fontSize: 12 }} axisLine={{ stroke: "#e2e8f0" }} />
                <YAxis
                  tick={{ fill: MUTED, fontSize: 11 }}
                  tickFormatter={(v) => `${v / 1_000_000}M`}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(value: number) => [`${formatRub(value)} ₽`, "Выручка"]}
                  labelFormatter={(_, p) => (p[0]?.payload as { full?: string })?.full ?? ""}
                />
                <Bar dataKey="Выручка" radius={[6, 6, 0, 0]}>
                  {chartRevenue.map((_, i) => (
                    <Cell key={i} fill={barColors[i]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard
            title="Сделки"
            subtitle="Количество сделок при росте конверсии"
            delay={0.2}
          >
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartDeals} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: MUTED, fontSize: 12 }} axisLine={{ stroke: "#e2e8f0" }} />
                <YAxis tick={{ fill: MUTED, fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="Сделок" radius={[6, 6, 0, 0]}>
                  {chartDeals.map((_, i) => (
                    <Cell key={i} fill={barColors[i]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard
            title="Конверсия"
            subtitle="Динамика по сценариям, %"
            delay={0.25}
          >
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={chartConversion} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fill: MUTED, fontSize: 12 }} axisLine={{ stroke: "#e2e8f0" }} />
                <YAxis
                  domain={[0, 14]}
                  tick={{ fill: MUTED, fontSize: 11 }}
                  tickFormatter={(v) => `${v}%`}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(v: number) => [`${v}%`, "Конверсия"]}
                />
                <Line
                  type="monotone"
                  dataKey="Конверсия, %"
                  stroke={ACCENT}
                  strokeWidth={2.5}
                  dot={{ fill: ACCENT, strokeWidth: 2, r: 4, stroke: "#fff" }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="ROMI" subtitle="Return on marketing investment, %" delay={0.3}>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartRomi} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: MUTED, fontSize: 12 }} axisLine={{ stroke: "#e2e8f0" }} />
                <YAxis tick={{ fill: MUTED, fontSize: 11 }} tickFormatter={(v) => `${v}%`} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${v}%`, "ROMI"]} />
                <Bar dataKey="ROMI" radius={[6, 6, 0, 0]}>
                  {chartRomi.map((_, i) => (
                    <Cell key={i} fill={barColors[i]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="mt-8 overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm"
        >
          <h2 className="text-lg font-semibold text-slate-900">
            Прирост выручки к базе
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Три сценария EchoMind относительно текущей выручки 1 000 000 ₽
          </p>
          <div className="mt-6 h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartGrowth} layout="vertical" margin={{ top: 8, right: 24, left: 8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                <XAxis type="number" tick={{ fill: MUTED, fontSize: 11 }} tickFormatter={(v) => formatRub(v)} axisLine={{ stroke: "#e2e8f0" }} />
                <YAxis type="category" dataKey="name" width={48} tick={{ fill: MUTED, fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(value: number) => [`${formatRub(value)} ₽`, "Прирост"]}
                />
                <Bar dataKey="Прирост, ₽" fill={ACCENT} radius={[0, 6, 6, 0]} barSize={36} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.section>
      </div>
    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  delay,
  children,
}: {
  title: string;
  subtitle: string;
  delay: number;
  children: React.ReactNode;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm"
    >
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      <p className="mt-1 text-sm text-slate-600">{subtitle}</p>
      <div className="mt-4 h-[280px] w-full">{children}</div>
    </motion.section>
  );
}
