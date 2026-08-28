import { initializeControlPlaneSchema } from "./schema";
import { userRepository } from "./repositories/userRepository";
import { releaseRepository } from "./repositories/releaseRepository";
import { hashPassword } from "../../auth";

export async function seedControlPlane(): Promise<void> {
  initializeControlPlaneSchema();

  // 1. Seed Default Platform Operators if not exists
  const existingOwner = userRepository.findByEmail("owner@acad.ng");
  if (!existingOwner) {
    const passwordHash = await hashPassword("AdminPassword123!");
    userRepository.create("ACAD Platform Owner", "owner@acad.ng", passwordHash, "owner");
    userRepository.create("Chief Systems Engineer", "ops@acad.ng", passwordHash, "ops_engineer");
    userRepository.create("Customer Success Lead", "support@acad.ng", passwordHash, "support_agent");
    console.log("⚡ [Control Plane] Platform users initialized (owner@acad.ng, ops@acad.ng, support@acad.ng)");
  }

  // 2. Ensure Initial Software Release Record exists
  const releases = releaseRepository.listAll();
  if (releases.length === 0) {
    releaseRepository.create({
      version: "5.3.0",
      release_channel: "stable",
      min_agent_version: "1.0.0",
      release_notes: "Production GA release featuring real-time supervisory telemetry, dynamic modular gating, and automated sync.",
      is_critical_security: false,
    });
  }
}
