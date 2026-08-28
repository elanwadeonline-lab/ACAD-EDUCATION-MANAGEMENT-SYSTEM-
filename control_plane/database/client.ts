import { Database } from "bun:sqlite";
import path from "path";
import fs from "fs";

/**
 * Absolute path for the isolated ACAD Control Plane Database.
 * Defaults to 'acad_control.db' in the project directory.
 */
export const CONTROL_PLANE_DB_PATH =
  Bun.env.CONTROL_PLANE_DB || path.join(import.meta.dir, "..", "..", "acad_control.db");

const dbDir = path.dirname(CONTROL_PLANE_DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

export const controlDb = new Database(CONTROL_PLANE_DB_PATH, { create: true });

// Configure high-performance SQLite PRAGMAs for Cloud Control Plane
controlDb.run("PRAGMA journal_mode = WAL");
controlDb.run("PRAGMA foreign_keys = ON");
controlDb.run("PRAGMA busy_timeout = 30000");
controlDb.run("PRAGMA synchronous = NORMAL");
controlDb.run("PRAGMA cache_size = -32000"); // 32MB page cache
controlDb.run("PRAGMA temp_store = MEMORY");
