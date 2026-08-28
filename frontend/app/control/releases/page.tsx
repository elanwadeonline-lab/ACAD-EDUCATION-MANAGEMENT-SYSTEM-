"use client";

import React, { useEffect, useState } from "react";
import styles from "../control.module.css";
import { controlApi } from "../../../lib/controlApi";

export default function ControlReleasesPage() {
  const [releases, setReleases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [broadcastingId, setBroadcastingId] = useState<number | null>(null);

  // New Release Form State
  const [version, setVersion] = useState("");
  const [channel, setChannel] = useState("stable");
  const [notes, setNotes] = useState("");
  const [downloadUrl, setDownloadUrl] = useState("");
  const [sha256, setSha256] = useState("");
  const [isSecurity, setIsSecurity] = useState(false);
  const [broadcastOnPublish, setBroadcastOnPublish] = useState(false);

  const loadReleases = () => {
    setLoading(true);
    controlApi
      .getReleases()
      .then((res) => setReleases(res.releases || []))
      .catch((err) => console.error("Failed to load releases:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadReleases();
  }, []);

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!version) return;
    try {
      const res = await controlApi.createRelease({
        version: version.trim(),
        release_channel: channel,
        release_notes: notes.trim(),
        download_url: downloadUrl.trim() || undefined,
        sha256_hash: sha256.trim() || undefined,
        is_critical_security: isSecurity,
      });

      if (broadcastOnPublish && res?.release?.version) {
        await controlApi.broadcastRelease({
          version: res.release.version,
          release_notes: res.release.release_notes,
          download_url: res.release.download_url,
          sha256_hash: res.release.sha256_hash,
        });
        alert(`Version v${res.release.version} published and broadcasted to all school nodes in the fleet!`);
      } else {
        alert(`Version v${version.trim()} published successfully.`);
      }

      setVersion("");
      setNotes("");
      setDownloadUrl("");
      setSha256("");
      setIsSecurity(false);
      setBroadcastOnPublish(false);
      loadReleases();
    } catch (err: any) {
      alert(err.message || "Failed to publish release.");
    }
  };

  const handleBroadcastRelease = async (rel: any) => {
    if (!confirm(`Are you sure you want to broadcast v${rel.version} to ALL active school nodes across the entire fleet? Nodes will receive this update upon next connection.`)) {
      return;
    }

    setBroadcastingId(rel.id);
    try {
      const res = await controlApi.broadcastRelease({
        version: rel.version,
        release_notes: rel.release_notes,
        download_url: rel.download_url,
        sha256_hash: rel.sha256_hash,
      });
      alert(res.message || `Broadcast queued for ${res.nodes_targeted || 0} nodes.`);
    } catch (err: any) {
      alert(err.message || "Failed to broadcast release.");
    } finally {
      setBroadcastingId(null);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ fontSize: "1.25rem", fontWeight: 800, color: "#FFFFFF" }}>
          Software Releases &amp; CI/CD Distribution Channels
        </h1>
        <p style={{ fontSize: "0.8125rem", color: "#64748B", marginTop: "0.2rem" }}>
          Manage ACAD versions, canary/beta channels, hotfixes, and deploy over-the-air (OTA) updates to connected school campuses.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "1.5rem", alignItems: "start" }}>
        {/* Left: Releases List */}
        <div className={styles.tableContainer}>
          <div className={styles.tableHeader}>
            <div className={styles.tableTitle}>Published Versions &amp; Deployments</div>
            <span className={styles.mono} style={{ fontSize: "0.6875rem", color: "#34D399" }}>
              Fleet CI/CD Engine Active
            </span>
          </div>

          <table className={styles.table}>
            <thead>
              <tr>
                <th>Version</th>
                <th>Channel</th>
                <th>Release Notes</th>
                <th>Released At</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", padding: "3rem", color: "#64748B" }}>Loading releases…</td>
                </tr>
              ) : releases.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", padding: "3rem", color: "#64748B" }}>No releases published yet.</td>
                </tr>
              ) : (
                releases.map((rel) => (
                  <tr key={rel.id}>
                    <td>
                      <span className={styles.mono} style={{ fontWeight: 700, color: "#60A5FA" }}>
                        v{rel.version}
                      </span>
                      {rel.is_critical_security === 1 && (
                        <span
                          className={styles.statusBadge}
                          style={{ marginLeft: "0.5rem", background: "rgba(239, 68, 68, 0.15)", color: "#F87171" }}
                        >
                          Security Hotfix
                        </span>
                      )}
                    </td>
                    <td>
                      <span className={styles.mono} style={{ textTransform: "uppercase" }}>
                        {rel.release_channel}
                      </span>
                    </td>
                    <td style={{ fontSize: "0.75rem", color: "#CBD5E1", maxWidth: "250px" }}>
                      {rel.release_notes || "—"}
                    </td>
                    <td className={styles.mono}>{new Date(rel.released_at).toLocaleDateString()}</td>
                    <td>
                      <button
                        disabled={broadcastingId === rel.id}
                        onClick={() => handleBroadcastRelease(rel)}
                        className={`${styles.btn} ${styles.btnPrimary}`}
                        style={{ fontSize: "0.6875rem", padding: "0.3rem 0.6rem" }}
                      >
                        {broadcastingId === rel.id ? "Broadcasting…" : "Push OTA to Fleet"}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Right: Publish Form */}
        <div className={styles.tableContainer} style={{ padding: "1.25rem" }}>
          <div className={styles.tableTitle} style={{ marginBottom: "1rem" }}>
            Publish New Version
          </div>

          <form onSubmit={handlePublish} style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "#94A3B8", marginBottom: "0.25rem" }}>
                Version Tag
              </label>
              <input
                type="text"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                className={styles.input}
                style={{ width: "100%" }}
                placeholder="e.g. 5.4.0"
                required
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "#94A3B8", marginBottom: "0.25rem" }}>
                Channel
              </label>
              <select
                value={channel}
                onChange={(e) => setChannel(e.target.value)}
                className={styles.input}
                style={{ width: "100%" }}
              >
                <option value="stable">Stable (General Availability)</option>
                <option value="beta">Beta (Early Access)</option>
                <option value="canary">Canary (Nightly Testing)</option>
              </select>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "#94A3B8", marginBottom: "0.25rem" }}>
                Package Download URL (Optional)
              </label>
              <input
                type="text"
                value={downloadUrl}
                onChange={(e) => setDownloadUrl(e.target.value)}
                className={styles.input}
                style={{ width: "100%" }}
                placeholder="https://releases.acad.ng/v5.4.0.tar.gz"
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "#94A3B8", marginBottom: "0.25rem" }}>
                Changelog / Release Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className={styles.input}
                style={{ width: "100%", height: "70px" }}
                placeholder="Key improvements, bug fixes, and new features…"
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <input
                  type="checkbox"
                  id="securityCheck"
                  checked={isSecurity}
                  onChange={(e) => setIsSecurity(e.target.checked)}
                />
                <label htmlFor="securityCheck" style={{ fontSize: "0.75rem", color: "#F87171", cursor: "pointer" }}>
                  Mark as Critical Security Patch
                </label>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <input
                  type="checkbox"
                  id="broadcastCheck"
                  checked={broadcastOnPublish}
                  onChange={(e) => setBroadcastOnPublish(e.target.checked)}
                />
                <label htmlFor="broadcastCheck" style={{ fontSize: "0.75rem", color: "#60A5FA", cursor: "pointer" }}>
                  Immediately Push OTA to All Fleet Nodes
                </label>
              </div>
            </div>

            <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`} style={{ width: "100%", justifyContent: "center", marginTop: "0.5rem" }}>
              Publish Release
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
