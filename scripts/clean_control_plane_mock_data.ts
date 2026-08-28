import { controlDb } from "../control_plane/database/client";
import { initializeControlPlaneSchema } from "../control_plane/database/schema";
import { seedControlPlane } from "../control_plane/database/seed";

console.log("🧹 Initializing and cleaning mock data from acad_control.db...");

initializeControlPlaneSchema();

controlDb.transaction(() => {
  controlDb.run("DELETE FROM sync_queue");
  controlDb.run("DELETE FROM incidents");
  controlDb.run("DELETE FROM alerts");
  controlDb.run("DELETE FROM telemetry_events");
  controlDb.run("DELETE FROM installation_heartbeats");
  controlDb.run("DELETE FROM backups_telemetry");
  controlDb.run("DELETE FROM feature_flags");
  controlDb.run("DELETE FROM licenses");
  controlDb.run("DELETE FROM trials");
  controlDb.run("DELETE FROM installations");
  controlDb.run("DELETE FROM schools");
  controlDb.run("DELETE FROM organizations");
  controlDb.run("DELETE FROM platform_audit_logs");
})();

console.log("🌱 Running clean platform initialization...");
await seedControlPlane();

console.log("✅ acad_control.db is now 100% clean and free of all mock data!");
