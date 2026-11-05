import type { ReactNode } from "react";
import styles from "./ResultsSummary.module.css";
export function ResultsSummary({ items }: { items: {label:string;value:ReactNode;detail:string}[] }) { return <dl className={styles.summary} aria-label="Academic period summary">{items.map(item=><div key={item.label}><dt>{item.label}</dt><dd>{item.value}</dd><p>{item.detail}</p></div>)}</dl>; }
