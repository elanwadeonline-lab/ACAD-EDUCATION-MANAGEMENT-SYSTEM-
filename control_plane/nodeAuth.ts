import { createHmac, timingSafeEqual } from "node:crypto";
import { installationRepository } from "./database/repositories/installationRepository";

export interface NodeAuthResult {
  valid: boolean;
  installationId?: string;
  error?: string;
}

/**
 * Validates HMAC signature for incoming Node Agent requests.
 * Headers required:
 * - X-ACAD-Installation-Id
 * - X-ACAD-Timestamp (Unix epoch in seconds)
 * - X-ACAD-Signature (HMAC-SHA256 of installId + timestamp + body)
 */
export function verifyNodeAuth(req: Request, rawBody: string): NodeAuthResult {
  const installationId = req.headers.get("x-acad-installation-id");
  const timestampHeader = req.headers.get("x-acad-timestamp");
  const signature = req.headers.get("x-acad-signature");

  if (!installationId || !timestampHeader || !signature) {
    return { valid: false, error: "Missing required node authentication headers" };
  }

  const timestamp = Number(timestampHeader);
  if (isNaN(timestamp)) {
    return { valid: false, error: "Invalid timestamp header" };
  }

  // 1. Replay attack protection: reject timestamps drifting by > 5 minutes
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - timestamp) > 300) {
    return { valid: false, error: "Request timestamp expired or out of sync (> 5 min)" };
  }

  // 2. Fetch installation from database
  const installation = installationRepository.findByInstallationId(installationId);
  if (!installation) {
    return { valid: false, error: "Installation ID not recognized" };
  }

  if (installation.is_revoked) {
    return { valid: false, error: "Installation credentials have been revoked by platform administrator" };
  }

  // 3. Verify HMAC signature using secret_key_hash as HMAC key
  const secretKey = installation.secret_key_hash || installation.installation_id;
  const expectedSig = createHmac("sha256", secretKey)
    .update(`${installationId}:${timestamp}:${rawBody}`)
    .digest("hex");

  try {
    const providedBuf = Buffer.from(signature, "hex");
    const expectedBuf = Buffer.from(expectedSig, "hex");

    if (providedBuf.length !== expectedBuf.length || !timingSafeEqual(providedBuf, expectedBuf)) {
      return { valid: false, error: "Invalid HMAC signature" };
    }
  } catch {
    return { valid: false, error: "Signature verification failed" };
  }

  return { valid: true, installationId };
}
