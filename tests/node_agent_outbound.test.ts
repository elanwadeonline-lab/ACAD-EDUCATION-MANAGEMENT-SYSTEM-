import { describe, test, expect, beforeAll } from "bun:test";
import { handleControlPlaneApi } from "../acad-control/backend/src/server";
import { seedControlPlane } from "../acad-control/backend/src/database/seed";
import { buildHeartbeatPayload } from "../node_agent/heartbeat";
import { getOrCreateNodeIdentity } from "../node_agent/identity";
import { createHmac } from "node:crypto";

describe("ACAD-EDGE Node Agent Outbound Telemetry Bridge Tests", () => {
  beforeAll(async () => {
    await seedControlPlane();
  });

  test("1. Auto-registers node and streams signed telemetry to ACAD-CONTROL", async () => {
    // 1. Register node with school code
    const regReq = new Request("http://localhost:8002/api/node/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        school_code: "ACAD-LAGOS-01",
        node_id: "NODE-LAN-TEST-01",
        software_version: "5.3.0",
        agent_version: "1.0.0",
      }),
    });
    const regRes = await handleControlPlaneApi(regReq, new URL(regReq.url));
    expect(regRes?.status).toBe(201);
    const regData = (await regRes?.json()) as any;
    expect(regData.success).toBe(true);
    const { installationId, secretKey } = regData;

    // 2. Send signed heartbeat with credentials
    const payload = buildHeartbeatPayload("5.3.0");
    payload.installationId = installationId;
    payload.nodeId = "NODE-LAN-TEST-01";
    const rawBody = JSON.stringify(payload);
    const timestamp = Math.floor(Date.now() / 1000);

    const signature = createHmac("sha256", secretKey)
      .update(`${installationId}:${timestamp}:${rawBody}`)
      .digest("hex");

    const hbReq = new Request("http://localhost:8002/api/node/heartbeat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-ACAD-Installation-Id": installationId,
        "X-ACAD-Timestamp": String(timestamp),
        "X-ACAD-Signature": signature,
      },
      body: rawBody,
    });

    const hbRes = await handleControlPlaneApi(hbReq, new URL(hbReq.url));
    expect(hbRes?.status).toBe(200);
    const hbData = (await hbRes?.json()) as any;
    expect(hbData.status).toBe("acknowledged");
    expect(hbData.health_status).toBe("healthy");
    expect(hbData.supervisory).toBeDefined();
  });
});
