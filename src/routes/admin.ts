import { App } from "../infrastructure/mod.ts";
import { runMigrations, MIGRATIONS, db } from "../infrastructure/db.ts";

export function addAdminRoutes(app: App): void {
  // POST /admin/migrate — applies pending migrations
  app.post("/admin/migrate", async (c) => {
    const { applied, skipped } = await runMigrations();
    return c.json({
      applied,
      skipped,
      message: applied.length
        ? `${applied.length} migration(s) appliquée(s).`
        : "Aucune migration en attente.",
    });
  });

  // GET /admin/migrate — inspect state without making changes
  app.get("/admin/migrate", async (c) => {
    try {
      const result = await db.execute("SELECT id, applied_at FROM migrations ORDER BY applied_at ASC");
      const appliedIds = new Set(result.rows.map((r) => r[0] as string));
      const appliedList = result.rows.map((r) => ({ id: r[0], applied_at: r[1] }));
      const pending = MIGRATIONS.filter((m) => !appliedIds.has(m.id)).map((m) => m.id);
      return c.json({ applied: appliedList, pending });
    } catch {
      return c.json({ error: "Table migrations introuvable — lancez POST /admin/migrate pour initialiser." }, 404);
    }
  });
}
