"use client";

import { useId } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import styles from "./AcademicChart.module.css";

export type AcademicChartPoint = { label: string; score: number; subject?: string };

/** Time series use an area; categorical subject comparisons use bars. */
export function AcademicChart({ data, kind = "trend", label }: { data: AcademicChartPoint[]; kind?: "trend" | "subjects"; label: string }) {
  const id = useId().replace(/:/g, "");
  const points = data.filter(point => Number.isFinite(point.score));
  if (!points.length) return <p className={styles.empty}>Scores will appear here after results are published.</p>;
  const axes = <>
    <CartesianGrid vertical={false} stroke="var(--color-border)" strokeDasharray="3 5" />
    <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--color-muted)" }} axisLine={false} tickLine={false} minTickGap={20} tickMargin={10} />
    <YAxis domain={[0, 100]} ticks={[0, 50, 100]} tick={{ fontSize: 11, fill: "var(--color-muted)" }} axisLine={false} tickLine={false} width={30} />
    <Tooltip contentStyle={{ background: "var(--color-surface)", color: "var(--color-text)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12 }} formatter={(value: unknown) => [`${value}%`, "Score"]} />
  </>;
  return <figure className={styles.figure} aria-label={label}>
    <div className={styles.chart}>
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        {kind === "subjects" ? <BarChart accessibilityLayer data={points} margin={{ top: 12, right: 12, bottom: 0, left: 0 }}>{axes}<Bar dataKey="score" fill="var(--color-brand-mid)" radius={[4, 4, 0, 0]} maxBarSize={40} isAnimationActive={false} /></BarChart>
          : <AreaChart accessibilityLayer data={points} margin={{ top: 12, right: 12, bottom: 0, left: 0 }}>
            <defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--color-brand-mid)" stopOpacity={.24} /><stop offset="100%" stopColor="var(--color-brand-mid)" stopOpacity={.02} /></linearGradient></defs>
            {axes}<Area type="linear" dataKey="score" stroke="var(--color-primary)" strokeWidth={2} fill={`url(#${id})`} dot={{ r: 3, fill: "var(--color-surface)", strokeWidth: 2 }} isAnimationActive={false} />
          </AreaChart>}
      </ResponsiveContainer>
    </div>
    <details className={styles.details}><summary>View chart values</summary><ul>{points.map((point, index) => <li key={`${point.label}-${index}`}><span>{point.label}{point.subject ? ` · ${point.subject}` : ""}</span><strong>{point.score}%</strong></li>)}</ul></details>
  </figure>;
}
