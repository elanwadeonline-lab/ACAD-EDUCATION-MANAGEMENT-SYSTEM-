"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, API_BASE,setTabSession } from "../../lib/api";
import { useAuth } from "../../hooks/useAuth";
import {
  WarningIcon,
  CheckCircleIcon,
  ShieldCheckIcon,
  ActivityIcon,
  AcadBrandIcon,
} from "../../components/icons/Icons";
import styles from "./page.module.css";
import {AcqadLogo} from "../../components/brand/AcqadLogo";
import {MIN_PASSWORD_LENGTH,isValidEmail} from "../../../validation";

export default function SetupPage() {
  const router = useRouter();
  const { init } = useAuth();
  const [name, setName] = useState("");
  const [schoolName,setSchoolName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [checkError, setCheckError] = useState("");
  const [checkAttempt, setCheckAttempt] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);

  useEffect(() => {
    const controller = new AbortController();
    // Never spin forever: if the backend/proxy doesn't answer within 10s,
    // show an actionable error with a retry button instead of hanging.
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    setLoading(true);
    setCheckError("");
    const targetUrl = API_BASE ? `${API_BASE}/api/setup/status` : "/api/setup/status";
    fetch(targetUrl, { signal: controller.signal, cache:"no-store" })
      .then(async res => {
        if(!res.ok)throw new Error("Setup status unavailable");
        const body=await res.json();
        if((body.data??body).setupRequired===false)router.replace("/ADMIN/");
      })
      .catch(() => {
        setCheckError("Could not reach your school server. Check the connection and try again.");
      })
      .finally(() => {
        clearTimeout(timeoutId);
        setLoading(false);
      });
    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [router, checkAttempt]);

  const onStep1Submit = (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if(!schoolName.trim()){setError("Enter your school name.");return;}
    if (!name.trim()) {
      setError("Please enter the administrator's full name");
      return;
    }
    if (!isValidEmail(email)) {
      setError("Please enter a valid administrative email address");
      return;
    }
    setStep(2);
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (password !== confirmPassword) {
      setError("Passwords do not match. Please verify your entries.");
      return;
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters long.`);
      return;
    }
    setSubmitting(true);
    try {
      const result = await api.setup({ name: name.trim(), schoolName:schoolName.trim(), email: email.trim(), password });
      if (!result) throw new Error("Setup could not be completed. Try again.");
      if(result.token)setTabSession(result.token,"operator",result.session_id??null);
      await init();
      setStep(3);
      setTimeout(() => router.replace("/ADMIN/dashboard/"), 2200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Server setup failed. Please try again.");
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <main className={styles.loadingPage}>
        <div className={styles.loadingSpinnerWrap}>
          <div className="spinner" style={{ borderColor: "rgba(15,118,110,0.15)", borderTopColor: "var(--color-primary, #0F766E)" }} />
          <span className={styles.loadingText}>Checking server initialization status…</span>
        </div>
      </main>
    );
  }

  if (checkError) {
    return (
      <main className={styles.loadingPage}>
        <div className={styles.loadingSpinnerWrap} style={{ maxWidth: "26rem", textAlign: "center" }}>
          <span className={styles.loadingText} style={{ color: "#b91c1c" }}>{checkError}</span>
          <button
            type="button"
            onClick={() => setCheckAttempt((n) => n + 1)}
            style={{
              marginTop: "1rem", padding: "0.625rem 1.5rem", borderRadius: "0.5rem",
              border: "none", background: "var(--color-primary, #0F766E)", color: "#fff",
              fontWeight: 600, cursor: "pointer",
            }}
          >
            Retry connection
          </button>
        </div>
      </main>
    );
  }

  return (
    <div className={styles.setupLayout}>
      {/* Top Admin Bar */}
      <header className={styles.topHeader}>
        <div className={styles.topHeaderContent}>
          <div className={styles.brandRow}>
            <AcqadLogo size="md"/>
            <span className={styles.brandSubtitle}>School setup</span>
          </div>

          <div className={styles.headerTelemetry}>
            <div className={styles.telemetryPill}>
              <span className={styles.statusDot} />
              <span>Create your school workspace</span>
            </div>
            <div className={styles.telemetryPillMuted}>
              <span>First-time setup</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className={styles.mainContainer}>
        {/* Stepper Navigation */}
        <div className={styles.stepperWrap}>
          <div className={`${styles.stepNode} ${step >= 1 ? styles.stepNodeActive : ""}`}>
            <span className={styles.stepNumber}>1</span>
            <div className={styles.stepInfo}>
              <span className={styles.stepLabel}>Admin details</span>
              <span className={styles.stepDesc}>School and account details</span>
            </div>
          </div>
          <div className={styles.stepConnector} />
          <div className={`${styles.stepNode} ${step >= 2 ? styles.stepNodeActive : ""}`}>
            <span className={styles.stepNumber}>2</span>
            <div className={styles.stepInfo}>
              <span className={styles.stepLabel}>Account security</span>
              <span className={styles.stepDesc}>Choose your password</span>
            </div>
          </div>
          <div className={styles.stepConnector} />
          <div className={`${styles.stepNode} ${step === 3 ? styles.stepNodeActive : ""}`}>
            <span className={styles.stepNumber}>3</span>
            <div className={styles.stepInfo}>
              <span className={styles.stepLabel}>Initialization</span>
              <span className={styles.stepDesc}>Dashboard launch</span>
            </div>
          </div>
        </div>

        {/* 2-Column Card Grid */}
        <div className={styles.cardGrid}>
          {/* Left Column: Server Architecture & Readiness */}
          <aside className={styles.sidePane}>
            <div className={styles.sideCard}>
              <div className={styles.sideCardHeader}><div><h3 className={styles.sideCardTitle}>Your school, ready to manage</h3><p className={styles.sideCardSubtitle}>Start with one administrator account.</p></div></div>
              <div className={styles.specList}>
                <div className={styles.specItem}><div><strong>Use your official school name</strong><p>This name appears on student reports and school records. You can update your crest in Settings.</p></div></div>
                <div className={styles.specItem}><div><strong>Keep your sign-in details</strong><p>Your administrator account manages staff access, academic sessions and school settings.</p></div></div>
                <div className={styles.specItem}><div><strong>Set up the academic year next</strong><p>Create your session and term, add classes, then assign teachers and enroll students.</p></div></div>
              </div>
            </div>
          </aside>

          {/* Right Column: Interactive Setup Steps */}
          <section className={styles.formSection}>
            <div className={styles.formCard}>
              {step === 1 && (
                <div className={styles.stepBody}>
                  <div className={styles.cardHeaderArea}>
                    <span className={styles.stageTag}>Stage 01 / 02</span>
                    <h2 className={styles.cardHeading}>Create your admin account</h2>
                    <p className={styles.cardSubtext}>
                      Enter the primary administrative profile responsible for school curriculum, timetables, and teacher assignments.
                    </p>
                  </div>

                  {error && (
                    <div className={styles.alertError}>
                      <WarningIcon width="16" height="16" />
                      <span>{error}</span>
                    </div>
                  )}

                  <form onSubmit={onStep1Submit} className={styles.form}>
                    <div className={styles.inputGroup}><label className={styles.inputLabel} htmlFor="school-name">School name</label><input id="school-name" className={styles.schoolInput} value={schoolName} onChange={e=>setSchoolName(e.target.value)} maxLength={160} autoComplete="organization" placeholder="Your institution’s official name" required/></div>
                    <div className={styles.inputGroup}>
                      <label className={styles.inputLabel} htmlFor="admin-name">
                        Full Name / Principal / Head Administrator
                      </label>
                      <div className={styles.inputWrapper}>
                        <svg className={styles.inputIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" />
                        </svg>
                        <input
                          id="admin-name"
                          type="text"
                          className={styles.inputField}
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="e.g. Dr. Victor Olumide"
                          required
                          autoFocus
                        />
                      </div>
                    </div>

                    <div className={styles.inputGroup}>
                      <label className={styles.inputLabel} htmlFor="admin-email">
                        Admin email address
                      </label>
                      <div className={styles.inputWrapper}>
                        <svg className={styles.inputIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" />
                        </svg>
                        <input
                          id="admin-email"
                          type="email"
                          className={styles.inputField}
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="admin@school.local"
                          required
                        />
                      </div>
                      <span className={styles.inputHint}>Use this email to sign in to your school portal.</span>
                    </div>

                    <div className={styles.btnRow}>
                      <button type="submit" className={styles.btnPrimary}>
                        <span>Continue</span>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
                        </svg>
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {step === 2 && (
                <div className={styles.stepBody}>
                  <div className={styles.cardHeaderArea}>
                    <span className={styles.stageTag}>Stage 02 / 02</span>
                    <h2 className={styles.cardHeading}>Secure your account</h2>
                    <p className={styles.cardSubtext}>
                      Set a secure password for <strong style={{ color: "var(--color-text)" }}>{email}</strong>. This credential protects all grading, questions, and system settings.
                    </p>
                  </div>

                  {error && (
                    <div className={styles.alertError}>
                      <WarningIcon width="16" height="16" />
                      <span>{error}</span>
                    </div>
                  )}

                  <form onSubmit={onSubmit} className={styles.form}>
                    <div className={styles.inputGroup}>
                      <label className={styles.inputLabel} htmlFor="admin-password">
                        Password
                      </label>
                      <div className={styles.inputWrapper}>
                        <svg className={styles.inputIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0110 0v4" />
                        </svg>
                        <input
                          id="admin-password"
                          type={showPassword ? "text" : "password"}
                          className={styles.inputField}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder={`Minimum ${MIN_PASSWORD_LENGTH} characters`}
                          minLength={MIN_PASSWORD_LENGTH}
                          autoComplete="new-password"
                          required
                          autoFocus
                          style={{ paddingRight: "2.75rem" }}
                        />
                        <button
                          type="button"
                          className={styles.passwordToggle}
                          onClick={() => setShowPassword(!showPassword)}
                          aria-label={showPassword ? "Hide password" : "Show password"}
                        >
                          {showPassword ? (
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                          ) : (
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                          )}
                        </button>
                      </div>
                    </div>

                    <div className={styles.inputGroup}>
                      <label className={styles.inputLabel} htmlFor="admin-confirm-password">
                        Confirm Master Password
                      </label>
                      <div className={styles.inputWrapper}>
                        <svg className={styles.inputIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                        <input
                          id="admin-confirm-password"
                          type={showConfirmPassword ? "text" : "password"}
                          className={styles.inputField}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Re-enter master password"
                          required
                          style={{ paddingRight: "2.75rem" }}
                        />
                        <button
                          type="button"
                          className={styles.passwordToggle}
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                        >
                          {showConfirmPassword ? (
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                          ) : (
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                          )}
                        </button>
                      </div>
                    </div>

                    <div className={styles.btnRow}>
                      <button type="button" className={styles.btnSecondary} onClick={() => setStep(1)}>
                        ← Back to Profile
                      </button>
                      <button type="submit" className={styles.btnPrimary} disabled={submitting}>
                        {submitting ? (
                          <>
                            <div className="spinner" style={{ width: "16px", height: "16px", borderWidth: "2px" }} />
                            <span>Provisioning Server…</span>
                          </>
                        ) : (
                          <>
                            <span>Complete & Launch Hub</span>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {step === 3 && (
                <div className={styles.successState}>
                  <div className={styles.successIconPulse}>
                    <CheckCircleIcon width="56" height="56" />
                  </div>
                  <h2 className={styles.successHeading}>Server Provisioned Successfully</h2>
                  <p className={styles.successText}>
                    The master operator account for <strong>{name}</strong> is now initialized and authenticated.
                  </p>
                  <div className={styles.redirectBadge}>
                    <div className="spinner" style={{ width: "14px", height: "14px", borderWidth: "2px" }} />
                    <span>Redirecting to Operator Dashboard…</span>
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
