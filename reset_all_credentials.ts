import { Database } from "bun:sqlite";
import { hashPassword } from "./auth.ts";

// ────────────────────────────────────────────────────────────────────────────
// Reset ALL portal credentials in one run.
//   Admin    (operator) : admin@exampool.ng      / Admin@2026
//   Teacher  (all)         : <email> @ role      / Teacher@2026
//   Student  (all)         : <email>             / Student@2026
//   Guardian (all)         : <email>             / Guardian@2026
// Missing default teacher/guardian accounts are created if none exist.
// ────────────────────────────────────────────────────────────────────────────

const db = new Database("exampool.db");

const PASSWORDS = {
  operator: "Admin@2026",
  teacher: "Teacher@2026",
  student: "Student@2026",
  guardian: "Guardian@2026",
};

type UserRow = { id: number; name: string; email: string; role: string; is_active: number };

function printRows(rows: UserRow[], password: string, role: string) {
  console.log(`\n──────── ${role.toUpperCase()} (${rows.length}) ────────`);
  for (const u of rows) {
    console.log(`  id=${u.id}  name=${u.name}`);
    console.log(`     email:    ${u.email}`);
    console.log(`     password: ${password}`);
    console.log(`     active:   ${u.is_active === 1 ? "yes" : "NO (activated)"}`);
  }
}

async function main() {
  for (const role of ["operator", "teacher", "student", "guardian"] as const) {
    const hash = await hashPassword(PASSWORDS[role]);

    // activate + reset every existing account of this role
    const info = db
      .prepare("UPDATE users SET password_hash = ?, is_active = 1 WHERE role = ?")
      .run(hash, role);
    if (info.changes > 0) continue;

    // no accounts of this role → create a sensible default
    if (role === "operator") {
      db.prepare(
        "INSERT INTO users (name, email, role, password_hash, is_active) VALUES (?, ?, ?, ?, 1)"
      ).run("System Admin", "admin@exampool.ng", "operator", hash);
      console.log(`\nNo operator existed → created admin@exampool.ng / ${PASSWORDS.operator}`);
    } else if (role === "teacher") {
      db.prepare(
        "INSERT INTO users (name, email, role, password_hash, is_active) VALUES (?, ?, ?, ?, 1)"
      ).run("Default Teacher", "teacher@exampool.ng", "teacher", hash);
      console.log(`\nNo teacher existed → created teacher@exampool.ng / ${PASSWORDS.teacher}`);
    } else if (role === "guardian") {
      db.prepare(
        "INSERT INTO users (name, email, role, password_hash, is_active) VALUES (?, ?, ?, ?, 1)"
      ).run("Default Guardian", "guardian@exampool.ng", "guardian", hash);
      console.log(`\nNo guardian existed → created guardian@exampool.ng / ${PASSWORDS.guardian}`);
    }
    // students: zero students is fine (they are enrolled per-class), skip creation
  }

  // summary
  const rows = db
    .prepare("SELECT id, name, email, role, is_active FROM users ORDER BY role, id")
    .all() as UserRow[];
  for (const role of ["operator", "teacher", "student", "guardian"]) {
    printRows(rows.filter((r) => r.role === role), PASSWORDS[role as keyof typeof PASSWORDS], role);
  }
  console.log("\nAll credentials reset. Use these at the matching portal login pages.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
