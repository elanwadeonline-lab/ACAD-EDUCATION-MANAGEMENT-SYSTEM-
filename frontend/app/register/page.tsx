"use client";

import { FormEvent, useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { api } from "../../lib/api";
import { WarningIcon } from "../../components/icons/Icons";
import { GradeLevel } from "../../lib/types";
import styles from "./page.module.css";

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div className="spinner" />
        </div>
      }
    >
      <RegisterContent />
    </Suspense>
  );
}

function RegisterContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialRoleParam = searchParams.get("role");

  const [role, setRole] = useState<"student" | "teacher" | "guardian">(
    initialRoleParam === "teacher"
      ? "teacher"
      : initialRoleParam === "guardian"
      ? "guardian"
      : "student"
  );
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [gradeLevelId, setGradeLevelId] = useState("");
  const [gradeLevels, setGradeLevels] = useState<GradeLevel[]>([]);
  const [dob, setDob] = useState("");
  const [phone, setPhone] = useState("");
  const [relationship, setRelationship] = useState("Parent");
  const [studentRegId, setStudentRegId] = useState("");
  const [address, setAddress] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [successRegId, setSuccessRegId] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    api
      .getGradeLevels()
      .then((res) => {
        if (!controller.signal.aborted) {
          setGradeLevels(res.grades || []);
          if (res.grades?.length > 0 && !gradeLevelId) {
            setGradeLevelId(String(res.grades[0].id));
          }
        }
      })
      .catch((err) => {
        if (!controller.signal.aborted) console.error(err);
      });
    return () => controller.abort();
  }, [gradeLevelId]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const payload: any = {
        name: name.trim(),
        password,
        role,
      };

      if (role === "student") {
        payload.grade_level_id = gradeLevelId ? Number(gradeLevelId) : null;
        payload.dob = dob;
      } else if (role === "teacher") {
        payload.email = email.trim().toLowerCase();
        payload.phone = phone.trim();
      } else if (role === "guardian") {
        payload.email = email.trim().toLowerCase();
        payload.phone = phone.trim();
        payload.relationship = relationship;
        if (studentRegId.trim()) {
          payload.student_reg_id = studentRegId.trim();
        }
        if (address.trim()) {
          payload.address = address.trim();
        }
      }

      const res = await api.register(payload);
      setSuccessRegId(res.user?.reg_id || res.data?.user?.reg_id || "SUCCESS");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setSubmitting(false);
    }
  };

  const getLoginLink = () => {
    if (role === "teacher") return "/teacher";
    if (role === "guardian") return "/guardian";
    return "/";
  };

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <div className={styles.leftPane}>
          <div className={styles.brand}>
            <div className={styles.brandIcon}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
              </svg>
            </div>
            ExamPool
          </div>
          <div className={styles.heroText}>
            <h1>Start your journey with ExamPool.</h1>
            <p>Join thousands of students, educators, and guardians collaborating for academic excellence.</p>
          </div>
          <div className={styles.decorativeCircles}>
            <div className={styles.circle1} />
            <div className={styles.circle2} />
          </div>
        </div>

        <div className={styles.rightPane}>
          <div className={styles.formWrapper}>
            <div className={styles.mobileBrand}>
              <div className={styles.brandIconMobile}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                </svg>
              </div>
              ExamPool
            </div>
            <h2>Create an account</h2>

            {successRegId ? (
              <div style={{ textAlign: "center", marginTop: "2rem" }}>
                <div
                  style={{
                    background: "var(--color-success-subtle, #ECFDF5)",
                    color: "var(--color-success, #059669)",
                    padding: "1rem",
                    borderRadius: "8px",
                    marginBottom: "1.5rem",
                  }}
                >
                  <p style={{ margin: "0 0 0.5rem", fontWeight: 600 }}>Registration Successful!</p>
                  <p style={{ margin: 0, fontSize: "0.9rem" }}>
                    Please save your Registration ID. You can use it to log in or manage your account.
                  </p>
                </div>

                <div
                  style={{
                    fontSize: "1.75rem",
                    fontWeight: 800,
                    letterSpacing: "2px",
                    background: "var(--color-surface, #FFFFFF)",
                    border: "1px solid var(--color-border, #E2E8F0)",
                    padding: "1rem",
                    borderRadius: "8px",
                    marginBottom: "2rem",
                    color: "var(--color-text, #0F172A)",
                  }}
                >
                  {successRegId}
                </div>

                <button
                  className="btn btn-primary"
                  onClick={() => router.push(getLoginLink())}
                  style={{ width: "100%", padding: "0.85rem" }}
                >
                  {role === "teacher"
                    ? "Proceed to Teacher Portal →"
                    : role === "guardian"
                    ? "Proceed to Guardian Portal →"
                    : "Proceed to Student Login →"}
                </button>
              </div>
            ) : (
              <>
                <p className={styles.subtitle}>
                  Already have an account?{" "}
                  <Link href={getLoginLink()} className={styles.link}>
                    Log in
                  </Link>
                </p>

                {error && (
                  <div className={styles.errorBanner}>
                    <WarningIcon width="16" height="16" />
                    {error}
                  </div>
                )}

                <form className={styles.form} onSubmit={onSubmit}>
                  {/* Role Dropdown */}
                  <div className="field">
                    <label htmlFor="role-select">Account Role</label>
                    <select
                      id="role-select"
                      className="select"
                      value={role}
                      onChange={(e) => setRole(e.target.value as "student" | "teacher" | "guardian")}
                    >
                      <option value="student">Student</option>
                      <option value="teacher">Teacher</option>
                      <option value="guardian">Guardian / Parent</option>
                    </select>
                  </div>

                  <div className="field">
                    <label>Full Name</label>
                    <input
                      className="input"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. John Doe"
                      required
                    />
                  </div>

                  {(role === "teacher" || role === "guardian") && (
                    <div className="field">
                      <label>Email Address</label>
                      <input
                        className="input"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder={role === "teacher" ? "teacher@school.edu" : "parent@example.com"}
                        required
                      />
                    </div>
                  )}

                  {role === "student" && (
                    <div className={styles.row}>
                      <div className="field" style={{ flex: 1 }}>
                        <label>Grade / Class</label>
                        <select className="select" value={gradeLevelId} onChange={(e) => setGradeLevelId(e.target.value)} required>
                          <option value="">Select a class...</option>
                          {gradeLevels.map((g) => (
                            <option key={g.id} value={g.id}>
                              {g.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="field" style={{ flex: 1 }}>
                        <label>Date of Birth</label>
                        <input className="input" type="date" value={dob} onChange={(e) => setDob(e.target.value)} required />
                      </div>
                    </div>
                  )}

                  {role === "teacher" && (
                    <div className="field">
                      <label>Phone Number</label>
                      <input className="input" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+234 800 000 0000" required />
                    </div>
                  )}

                  {role === "guardian" && (
                    <>
                      <div className={styles.row}>
                        <div className="field" style={{ flex: 1 }}>
                          <label>Phone Number</label>
                          <input className="input" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+234 800 000 0000" required />
                        </div>
                        <div className="field" style={{ flex: 1 }}>
                          <label>Relationship</label>
                          <select className="select" value={relationship} onChange={(e) => setRelationship(e.target.value)}>
                            <option value="Parent">Parent</option>
                            <option value="Guardian">Guardian</option>
                            <option value="Uncle/Aunt">Uncle / Aunt</option>
                            <option value="Sibling">Sibling</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>
                      </div>
                      <div className="field">
                        <label>
                          Ward&#39;s Registration ID <span style={{ fontSize: "0.75rem", color: "#64748B", fontWeight: 400 }}>(Optional - Link Child)</span>
                        </label>
                        <input
                          className="input"
                          type="text"
                          value={studentRegId}
                          onChange={(e) => setStudentRegId(e.target.value)}
                          placeholder="e.g. REG-2026-001 or Student ID"
                        />
                      </div>
                    </>
                  )}

                  <div className="field">
                    <label>Password</label>
                    <input
                      className="input"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Create a strong password (min 8 chars)"
                      required
                      minLength={8}
                    />
                  </div>

                  <div style={{ display: "flex", justifyContent: "flex-start", marginTop: "0.5rem" }}>
                    <button className="btn btn-primary" type="submit" disabled={submitting} style={{ width: "45%", minWidth: "160px", padding: "0.85rem" }}>
                      {submitting ? "Creating account…" : "Create Account"}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

