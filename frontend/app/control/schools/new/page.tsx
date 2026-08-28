"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import styles from "../../control.module.css";
import { controlApi } from "../../../../lib/controlApi";

export default function NewSchoolProvisionPage() {
  const router = useRouter();
  const [orgs, setOrgs] = useState<any[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<number | string>("");
  const [newOrgName, setNewOrgName] = useState("");
  const [showNewOrg, setShowNewOrg] = useState(false);

  // School Form
  const [name, setName] = useState("");
  const [schoolCode, setSchoolCode] = useState("");
  const [location, setLocation] = useState("");
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPhone, setAdminPhone] = useState("");
  const [trialDays, setTrialDays] = useState(30);
  const [studentLimit, setStudentLimit] = useState(250);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    controlApi
      .getOrganizations()
      .then((res) => {
        const list = res.organizations || [];
        setOrgs(list);
        if (list.length > 0) setSelectedOrgId(list[0].id);
        else setShowNewOrg(true);
      })
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !schoolCode) return;
    setError(null);
    setLoading(true);

    try {
      let orgId = Number(selectedOrgId);
      if (showNewOrg && newOrgName.trim()) {
        const slug = newOrgName.toLowerCase().replace(/[^a-z0-9]+/g, "-");
        const orgRes = await controlApi.createOrganization({
          name: newOrgName.trim(),
          slug,
          contact_name: adminName || "Administrator",
          contact_email: adminEmail || "admin@acad.ng",
          contact_phone: adminPhone || "+234 800 000 0000",
        });
        orgId = orgRes.organization.id;
      }

      if (!orgId) throw new Error("Please select or create an organization.");

      const res = await controlApi.createSchool({
        org_id: orgId,
        school_code: schoolCode.toUpperCase().trim(),
        name: name.trim(),
        location: location.trim(),
        status: "trial",
        primary_admin_name: adminName.trim(),
        primary_admin_email: adminEmail.trim(),
        primary_admin_phone: adminPhone.trim(),
        trial_duration_days: trialDays,
        trial_student_limit: studentLimit,
      });

      if (res?.school?.id) {
        router.push(`/control/schools/${res.school.id}`);
      } else {
        router.push("/control/schools");
      }
    } catch (err: any) {
      setError(err.message || "Failed to provision school.");
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: "700px", margin: "0 auto" }}>
      {/* ── Breadcrumb ── */}
      <div style={{ marginBottom: "1rem" }}>
        <Link href="/control/schools" style={{ fontSize: "0.8125rem", color: "#60A5FA", textDecoration: "none" }}>
          ← Back to Schools
        </Link>
      </div>

      <div style={{ background: "#0F172A", border: "1px solid #1E293B", borderRadius: "12px", padding: "2rem" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <h1 style={{ fontSize: "1.25rem", fontWeight: 800, color: "#FFFFFF" }}>Provision New School Campus</h1>
          <p style={{ fontSize: "0.8125rem", color: "#64748B", marginTop: "0.2rem" }}>
            Register a new institution, generate deployment parameters, and initiate free trial.
          </p>
        </div>

        {error && (
          <div style={{ background: "rgba(239, 68, 68, 0.12)", border: "1px solid rgba(239, 68, 68, 0.3)", color: "#F87171", padding: "0.75rem", borderRadius: "6px", fontSize: "0.8125rem", marginBottom: "1.25rem" }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {/* ── Organization Selection ── */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.35rem" }}>
              <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "#94A3B8" }}>
                Educational Organization / Group
              </label>
              <button
                type="button"
                onClick={() => setShowNewOrg(!showNewOrg)}
                style={{ background: "none", border: "none", color: "#60A5FA", fontSize: "0.75rem", cursor: "pointer" }}
              >
                {showNewOrg ? "Select Existing" : "+ New Group"}
              </button>
            </div>

            {showNewOrg ? (
              <input
                type="text"
                placeholder="Organization Name (e.g. Greenfield Educational Trust)"
                value={newOrgName}
                onChange={(e) => setNewOrgName(e.target.value)}
                className={styles.input}
                style={{ width: "100%" }}
                required
              />
            ) : (
              <select
                value={selectedOrgId}
                onChange={(e) => setSelectedOrgId(e.target.value)}
                className={styles.input}
                style={{ width: "100%" }}
                required
              >
                {orgs.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name} ({o.country})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* ── School Details ── */}
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "1rem" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "#94A3B8", marginBottom: "0.35rem" }}>
                School Name
              </label>
              <input
                type="text"
                placeholder="e.g. Greenfield College, Victoria Island"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={styles.input}
                style={{ width: "100%" }}
                required
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "#94A3B8", marginBottom: "0.35rem" }}>
                School Code
              </label>
              <input
                type="text"
                placeholder="e.g. GFC-01"
                value={schoolCode}
                onChange={(e) => setSchoolCode(e.target.value.toUpperCase())}
                className={styles.input}
                style={{ width: "100%" }}
                required
              />
            </div>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "#94A3B8", marginBottom: "0.35rem" }}>
              Location / City / State
            </label>
            <input
              type="text"
              placeholder="e.g. Victoria Island, Lagos State"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className={styles.input}
              style={{ width: "100%" }}
            />
          </div>

          {/* ── Primary Administrator Contacts ── */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "#94A3B8", marginBottom: "0.35rem" }}>
                Primary Admin Name
              </label>
              <input
                type="text"
                placeholder="e.g. Principal T. Bakare"
                value={adminName}
                onChange={(e) => setAdminName(e.target.value)}
                className={styles.input}
                style={{ width: "100%" }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "#94A3B8", marginBottom: "0.35rem" }}>
                Admin Email
              </label>
              <input
                type="email"
                placeholder="admin@school.edu.ng"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                className={styles.input}
                style={{ width: "100%" }}
              />
            </div>
          </div>

          {/* ── Initial Trial Allocation ── */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "#94A3B8", marginBottom: "0.35rem" }}>
                Trial Duration (Days)
              </label>
              <input
                type="number"
                value={trialDays}
                onChange={(e) => setTrialDays(Number(e.target.value))}
                className={styles.input}
                style={{ width: "100%" }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "#94A3B8", marginBottom: "0.35rem" }}>
                Student Quota Limit
              </label>
              <input
                type="number"
                value={studentLimit}
                onChange={(e) => setStudentLimit(Number(e.target.value))}
                className={styles.input}
                style={{ width: "100%" }}
              />
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "1rem" }}>
            <Link href="/control/schools" className={`${styles.btn} ${styles.btnSecondary}`}>
              Cancel
            </Link>
            <button type="submit" disabled={loading} className={`${styles.btn} ${styles.btnPrimary}`}>
              {loading ? "Provisioning…" : "Provision School & Issue Trial"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
