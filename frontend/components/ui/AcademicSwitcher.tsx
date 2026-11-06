"use client";

import React, { useState, useRef, useEffect } from "react";
import { useAcademic } from "../context/AcademicContext";
import {
  CalendarIcon,
  ChevronDownIcon,
  CheckIcon,
} from "../icons/Icons";
import styles from "./AcademicSwitcher.module.css";
import { CalendarDays, ChevronDown, Check, useStudentIconScope } from "../icons/StudentIcons";

const defaultIcons = { CalendarIcon, ChevronDownIcon, CheckIcon };

export function AcademicSwitcher() {
  const studentIcons = useStudentIconScope();
  const {CalendarIcon, ChevronDownIcon, CheckIcon} = studentIcons
    ? {CalendarIcon: CalendarDays, ChevronDownIcon: ChevronDown, CheckIcon: Check} : defaultIcons;
  const {
    sessions,
    terms,
    selectedSession,
    selectedTerm,
    activeSession,
    activeTerm,
    setSelectedSession,
    setSelectedTerm,
  } = useAcademic();

  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  if (!sessions || sessions.length === 0) return null;

  const sessionName = selectedSession?.name || "2026/2027";
  const termName = selectedTerm?.name || "All Terms";

  return (
    <div className={styles.container} ref={containerRef}>
      {/* Interactive Period Switcher Control */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={`${styles.triggerBtn} ${open ? styles.triggerOpen : ""}`}
        title="Switch Academic Session and Term"
        aria-expanded={open}
      >
        <span className={styles.iconWrap}>
          <CalendarIcon width="12" height="12" className={styles.triggerIcon} />
        </span>

        <span style={{ fontSize: "0.6875rem", color: "var(--color-muted)", fontWeight: 500 }}>Period:</span>
        <span className={styles.labelSession}>{sessionName}</span>
        <span className={styles.separator}>·</span>
        <span className={styles.labelTerm}>{termName}</span>

        <ChevronDownIcon
          width="10"
          height="10"
          className={`${styles.chevron} ${open ? styles.chevronRotated : ""}`}
        />
      </button>

      {/* Popover Dropdown Panel */}
      {open && (
        <div className={styles.dropdownPanel}>
          <div className={styles.panelHeader}>
            <span className={styles.panelTitle}>Switch Academic Period</span>
          </div>

          {/* Sessions Column */}
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <span>Academic Year</span>
            </div>

            <div className={styles.itemList}>
              {sessions.map((s) => {
                const isSelected = selectedSession?.id === s.id;
                const isLive = s.is_active === 1 || (activeSession && s.id === activeSession.id);
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      setSelectedSession(s);
                      const matchingTerms = terms.filter((t) => t.session_id === s.id);
                      const activeInSession = matchingTerms.find((t) => t.is_active === 1);
                      setSelectedTerm(activeInSession || matchingTerms[0] || null);
                    }}
                    className={`${styles.itemBtn} ${isSelected ? styles.itemSelected : ""}`}
                  >
                    <div className={styles.itemLeft}>
                      <span className={styles.itemName}>{s.name}</span>
                      {isLive && <span className={styles.badgeLive}>Active</span>}
                    </div>

                    {isSelected && (
                      <CheckIcon width="13" height="13" className={styles.checkIcon} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Terms Column */}
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <span>Term / Semester</span>
            </div>

            <div className={styles.termsGrid}>
              <button
                type="button"
                onClick={() => {
                  setSelectedTerm(null);
                  setOpen(false);
                }}
                className={`${styles.termPill} ${!selectedTerm ? styles.termPillActive : ""}`}
              >
                All Terms
              </button>

              {terms
                .filter((t) => !selectedSession || t.session_id === selectedSession.id)
                .map((t) => {
                  const isSelected = selectedTerm?.id === t.id;
                  const isLive = t.is_active === 1 || (activeTerm && t.id === activeTerm.id);
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        setSelectedTerm(t);
                        setOpen(false);
                      }}
                      className={`${styles.termPill} ${isSelected ? styles.termPillActive : ""}`}
                    >
                      <span>{t.name}</span>
                      {isLive && <span className={styles.tinyLiveDot} />}
                    </button>
                  );
                })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
