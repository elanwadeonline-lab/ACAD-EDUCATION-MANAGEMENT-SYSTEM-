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

export const DEFAULT_CLOUD_ENDPOINT = "https://acad-controll.onrender.com";

export function getCloudEndpointFromEnv(): string {
  const env =
    Bun.env.ACAD_CLOUD_ENDPOINT ||
    Bun.env.CONTROL_API_URL ||
    Bun.env.SUPERVISORY_URL ||
    Bun.env.NEXT_PUBLIC_CONTROL_API_URL ||
    "";
  return env.replace(/\/+$/, "");
}

/**
 * Loads or initializes the machine identity for this local ACAD installation.
 */
export function getOrCreateNodeIdentity(): NodeIdentity {
  const envEndpoint = getCloudEndpointFromEnv();
  const fallbackEndpoint = DEFAULT_CLOUD_ENDPOINT;

  // 1. Check environment variables first
  const envInstallId = Bun.env.ACAD_INSTALLATION_ID;
  const envSecretKey = Bun.env.ACAD_INSTALLATION_SECRET;
  const envNodeId = Bun.env.ACAD_NODE_ID || "NODE-PRIMARY";

  if (envInstallId && envSecretKey) {
    return {
      installationId: envInstallId,
      nodeId: envNodeId,
      secretKey: envSecretKey,
      cloudEndpoint: envEndpoint || fallbackEndpoint,
    };
  }

  // 2. Check local disk configuration
  if (fs.existsSync(IDENTITY_FILE_PATH)) {
    try {
      const raw = fs.readFileSync(IDENTITY_FILE_PATH, "utf8");
      const parsed = JSON.parse(raw);
      if (parsed.installationId && parsed.secretKey) {
        if (envEndpoint) {
          parsed.cloudEndpoint = envEndpoint;
        } else if (!parsed.cloudEndpoint || parsed.cloudEndpoint.includes("localhost:8001")) {
          parsed.cloudEndpoint = fallbackEndpoint;
        }
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
    cloudEndpoint: envEndpoint || fallbackEndpoint,
  };

  try {
    fs.writeFileSync(IDENTITY_FILE_PATH, JSON.stringify(identity, null, 2), "utf8");
  } catch (err) {
    console.warn("⚠️ [Node Agent] Unable to persist node_identity.json to disk:", err);
  }

  return identity;
}

/**
 * Updates the cloudEndpoint in node_identity.json
 */
export function setCloudEndpoint(url: string): NodeIdentity {
  const current = getOrCreateNodeIdentity();
  current.cloudEndpoint = url.replace(/\/+$/, "");
  try {
    fs.writeFileSync(IDENTITY_FILE_PATH, JSON.stringify(current, null, 2), "utf8");
    console.log(`✅ [Node Agent] Updated cloud supervisory endpoint to: ${current.cloudEndpoint}`);
  } catch (err) {
    console.error("⚠️ [Node Agent] Failed to save updated endpoint to node_identity.json:", err);
  }
  return current;
}
