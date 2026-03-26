// Credentials are injected automatically by Bunny Edge Scripting as:
//   BUNNY_DATABASE_URL / BUNNY_DATABASE_AUTH_TOKEN

import { createClient } from "@libsql/client/web";

export const db = createClient({
  url: Deno.env.get("BUNNY_DATABASE_URL")!,
  authToken: Deno.env.get("BUNNY_DATABASE_AUTH_TOKEN")!,
});

// Migrations
//
// Each migration is an object { id, sql[] }.
// id must be stable once committed; sql is applied as a batch.
// runMigrations() is exposed via POST /admin/migrate — call it manually
// after each deployment, never at server startup.

export type Migration = { id: string; sql: string[] };

export const MIGRATIONS: Migration[] = [
  {
    id: "001_initial_schema",
    sql: [
      `CREATE TABLE IF NOT EXISTS addresses (
        id      INTEGER PRIMARY KEY AUTOINCREMENT,
        name    TEXT    NOT NULL,
        address TEXT    NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS distances (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        from_address_id INTEGER NOT NULL REFERENCES addresses(id) ON DELETE CASCADE,
        to_address_id   INTEGER NOT NULL REFERENCES addresses(id) ON DELETE CASCADE,
        distance_km     REAL    NOT NULL,
        UNIQUE(from_address_id, to_address_id)
      )`,
      `CREATE TABLE IF NOT EXISTS timesheets (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        name        TEXT    NOT NULL,
        period_from TEXT    NOT NULL,
        period_to   TEXT    NOT NULL,
        created_at  TEXT    NOT NULL DEFAULT (date('now'))
      )`,
      `CREATE TABLE IF NOT EXISTS timesheet_entries (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        timesheet_id    INTEGER NOT NULL REFERENCES timesheets(id) ON DELETE CASCADE,
        date            TEXT    NOT NULL,
        from_address_id INTEGER NOT NULL REFERENCES addresses(id) ON DELETE RESTRICT,
        to_address_id   INTEGER NOT NULL REFERENCES addresses(id) ON DELETE RESTRICT,
        distance_km     REAL    NOT NULL,
        note            TEXT    NOT NULL DEFAULT ''
      )`,
      `CREATE TABLE IF NOT EXISTS pdf_template (
        id   INTEGER PRIMARY KEY CHECK (id = 1),
        data BLOB    NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS migrations (
        id         TEXT NOT NULL PRIMARY KEY,
        applied_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`,
    ],
  },

  {
    id: "002_timesheet_entries_add_timesheet_id",
    sql: [
      "ALTER TABLE timesheet_entries ADD COLUMN timesheet_id INTEGER NOT NULL REFERENCES timesheets(id) ON DELETE CASCADE DEFAULT 0",
    ],
  },

  {
    id: "003_timesheet_entries_add_motifs",
    sql: [
      "ALTER TABLE timesheet_entries ADD COLUMN motifs TEXT NOT NULL DEFAULT '[]'",
    ],
  },

  {
    id: "004_pdf_settings",
    sql: [
      `CREATE TABLE IF NOT EXISTS pdf_settings (
        id                INTEGER PRIMARY KEY CHECK (id = 1),
        filename_prefix   TEXT    NOT NULL DEFAULT 'export',
        signature         BLOB
      )`,
      `INSERT OR IGNORE INTO pdf_settings (id, filename_prefix) VALUES (1, 'export')`,
    ],
  },

  {
    id: "005_pdf_settings_add_full_name",
    sql: [
      "ALTER TABLE pdf_settings ADD COLUMN full_name TEXT NOT NULL DEFAULT ''",
    ],
  },
];

// Applies all pending migrations and returns a report.
export async function runMigrations(): Promise<{ applied: string[]; skipped: string[] }> {
  // Bootstrap the migrations table if it doesn't exist yet.
  await db.execute(`
    CREATE TABLE IF NOT EXISTS migrations (
      id         TEXT NOT NULL PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  const result = await db.execute("SELECT id FROM migrations");
  const appliedIds = new Set(result.rows.map((r) => r[0] as string));

  const applied: string[] = [];
  const skipped: string[] = [];

  for (const migration of MIGRATIONS) {
    if (appliedIds.has(migration.id)) {
      skipped.push(migration.id);
      continue;
    }

    // If the schema change is already present (DB predating the migration system),
    // record it without re-executing.
    if (await isMigrationAlreadyApplied(migration)) {
      await db.execute(`INSERT INTO migrations (id) VALUES ('${migration.id}')`);
      skipped.push(migration.id);
      continue;
    }

    await db.batch(
      [...migration.sql, `INSERT INTO migrations (id) VALUES ('${migration.id}')`],
      "write",
    );
    applied.push(migration.id);
  }

  return { applied, skipped };
}

// Checks whether an ALTER TABLE ADD COLUMN migration is already reflected
// in the live schema via PRAGMA table_info.
// CREATE TABLE IF NOT EXISTS migrations are treated as not-yet-applied
// (they are idempotent by nature).
async function isMigrationAlreadyApplied(migration: Migration): Promise<boolean> {
  for (const sql of migration.sql) {
    const match = sql.match(/ALTER\s+TABLE\s+(\w+)\s+ADD\s+COLUMN\s+(\w+)/i);
    if (!match) continue;
    const [, table, column] = match;
    const info = await db.execute(`PRAGMA table_info(${table})`);
    const exists = info.rows.some((r) => (r[1] as string).toLowerCase() === column.toLowerCase());
    if (!exists) return false;
  }
  const hasAlter = migration.sql.some((s) => /ALTER\s+TABLE\s+\w+\s+ADD\s+COLUMN/i.test(s));
  return hasAlter;
}