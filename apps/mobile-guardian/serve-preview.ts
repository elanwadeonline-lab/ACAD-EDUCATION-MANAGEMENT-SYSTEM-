import { serve, file } from "bun";
import { existsSync } from "fs";
import { join } from "path";

const PORT = 8085;
const DIST_DIR = join(import.meta.dir, "dist");

const server = serve({
  port: PORT,
  fetch(req) {
    const url = new URL(req.url);
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

