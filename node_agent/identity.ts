import fs from "fs";
import path from "path";
import { randomBytes } from "node:crypto";

export interface NodeIdentity {
  installationId: string;
  nodeId: string;
  secretKey: string;
  cloudEndpoint: string;
}

const IDENTITY_FILE_PATH = path.join(import.meta.dir, "..", "node_identity.json");

/**
 * Loads or initializes the machine identity for this local ACAD installation.
 */
export function getOrCreateNodeIdentity(): NodeIdentity {
  // 1. Check environment variables first
  const envInstallId = Bun.env.ACAD_INSTALLATION_ID;
  const envSecretKey = Bun.env.ACAD_INSTALLATION_SECRET;
  const envEndpoint = Bun.env.ACAD_CLOUD_ENDPOINT || "http://localhost:8001";
  const envNodeId = Bun.env.ACAD_NODE_ID || "NODE-PRIMARY";

  if (envInstallId && envSecretKey) {
    return {
      installationId: envInstallId,
      nodeId: envNodeId,
      secretKey: envSecretKey,
      cloudEndpoint: envEndpoint,
    };
  }

  // 2. Check local disk configuration
  if (fs.existsSync(IDENTITY_FILE_PATH)) {
    try {
      const raw = fs.readFileSync(IDENTITY_FILE_PATH, "utf8");
      const parsed = JSON.parse(raw);
      if (parsed.installationId && parsed.secretKey) {
        return parsed;
      }
    } catch {
      // Re-create if corrupt
    }
  }

  // 3. Generate default development identity
  const identity: NodeIdentity = {
    installationId: `INST-DEV-${randomBytes(3).toString("hex").toUpperCase()}`,
    nodeId: "NODE-LOCAL-01",
    secretKey: `node_sec_${randomBytes(16).toString("hex")}`,
    cloudEndpoint: envEndpoint,
  };

  try {
    fs.writeFileSync(IDENTITY_FILE_PATH, JSON.stringify(identity, null, 2), "utf8");
  } catch (err) {
    console.warn("⚠️ [Node Agent] Unable to persist node_identity.json to disk:", err);
  }

  return identity;
}
