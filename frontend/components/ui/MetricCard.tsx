import type { ReactNode } from "react";
import { Card, CardHeader, CardDescription, CardFooter, CardAction } from "./Card";
import styles from "./MetricCard.module.css";

export function ProgressBar({ value, label }: { value: number; label: string }) {
  const percent = Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : 0;
  return <div className={styles.track} role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}>
    <span className={styles.fill} style={{ width: `${percent}%` }} />
  </div>;
}

/** dashboard-01 section-cards composition, adapted to actual academic metrics. */
export function MetricCard({ label, value, detail, action, progress, compact = false }: {
  label: string; value: ReactNode; detail?: ReactNode; action?: ReactNode;
  progress?: number; compact?: boolean;
}) {
  return <Card className={`${styles.metric} ${compact ? styles.compact : ""}`}>
    <CardHeader className={styles.header}>
      <CardDescription>{label}</CardDescription>
      {action && <CardAction className={styles.action}>{action}</CardAction>}
      <div className={styles.value}>{value}</div>
    </CardHeader>
    {(progress !== undefined || detail) && <CardFooter className={styles.footer}>
      {progress !== undefined && <ProgressBar value={progress} label={`${label} progress`} />}
      {detail && <div className={styles.detail}>{detail}</div>}
    </CardFooter>}
  </Card>;
}
