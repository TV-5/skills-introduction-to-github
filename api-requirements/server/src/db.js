import Database from "better-sqlite3";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SECTION_DEFINITIONS } from "./sections.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, "..", "data", "app.db");

export const db = new Database(dbPath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS api_requirements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS sections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT NOT NULL UNIQUE,
    label TEXT NOT NULL,
    description TEXT,
    sort_order INTEGER NOT NULL,
    field_schema TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS section_assignments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    api_requirement_id INTEGER NOT NULL REFERENCES api_requirements(id) ON DELETE CASCADE,
    section_id INTEGER NOT NULL REFERENCES sections(id),
    stakeholder_name TEXT NOT NULL,
    stakeholder_email TEXT NOT NULL,
    access_token TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'pending',
    data TEXT NOT NULL DEFAULT '{}',
    completed_at TEXT
  );
`);

const seedSection = db.prepare(`
  INSERT INTO sections (key, label, description, sort_order, field_schema)
  VALUES (@key, @label, @description, @sortOrder, @fieldSchema)
  ON CONFLICT(key) DO UPDATE SET
    label = excluded.label,
    description = excluded.description,
    sort_order = excluded.sort_order,
    field_schema = excluded.field_schema
`);

const seedAll = db.transaction((defs) => {
  for (const def of defs) {
    seedSection.run({
      key: def.key,
      label: def.label,
      description: def.description,
      sortOrder: def.sortOrder,
      fieldSchema: JSON.stringify(def.fields),
    });
  }
});

seedAll(SECTION_DEFINITIONS);
