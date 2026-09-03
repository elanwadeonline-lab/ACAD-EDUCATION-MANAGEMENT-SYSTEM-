import { createHmac } from "node:crypto";
import fs from "fs";
import path from "path";
import { getOrCreateNodeIdentity, getCloudEndpointFromEnv, setCloudEndpoint } from "../node_agent/identity";
import { buildHeartbeatPayload } from "../node_agent/heartbeat";

async function main() {
  console.log("\n=======================================================");
  console.log("📡 ACAD Cloud Supervisory Connectivity Test");
  console.log("=======================================================\n");

  const argEndpoint = process.argv[2];
  if (argEndpoint) {
    setCloudEndpoint(argEndpoint);
  }

  const identity = getOrCreateNodeIdentity();
  let endpoint = identity.cloudEndpoint?.replace(/\/+$/, "");

  if (!endpoint || endpoint.includes("localhost:8001")) {
    console.warn("⚠️  Target cloud endpoint is currently pointing to localhost:8001 (local school app)!");
    console.log("👉 Pass your Render URL as an argument or set ACAD_CLOUD_ENDPOINT in .env:");
    console.log("   bun run scripts/test_cloud_connection.ts https://<your-render-service>.onrender.com\n");
    return;
  }

  console.log(`🎯 Target Cloud Endpoint: ${endpoint}`);
  console.log(`🆔 Installation ID:     ${identity.installationId}`);
  console.log(`🖥️ Node ID:             ${identity.nodeId}\n`);

  // Step 1: Health probe
  console.log(`1️⃣ Probing ${endpoint}/health ...`);
  try {
    const healthStart = Date.now();
    const healthRes = await fetch(`${endpoint}/health`, { signal: AbortSignal.timeout(15000) });
    const healthLatency = Date.now() - healthStart;
    if (healthRes.ok) {
      const data = (await healthRes.json().catch(() => ({}))) as any;
      console.log(`   ✅ Cloud API is ONLINE and HEALTHY (${healthLatency}ms) - Service: ${data?.service || "acad-control-api"}`);
    } else {
      console.warn(`   ⚠️ Cloud API returned status ${healthRes.status}: ${await healthRes.text().catch(() => "")}`);
    }
  } catch (err: any) {
    console.error(`   ❌ Failed to reach ${endpoint}/health: ${err.message}`);
    console.log("\n💡 Note: If Render is on the free tier, it may take 30-50 seconds to spin up from sleep.");
    return;
  }

  // Step 2: Send signed heartbeat pulse
  console.log(`\n2️⃣ Sending signed heartbeat to ${endpoint}/api/node/heartbeat ...`);
  const payload = buildHeartbeatPayload();
  const rawBody = JSON.stringify(payload);
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = createHmac("sha256", identity.secretKey)
    .update(`${identity.installationId}:${timestamp}:${rawBody}`)
    .digest("hex");

  try {
    const hbRes = await fetch(`${endpoint}/api/node/heartbeat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-ACAD-Installation-Id": identity.installationId,
        "X-ACAD-Node-Id": identity.nodeId,
        "X-ACAD-Node-Secret": identity.secretKey,
        "X-ACAD-Timestamp": String(timestamp),
        "X-ACAD-Signature": signature,
      },
      body: rawBody,
      signal: AbortSignal.timeout(10000),
    });

    if (hbRes.ok) {
      const hbData = (await hbRes.json()) as any;
      console.log(`   ✅ Heartbeat ACKNOWLEDGED by Cloud Supervisor!`);
      console.log(`   📊 Node Health Status: ${hbData.health_status} (Score: ${hbData.health_score}%)`);
      console.log(`   ⚙️ Feature Flags Synced: ${Object.keys(hbData?.supervisory?.feature_flags || {}).length} flags`);
      console.log(`   📜 License Status: ${hbData?.supervisory?.license?.plan_tier || "Active"}`);
      console.log("\n🎉 SUCCESS: The cloud supervisory platform has detected this local node!");
      console.log("   Check your Vercel dashboard — the node should now be listed as ACTIVE & HEALTHY.");
    } else {
      const errText = await hbRes.text().catch(() => "");
      console.error(`   ❌ Heartbeat rejected by Cloud Supervisor (${hbRes.status}): ${errText}`);
    }
  } catch (err: any) {
    console.error(`   ❌ Heartbeat request failed: ${err.message}`);
  }

  // Step 3: Check pending sync queue
  console.log(`\n3️⃣ Checking pending sync queue at ${endpoint}/api/node/pending-sync ...`);
  try {
    const syncTimestamp = Math.floor(Date.now() / 1000);
    const syncSig = createHmac("sha256", identity.secretKey)
      .update(`${identity.installationId}:${syncTimestamp}:`)
      .digest("hex");

    const syncRes = await fetch(`${endpoint}/api/node/pending-sync`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "X-ACAD-Installation-Id": identity.installationId,
        "X-ACAD-Timestamp": String(syncTimestamp),
        "X-ACAD-Signature": syncSig,
      },
      signal: AbortSignal.timeout(5000),
    });

    if (syncRes.ok) {
      const syncData = (await syncRes.json()) as any;
      const items = syncData.items || syncData.pending || [];
      console.log(`   ✅ Pending commands in sync queue: ${items.length}`);
      for (const it of items) {
        console.log(`      - Command ID ${it.id}: type="${it.payload_type}"`);
      }
    }
  } catch (err: any) {
    console.warn(`   ⚠️ Sync queue check note: ${err.message}`);
  }

  console.log("\n=======================================================\n");
}

main().catch(console.error);
