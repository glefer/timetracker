import { App } from "../infrastructure/mod.ts";
import { db } from "../infrastructure/db.ts";
import type { Distance, DistanceInput } from "../domain/distances.ts";

export function addDistanceRoutes(app: App): void {
  // GET /api/distances
  app.get("/api/distances", async (c) => {
    const result = await db.execute(`
      SELECT d.id, d.from_address_id, fa.name AS from_name,
             d.to_address_id,   ta.name AS to_name,
             d.distance_km
      FROM distances d
      JOIN addresses fa ON fa.id = d.from_address_id
      JOIN addresses ta ON ta.id = d.to_address_id
      ORDER BY fa.name, ta.name
    `);
    const rows = result.rows.map((r) => ({
      id: r[0] as number,
      from_address_id: r[1] as number,
      from_name: r[2] as string,
      to_address_id: r[3] as number,
      to_name: r[4] as string,
      distance_km: r[5] as number,
    }));
    return c.json(rows);
  });

  // GET /api/distances/lookup?from=:id&to=:id
  app.get("/api/distances/lookup", async (c) => {
    const from = Number(c.req.query("from"));
    const to = Number(c.req.query("to"));
    if (!from || !to) return c.json({ error: "from and to are required" }, 400);

    const result = await db.execute({
      sql: `SELECT distance_km FROM distances
            WHERE (from_address_id = ? AND to_address_id = ?)
               OR (from_address_id = ? AND to_address_id = ?)
            LIMIT 1`,
      args: [from, to, to, from],
    });
    if (result.rows.length === 0) return c.json({ distance_km: null });
    return c.json({ distance_km: result.rows[0][0] as number });
  });

  // POST /api/distances
  app.post("/api/distances", async (c) => {
    const body = await c.req.json<DistanceInput>();
    if (!body.from_address_id || !body.to_address_id || body.distance_km == null) {
      return c.json({ error: "from_address_id, to_address_id and distance_km are required" }, 400);
    }
    if (body.from_address_id === body.to_address_id) {
      return c.json({ error: "from and to addresses must be different" }, 400);
    }
    const result = await db.execute({
      sql: `INSERT INTO distances (from_address_id, to_address_id, distance_km) VALUES (?, ?, ?)
            ON CONFLICT(from_address_id, to_address_id) DO UPDATE SET distance_km = excluded.distance_km`,
      args: [body.from_address_id, body.to_address_id, body.distance_km],
    });
    const id = Number(result.lastInsertRowid);
    const row: Distance = {
      id,
      from_address_id: body.from_address_id,
      to_address_id: body.to_address_id,
      distance_km: body.distance_km,
    };
    return c.json(row, 201);
  });

  // PUT /api/distances/:id
  app.put("/api/distances/:id", async (c) => {
    const id = Number(c.req.param("id"));
    const body = await c.req.json<Partial<DistanceInput>>();
    const existing = await db.execute({ sql: "SELECT id FROM distances WHERE id = ?", args: [id] });
    if (existing.rows.length === 0) return c.json({ error: "Not found" }, 404);
    if (body.distance_km != null) {
      await db.execute({ sql: "UPDATE distances SET distance_km = ? WHERE id = ?", args: [body.distance_km, id] });
    }
    const updated = await db.execute({
      sql: `SELECT d.id, d.from_address_id, fa.name, d.to_address_id, ta.name, d.distance_km
            FROM distances d
            JOIN addresses fa ON fa.id = d.from_address_id
            JOIN addresses ta ON ta.id = d.to_address_id
            WHERE d.id = ?`,
      args: [id],
    });
    const r = updated.rows[0];
    return c.json({ id: r[0], from_address_id: r[1], from_name: r[2], to_address_id: r[3], to_name: r[4], distance_km: r[5] });
  });

  // DELETE /api/distances/:id
  app.delete("/api/distances/:id", async (c) => {
    const id = Number(c.req.param("id"));
    await db.execute({ sql: "DELETE FROM distances WHERE id = ?", args: [id] });
    return c.json({ success: true });
  });
}
