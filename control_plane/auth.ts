import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { PlatformUser, PlatformRole } from "./types";
import { userRepository } from "./database/repositories/userRepository";

const PLATFORM_JWT_SECRET =
  Bun.env.CONTROL_PLANE_JWT_SECRET || "acad_control_supervisory_secret_key_84920491823901";

const PLATFORM_TOKEN_TTL_SECONDS = 12 * 60 * 60; // 12 hours

function toBase64Url(input: string): string {
  return Buffer.from(input, "utf8").toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(input: string): string {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((input.length + 3) % 4);
  return Buffer.from(padded, "base64").toString("utf8");
}

function hmacSha256(signingInput: string): Buffer {
  return createHmac("sha256", PLATFORM_JWT_SECRET).update(signingInput, "utf8").digest();
}

export interface PlatformJwtPayload {
  platformUserId: number;
  email: string;
  name: string;
  role: PlatformRole;
  exp: number;
  iat: number;
}

export function generatePlatformToken(user: PlatformUser): string {
  const now = Math.floor(Date.now() / 1000);
  const header = toBase64Url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload: PlatformJwtPayload = {
    platformUserId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    iat: now,
    exp: now + PLATFORM_TOKEN_TTL_SECONDS,
  };
  const payloadEncoded = toBase64Url(JSON.stringify(payload));
  const signature = hmacSha256(`${header}.${payloadEncoded}`);
  const sigEncoded = signature.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  return `${header}.${payloadEncoded}.${sigEncoded}`;
}

export function verifyPlatformToken(token: string): PlatformJwtPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const [header, payload, sig] = parts;

    const expectedSig = hmacSha256(`${header}.${payload}`);
    const padLen = (4 - (sig.length % 4)) % 4;
    const padded = sig + "=".repeat(padLen === 4 ? 0 : padLen);
    const providedSigBuf = Buffer.from(padded.replace(/-/g, "+").replace(/_/g, "/"), "base64");

    if (providedSigBuf.length !== expectedSig.length || !timingSafeEqual(providedSigBuf, expectedSig)) {
      return null;
    }

    const payloadObj = JSON.parse(fromBase64Url(payload)) as PlatformJwtPayload;
    const now = Math.floor(Date.now() / 1000);
    if (payloadObj.exp < now) return null;

    return payloadObj;
  } catch {
    return null;
  }
}

export function parseCookies(cookieHeader: string | null): Record<string, string> {
  if (!cookieHeader) return {};
  const cookies: Record<string, string> = {};
  for (const pair of cookieHeader.split(";")) {
    const [k, v] = pair.trim().split("=");
    if (k && v) cookies[k] = decodeURIComponent(v);
  }
  return cookies;
}

export function requirePlatformAuth(req: Request): PlatformJwtPayload {
  // 1. Check Authorization Bearer header
  const authHeader = req.headers.get("authorization");
  let token: string | null = null;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.slice(7).trim();
  }

  // 2. Fallback to acad_platform_token cookie
  if (!token) {
    const cookies = parseCookies(req.headers.get("cookie"));
    token = cookies["acad_platform_token"] || null;
  }

  // 3. Fallback to token query parameter (for SSE EventSource)
  if (!token) {
    try {
      const url = new URL(req.url);
      token = url.searchParams.get("token") || null;
    } catch {}
  }

  if (!token) {
    throw new Error("UNAUTHORIZED: Platform authentication required");
  }

  const payload = verifyPlatformToken(token);
  if (!payload) {
    throw new Error("UNAUTHORIZED: Invalid or expired platform token");
  }

  // Verify platform user is still active in database
  const user = userRepository.findById(payload.platformUserId);
  if (!user || !user.is_active) {
    throw new Error("UNAUTHORIZED: Platform user account is inactive or revoked");
  }

  return payload;
}

const ROLE_HIERARCHY: Record<PlatformRole, number> = {
  auditor: 1,
  support_agent: 2,
  ops_engineer: 3,
  admin: 4,
  owner: 5,
};

export function requirePlatformRole(userRole: PlatformRole, allowedRoles: PlatformRole[]): void {
  if (!allowedRoles.includes(userRole) && userRole !== "owner") {
    throw new Error(`FORBIDDEN: Requires one of [${allowedRoles.join(", ")}] platform role`);
  }
}
