"use client";

import { FormEvent, useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "../../../lib/api";
import { WarningIcon, AcadBrandIcon, CheckCircleIcon } from "../../../components/icons/Icons";
import styles from "./page.module.css";

export default function GuardianRegisterPage() {
  return (
    <Suspense
      fallback={
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div className="spinner" />
        </div>
      }
    >
      <GuardianRegisterContent />
    </Suspense>
  );
}

function GuardianRegisterContent() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [relationship, setRelationship] = useState("Parent");
  const [studentRegId, setStudentRegId] = useState("");
  const [address, setAddress] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [successRegId, setSuccessRegId] = useState("");

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const payload: any = {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        role: "guardian",
        phone: phone.trim(),
        relationship,
        address: address.trim() || null,
      };

      if (studentRegId.trim()) {
        payload.student_reg_id = studentRegId.trim();
      }

      const res = await api.register(payload);
      setSuccessRegId(res.user?.reg_id || res.data?.user?.reg_id || "GDN-PORTAL");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        {/* Left Informational Sidebar */}
        <div className={styles.leftPane}>
          <div className={styles.brand}>
            <div className={styles.brandIcon}>
              <AcadBrandIcon width="24" height="24" />
            </div>
            ExamPool Guardian
          </div>

          <div className={styles.heroText}>
            <h1>Stay closely connected with your ward&#39;s academic journey.</h1>
            <p>
              Receive real-time attendance alerts, view grade releases, communicate with subject teachers, and track progress all in one secure portal.
            </p>
          </div>

          <div className={styles.featureList}>
            <div className={styles.featureItem}>
              <div className={styles.featureIcon}>🔔</div>
              <div>
                <strong>Live Attendance Pings</strong>
                <span>Instant notifications when morning roll call is taken.</span>
              </div>
            </div>
            <div className={styles.featureItem}>
              <div className={styles.featureIcon}>📊</div>
              <div>
                <strong>Verified Result Releases</strong>
                <span>Official report cards with tamper-proof validation.</span>
              </div>
            </div>
            <div className={styles.featureItem}>
              <div className={styles.featureIcon}>💬</div>
              <div>
                <strong>Direct Teacher Messaging</strong>
                <span>Engage form masters and course instructors privately.</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Form Card */}
        <div className={styles.rightPane}>
          <div className={styles.formCard}>
            {successRegId ? (
              <div className={styles.successState}>
                <div className={styles.successIconBox}>
                  <CheckCircleIcon width="48" height="48" style={{ color: "#059669" }} />
                </div>
                <h2>Guardian Account Created!</h2>
                <p>
                  Your registration is complete. Your Guardian Reference ID is:
                </p>
                <div className={styles.regIdBox}>
                  <span>{successRegId}</span>
                </div>
                {studentRegId.trim() && (
                  <p className={styles.wardLinkedNote}>
                    Linked student registration: <strong>{studentRegId.trim().toUpperCase()}</strong>
                  </p>
                )}
                <button
                  type="button"
                  className={styles.submitBtn}
                  onClick={() => router.push("/guardian")}
                >
                  Proceed to Guardian Portal →
                </button>
              </div>
            ) : (
              <>
                <div className={styles.header}>
                  <h2>Guardian Registration</h2>
                  <p>
                    Already have an account?{" "}
                    <Link href="/guardian" className={styles.link}>
                      Sign in here
                    </Link>
                  </p>
                </div>

                {error && (
                  <div className={styles.errorBanner}>
                    <WarningIcon width="16" height="16" />
                    <span>{error}</span>
                  </div>
                )}

                <form className={styles.form} onSubmit={onSubmit}>
                  <div className={styles.field}>
                    <label>Guardian Full Name <span className={styles.req}>*</span></label>
                    <input
                      className={styles.input}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Mr. Babatunde Adeleke"
                      required
                    />
                  </div>

                  <div className={styles.row}>
                    <div className={styles.field} style={{ flex: 1 }}>
                      <label>Email Address <span className={styles.req}>*</span></label>
                      <input
                        className={styles.input}
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="parent@example.com"
                        required
                      />
                    </div>
                    <div className={styles.field} style={{ flex: 1 }}>
                      <label>Phone / WhatsApp <span className={styles.req}>*</span></label>
                      <input
                        className={styles.input}
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+234 800 000 0000"
                        required
                      />
                    </div>
                  </div>

                  <div className={styles.row}>
                    <div className={styles.field} style={{ flex: 1 }}>
                      <label>Relationship to Ward</label>
                      <select
                        className={styles.select}
                        value={relationship}
                        onChange={(e) => setRelationship(e.target.value)}
                      >
                        <option value="Parent">Parent</option>
                        <option value="Father">Father</option>
                        <option value="Mother">Mother</option>
                        <option value="Guardian">Legal Guardian</option>
                        <option value="Uncle/Aunt">Uncle / Aunt</option>
                        <option value="Sibling">Elder Sibling</option>
                        <option value="Sponsor">Sponsor</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    <div className={styles.field} style={{ flex: 1 }}>
                      <label>Ward Reg ID (Optional)</label>
                      <input
                        className={styles.input}
                        value={studentRegId}
                        onChange={(e) => setStudentRegId(e.target.value)}
                        placeholder="e.g. REG-ABC123"
                      />
                    </div>
                  </div>

                  <div className={styles.field}>
                    <label>Password <span className={styles.req}>*</span></label>
                    <input
                      className={styles.input}
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Create a strong password (min 8 chars)"
                      required
                      minLength={8}
                    />
                  </div>

                  <div className={styles.field}>
                    <label>Residential Address (Optional)</label>
                    <input
                      className={styles.input}
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="e.g. 14 Crescent Avenue, Ikeja, Lagos"
                    />
                  </div>

                  <button
                    type="submit"
                    className={styles.submitBtn}
                    disabled={submitting}
                  >
                    {submitting ? "Registering…" : "Create Guardian Account →"}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
