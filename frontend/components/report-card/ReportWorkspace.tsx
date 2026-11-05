"use client";

import type { ReactNode } from "react";
import styles from "./ReportWorkspace.module.css";

type HeaderProps = {
  student: {name:string; grade?:string | null; reg_id?:string | null};
  period:string; index:number; count:number; busy:boolean; canPrint:boolean;
  onBack:()=>void; onPrevious:()=>void; onNext:()=>void; onReload:()=>void; onPrint:()=>void;
};

export function ReportWorkspaceHeader(p:HeaderProps) {
  return <header className={styles.header}>
    <div className={styles.navigation}><button onClick={p.onBack}>← Student roster</button>
      {p.index>=0 && p.count>1 && <nav aria-label="Report student navigation" className={styles.pager}><button onClick={p.onPrevious} disabled={p.index===0 || p.busy} aria-label="Previous student">←</button><span>{p.index+1} of {p.count}</span><button onClick={p.onNext} disabled={p.index===p.count-1 || p.busy} aria-label="Next student">→</button></nav>}
    </div>
    <div className={styles.identityRow}><div><p className={styles.eyebrow}>Student report card</p><h1>{p.student.name}</h1><div className={styles.metadata}><span>{p.student.grade || "Class not recorded"}</span><span>Registration <strong>{p.student.reg_id || "Not recorded"}</strong></span></div></div>
      <div className={styles.actions}><button onClick={p.onReload} disabled={p.busy}>Refresh records</button><button className={styles.primary} onClick={p.onPrint} disabled={!p.canPrint || p.busy}>Print / Save PDF</button></div>
    </div>
    <p className={styles.period}>Viewing <strong>{p.period}</strong></p>
  </header>;
}

export function ReportPeriodPanel({children}:{children:ReactNode}) {
  return <section className={styles.periodPanel} aria-label="Report period and format"><div className={styles.panelHeading}><h2>Report settings</h2><p>Choose the academic period and how scores are combined.</p></div><div className={styles.controls}>{children}</div></section>;
}

export function ReportEmptyState({name,period,onPeriod,onReload,onBack}:{name:string;period:string;onPeriod:()=>void;onReload:()=>void;onBack:()=>void}) {
  return <section className={styles.empty} aria-labelledby="report-empty-title"><span className={styles.eyebrow}>No assessment records</span><h2 id="report-empty-title">No completed exams for this period</h2><p>No exam scores were found for {name} in {period}. Try another academic period, or refresh after results have been recorded.</p><div className={styles.emptyActions}><button className={styles.primary} onClick={onPeriod}>Change period</button><button onClick={onReload}>Refresh records</button><button onClick={onBack}>Return to roster</button></div><small>A report preview becomes available when assessment records are selected.</small></section>;
}
