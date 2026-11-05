import { serve, file } from "bun";
import { existsSync } from "fs";
import { join } from "path";

const PORT = 8085;
const DIST_DIR = join(import.meta.dir, "dist");

const server = serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);

    // Proxy API requests directly to the running backend on port 8001
    if (url.pathname.startsWith("/api/")) {
      const backendUrl = new URL(url.pathname + url.search, "http://localhost:8001");
      const body = req.method !== "GET" && req.method !== "HEAD" ? await req.text() : undefined;
      return fetch(backendUrl.toString(), {
        method: req.method,
        headers: req.headers,
        body,
      });
    }

    let pathname = decodeURIComponent(url.pathname);
    if (pathname === "/") pathname = "/index.html";

    let targetPath = join(DIST_DIR, pathname);

    // If file doesn't exist directly and doesn't have an extension, try index.html (SPA routing)
    if (!existsSync(targetPath)) {
      targetPath = join(DIST_DIR, "index.html");
    }

    const f = file(targetPath);
    return new Response(f);
  },
});

console.log(`[ACQAD Guardian Mobile] Preview server running at http://localhost:${PORT}`);

