"use client";
import { useState } from "react";
import type { ReactNode } from "react";
import { Modal } from "../ui/Modal";
import styles from "./AssessmentFlow.module.css";

type Paper = { id?: string; subject: string; exam_body: string; year: string | number };
export function PracticeCatalog({ papers, downloaded, downloading, onDownload, onStart, subjectName, arena }: { papers: Paper[]; downloaded: string[]; downloading: string | null; onDownload: (id: string) => void; onStart: (id: string) => void; subjectName: (code: string) => string; arena?: ReactNode }) {
 const [body, setBody] = useState(""); const [year, setYear] = useState(""); const [selected, setSelected] = useState<Paper | null>(null);
 const bodies = [...new Set(papers.map(p => p.exam_body).filter(Boolean))];
 const years = [...new Set(papers.filter(p => p.exam_body === body).map(p => String(p.year)))];
 const visible = papers.filter(p => p.exam_body === body && (!year || String(p.year) === year));
 const id = selected ? String(selected.id || selected.subject) : "";
 return <div className={styles.page}><header><span className={styles.eyebrow}>Your learning library</span><h1>Practice</h1><p>Choose an exam body, then select an available paper.</p></header>
 {arena}
 <div className={styles.filters}><label>Examination body<select value={body} onChange={e => { setBody(e.target.value); setYear(""); setSelected(null); }}><option value="">Choose an exam body</option>{bodies.map(value => <option key={value}>{value}</option>)}</select></label>{body && <label>Year<select value={year} onChange={e=>setYear(e.target.value)}><option value="">All years</option>{years.map(value=><option key={value}>{value}</option>)}</select></label>}</div>
 {!body ? <p className={styles.empty}>{papers.length ? "Select an exam body to view its available papers." : "No practice papers have been published yet."}</p> : <section><div className={styles.listHeading}><h2>{body} papers</h2><span>{visible.length} available</span></div><div className={styles.list}>{visible.length ? visible.map(paper=><button type="button" key={String(paper.id || paper.subject)} className={styles.row} aria-haspopup="dialog" onClick={()=>setSelected(paper)}><span><strong>{subjectName(paper.subject)}</strong><small>{paper.exam_body} · {paper.year}</small></span><span>View paper →</span></button>) : <p className={styles.empty}>No papers match your selection.</p>}</div></section>}
 <Modal open={Boolean(selected)} onClose={()=>setSelected(null)} title={selected ? subjectName(selected.subject) : "Paper details"} description="Review this paper before starting practice." size="sm">{selected && <div className={styles.details}><dl><div><dt>Exam body</dt><dd>{selected.exam_body}</dd></div><div><dt>Year</dt><dd>{selected.year}</dd></div><div><dt>Availability</dt><dd>{downloaded.includes(id) ? "Online and offline" : "Online"}</dd></div></dl><p>No session starts until you choose Start practice.</p><div className={styles.actions}>{!downloaded.includes(id) && <button type="button" disabled={downloading !== null} onClick={()=>onDownload(id)}>{downloading ? "Downloading…" : "Download for offline"}</button>}<button type="button" className={styles.primary} onClick={()=>onStart(id)}>Start practice →</button></div></div>}</Modal>
 </div>;
}
