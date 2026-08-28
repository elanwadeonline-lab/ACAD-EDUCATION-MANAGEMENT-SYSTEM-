import { sendHeartbeat, flushTelemetryEvents, fetchAndApplySyncQueue } from "./heartbeat";
import { telemetryQueue } from "./telemetryQueue";

let agentInterval: any = null;
let isRunning = false;

/**
 * Starts the background ACAD Node Telemetry Daemon.
 * Every cycle:
 *  1. sendHeartbeat()         — push vitals/telemetry to Control Plane
 *  2. flushTelemetryEvents()  — drain buffered operational events
 *  3. fetchAndApplySyncQueue() — pull pending config from Control Plane (BIDIRECTIONAL)
 */
export function startNodeAgent(intervalSec = 60): void {
  if (isRunning) return;
  isRunning = true;

  telemetryQueue.enqueue("NODE_AGENT_STARTED", "info", { timestamp: new Date().toISOString() });

  // Initial pulse
  sendHeartbeat().catch(() => {});
  flushTelemetryEvents().catch(() => {});
  fetchAndApplySyncQueue().catch(() => {});

  agentInterval = setInterval(async () => {
    try {
      await sendHeartbeat();
      await flushTelemetryEvents();
      await fetchAndApplySyncQueue(); // Bidirectional sync pull
    } catch {
      // Offline resilience — will retry on next cycle
    }
  }, intervalSec * 1000);

  console.log(`📡 [ACAD Node Agent] Telemetry daemon running (Pulse: ${intervalSec}s, Sync: enabled)`);
}

export function stopNodeAgent(): void {
  if (agentInterval) {
    clearInterval(agentInterval);
    agentInterval = null;
  }
  isRunning = false;
  console.log("🛑 [ACAD Node Agent] Telemetry daemon stopped");
}
