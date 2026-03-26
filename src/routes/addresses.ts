import { App } from "../infrastructure/mod.ts";
import { db } from "../infrastructure/db.ts";
import type { Address, AddressInput } from "../domain/addresses.ts";

export function addAddressRoutes(app: App): void {
  // GET /api/addresses
  app.get("/api/addresses", async (c) => {
    const result = await db.execute("SELECT id, name, address FROM addresses ORDER BY name ASC");
    const rows: Address[] = result.rows.map((r) => ({
      id: r[0] as number,
      name: r[1] as string,
      address: r[2] as string,
    }));
    return c.json(rows);
  });

  // POST /api/addresses
  app.post("/api/addresses", async (c) => {
    const body = await c.req.json<AddressInput>();
    if (!body.name?.trim() || !body.address?.trim()) {
      return c.json({ error: "name and address are required" }, 400);
    }
    const result = await db.execute({
      sql: "INSERT INTO addresses (name, address) VALUES (?, ?)",
      args: [body.name.trim(), body.address.trim()],
    });
    const id = Number(result.lastInsertRowid);
    return c.json({ id, name: body.name.trim(), address: body.address.trim() }, 201);
  });

  // PUT /api/addresses/:id
  app.put("/api/addresses/:id", async (c) => {
    const id = Number(c.req.param("id"));
    const body = await c.req.json<Partial<AddressInput>>();
    const existing = await db.execute({ sql: "SELECT id FROM addresses WHERE id = ?", args: [id] });
    if (existing.rows.length === 0) return c.json({ error: "Not found" }, 404);
    if (body.name !== undefined || body.address !== undefined) {
      await db.execute({
        sql: "UPDATE addresses SET name = COALESCE(?, name), address = COALESCE(?, address) WHERE id = ?",
        args: [body.name?.trim() ?? null, body.address?.trim() ?? null, id],
      });
    }
    const updated = await db.execute({ sql: "SELECT id, name, address FROM addresses WHERE id = ?", args: [id] });
    const r = updated.rows[0];
    return c.json({ id: r[0], name: r[1], address: r[2] });
  });

  // DELETE /api/addresses/:id
  app.delete("/api/addresses/:id", async (c) => {
    const id = Number(c.req.param("id"));
    await db.execute({ sql: "DELETE FROM addresses WHERE id = ?", args: [id] });
    return c.json({ success: true });
  });
}
