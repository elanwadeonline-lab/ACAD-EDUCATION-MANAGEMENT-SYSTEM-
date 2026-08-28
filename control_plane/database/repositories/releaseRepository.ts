import { controlDb } from "../client";
import type { SoftwareRelease, ReleaseChannel } from "../../types";

export const releaseRepository = {
  listAll(): SoftwareRelease[] {
    return controlDb.prepare("SELECT * FROM software_releases ORDER BY released_at DESC").all() as SoftwareRelease[];
  },

  getLatest(channel: ReleaseChannel = "stable"): SoftwareRelease | null {
    return (
      (controlDb
        .prepare("SELECT * FROM software_releases WHERE release_channel = ? ORDER BY id DESC LIMIT 1")
        .get(channel) as any) || null
    );
  },

  create(data: {
    version: string;
    release_channel?: ReleaseChannel;
    min_agent_version?: string;
    release_notes?: string;
    download_url?: string;
    sha256_hash?: string;
    is_critical_security?: boolean;
  }): SoftwareRelease {
    const res = controlDb
      .prepare(
        `INSERT INTO software_releases (
           version, release_channel, min_agent_version, release_notes,
           download_url, sha256_hash, is_critical_security
         ) VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        data.version.trim(),
        data.release_channel || "stable",
        data.min_agent_version || "1.0.0",
        data.release_notes || null,
        data.download_url || null,
        data.sha256_hash || null,
        data.is_critical_security ? 1 : 0
      );
    return (controlDb.prepare("SELECT * FROM software_releases WHERE id = ?").get(Number(res.lastInsertRowid)) as any)!;
  },
};
