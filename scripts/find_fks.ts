import db from "../db";

const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as { name: string }[];

for (const t of tables) {
  try {
    const fks = db.prepare(`PRAGMA foreign_key_list("${t.name}")`).all() as any[];
    for (const fk of fks) {
      if (fk.table === "academic_sessions" || fk.table === "academic_terms") {
        console.log(`Table "${t.name}" column "${fk.from}" -> references "${fk.table}" ("${fk.to}")`);
      }
    }
  } catch (err) {
    console.error(err);
  }
}
