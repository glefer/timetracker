import { App } from "../infrastructure/mod.ts";
import { db } from "../infrastructure/db.ts";
import type { Timesheet, TimesheetInput, TimesheetEntry, TimesheetEntryInput } from "../domain/timesheets.ts";

export function addTimesheetRoutes(app: App): void {

  // GET /api/timesheets
  app.get("/api/timesheets", async (c) => {
    const result = await db.execute(`
      SELECT t.id, t.name, t.period_from, t.period_to, t.created_at,
             COUNT(e.id) AS entry_count,
             COALESCE(SUM(e.distance_km), 0) AS total_km
      FROM timesheets t
      LEFT JOIN timesheet_entries e ON e.timesheet_id = t.id
      GROUP BY t.id
      ORDER BY t.period_from DESC, t.id DESC
    `);
    const rows = result.rows.map((r) => ({
      id: r[0] as number,
      name: r[1] as string,
      period_from: r[2] as string,
      period_to: r[3] as string,
      created_at: r[4] as string,
      entry_count: r[5] as number,
      total_km: r[6] as number,
    }));
    return c.json(rows);
  });

  // GET /api/timesheets/:id
  app.get("/api/timesheets/:id", async (c) => {
    const id = Number(c.req.param("id"));
    const result = await db.execute({
      sql: "SELECT id, name, period_from, period_to, created_at FROM timesheets WHERE id = ?",
      args: [id],
    });
    if (result.rows.length === 0) return c.json({ error: "Not found" }, 404);
    const r = result.rows[0];
    const sheet: Timesheet = {
      id: r[0] as number,
      name: r[1] as string,
      period_from: r[2] as string,
      period_to: r[3] as string,
      created_at: r[4] as string,
    };
    return c.json(sheet);
  });

  // POST /api/timesheets
  app.post("/api/timesheets", async (c) => {
    const body = await c.req.json<TimesheetInput>();
    if (!body.name?.trim() || !body.period_from || !body.period_to) {
      return c.json({ error: "name, period_from and period_to are required" }, 400);
    }
    const result = await db.execute({
      sql: "INSERT INTO timesheets (name, period_from, period_to) VALUES (?, ?, ?)",
      args: [body.name.trim(), body.period_from, body.period_to],
    });
    const id = Number(result.lastInsertRowid);
    return c.json({ id, name: body.name.trim(), period_from: body.period_from, period_to: body.period_to }, 201);
  });

  // PUT /api/timesheets/:id
  app.put("/api/timesheets/:id", async (c) => {
    const id = Number(c.req.param("id"));
    const body = await c.req.json<Partial<TimesheetInput>>();
    const existing = await db.execute({ sql: "SELECT id FROM timesheets WHERE id = ?", args: [id] });
    if (existing.rows.length === 0) return c.json({ error: "Not found" }, 404);
    await db.execute({
      sql: `UPDATE timesheets SET
              name        = COALESCE(?, name),
              period_from = COALESCE(?, period_from),
              period_to   = COALESCE(?, period_to)
            WHERE id = ?`,
      args: [body.name?.trim() ?? null, body.period_from ?? null, body.period_to ?? null, id],
    });
    const updated = await db.execute({ sql: "SELECT id, name, period_from, period_to, created_at FROM timesheets WHERE id = ?", args: [id] });
    const r = updated.rows[0];
    return c.json({ id: r[0], name: r[1], period_from: r[2], period_to: r[3], created_at: r[4] });
  });

  // DELETE /api/timesheets/:id
  app.delete("/api/timesheets/:id", async (c) => {
    const id = Number(c.req.param("id"));
    await db.execute({ sql: "DELETE FROM timesheets WHERE id = ?", args: [id] });
    return c.json({ success: true });
  });

  // GET /api/timesheets/:id/entries
  app.get("/api/timesheets/:id/entries", async (c) => {
    const tsId = Number(c.req.param("id"));
    const result = await db.execute({
      sql: `SELECT e.id, e.timesheet_id, e.date, e.from_address_id, fa.name AS from_name,
                   e.to_address_id, ta.name AS to_name, e.distance_km, e.note, e.motifs
            FROM timesheet_entries e
            JOIN addresses fa ON fa.id = e.from_address_id
            JOIN addresses ta ON ta.id = e.to_address_id
            WHERE e.timesheet_id = ?
            ORDER BY e.date ASC, e.id ASC`,
      args: [tsId],
    });
    const rows = result.rows.map((r) => ({
      id: r[0] as number,
      timesheet_id: r[1] as number,
      date: r[2] as string,
      from_address_id: r[3] as number,
      from_name: r[4] as string,
      to_address_id: r[5] as number,
      to_name: r[6] as string,
      distance_km: r[7] as number,
      note: r[8] as string,
      motifs: JSON.parse((r[9] as string) || "[]") as string[],
    }));
    return c.json(rows);
  });

  // POST /api/timesheets/:id/entries
  app.post("/api/timesheets/:id/entries", async (c) => {
    const tsId = Number(c.req.param("id"));
    const sheetCheck = await db.execute({ sql: "SELECT id FROM timesheets WHERE id = ?", args: [tsId] });
    if (sheetCheck.rows.length === 0) return c.json({ error: "Timesheet not found" }, 404);

    const body = await c.req.json<Omit<TimesheetEntryInput, "timesheet_id">>();
    if (!body.date || !body.from_address_id || !body.to_address_id || body.distance_km == null) {
      return c.json({ error: "date, from_address_id, to_address_id and distance_km are required" }, 400);
    }
    if (!Array.isArray(body.motifs) || body.motifs.length === 0) {
      return c.json({ error: "Au moins un motif de déplacement est requis" }, 400);
    }
    const motifsJson = JSON.stringify(Array.isArray(body.motifs) ? body.motifs : []);
    const result = await db.execute({
      sql: `INSERT INTO timesheet_entries (timesheet_id, date, from_address_id, to_address_id, distance_km, note, motifs)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [tsId, body.date, body.from_address_id, body.to_address_id, body.distance_km, body.note ?? "", motifsJson],
    });
    const id = Number(result.lastInsertRowid);

    // Sauvegarder automatiquement la distance si elle n'existe pas encore en base
    const existingDistance = await db.execute({
      sql: `SELECT id FROM distances
            WHERE (from_address_id = ? AND to_address_id = ?)
               OR (from_address_id = ? AND to_address_id = ?)
            LIMIT 1`,
      args: [body.from_address_id, body.to_address_id, body.to_address_id, body.from_address_id],
    });
    if (existingDistance.rows.length === 0) {
      await db.execute({
        sql: `INSERT INTO distances (from_address_id, to_address_id, distance_km) VALUES (?, ?, ?)`,
        args: [body.from_address_id, body.to_address_id, body.distance_km],
      });
    }

    const entry: TimesheetEntry = {
      id,
      timesheet_id: tsId,
      date: body.date,
      from_address_id: body.from_address_id,
      to_address_id: body.to_address_id,
      distance_km: body.distance_km,
      note: body.note ?? "",
      motifs: JSON.parse(motifsJson),
    };
    return c.json(entry, 201);
  });

  // PUT /api/entries/:id
  app.put("/api/entries/:id", async (c) => {
    const id = Number(c.req.param("id"));
    const body = await c.req.json<Partial<Omit<TimesheetEntryInput, "timesheet_id">>>();
    const existing = await db.execute({ sql: "SELECT id FROM timesheet_entries WHERE id = ?", args: [id] });
    if (existing.rows.length === 0) return c.json({ error: "Not found" }, 404);
    const motifsJson = body.motifs != null ? JSON.stringify(body.motifs) : null;
    await db.execute({
      sql: `UPDATE timesheet_entries SET
              date            = COALESCE(?, date),
              from_address_id = COALESCE(?, from_address_id),
              to_address_id   = COALESCE(?, to_address_id),
              distance_km     = COALESCE(?, distance_km),
              note            = COALESCE(?, note),
              motifs          = COALESCE(?, motifs)
            WHERE id = ?`,
      args: [body.date ?? null, body.from_address_id ?? null, body.to_address_id ?? null,
             body.distance_km ?? null, body.note ?? null, motifsJson, id],
    });
    const updated = await db.execute({
      sql: `SELECT e.id, e.timesheet_id, e.date, e.from_address_id, fa.name, e.to_address_id, ta.name, e.distance_km, e.note, e.motifs
            FROM timesheet_entries e
            JOIN addresses fa ON fa.id = e.from_address_id
            JOIN addresses ta ON ta.id = e.to_address_id
            WHERE e.id = ?`,
      args: [id],
    });
    const r = updated.rows[0];
    return c.json({
      id: r[0],
      timesheet_id: r[1],
      date: r[2],
      from_address_id: r[3],
      from_name: r[4],
      to_address_id: r[5],
      to_name: r[6],
      distance_km: r[7],
      note: r[8],
      motifs: JSON.parse((r[9] as string) || "[]"),
    });
  });

  // DELETE /api/entries/:id
  app.delete("/api/entries/:id", async (c) => {
    const id = Number(c.req.param("id"));
    await db.execute({ sql: "DELETE FROM timesheet_entries WHERE id = ?", args: [id] });
    return c.json({ success: true });
  });
}
