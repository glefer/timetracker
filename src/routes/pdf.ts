import { App } from "../infrastructure/mod.ts";
import { db } from "../infrastructure/db.ts";
import { PDF_CONFIG } from "../config/pdf.ts";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

export function addPdfRoutes(app: App): void {

  // ── Paramètres PDF ────────────────────────────────────────────────────────

  // GET /api/pdf-settings — lire le nom/prénom et le taux kilométrique
  app.get("/api/pdf-settings", async (c) => {
    const r = await db.execute("SELECT full_name, rate_per_km FROM pdf_settings WHERE id = 1");
    const full_name   = r.rows.length ? (r.rows[0][0] as string) : "";
    const rate_per_km = r.rows.length ? (r.rows[0][1] as number) : 0;
    return c.json({ full_name, rate_per_km });
  });

  // POST /api/pdf-settings — mettre à jour le nom/prénom et/ou le taux kilométrique
  app.post("/api/pdf-settings", async (c) => {
    const body = await c.req.json<{ full_name?: string; rate_per_km?: number }>();
    const full_name   = body.full_name?.trim();
    const rate_per_km = body.rate_per_km != null ? Number(body.rate_per_km) : null;
    if (!full_name && rate_per_km === null) {
      return c.json({ error: "full_name ou rate_per_km requis" }, 400);
    }
    await db.execute({
      sql: `UPDATE pdf_settings SET
              full_name   = COALESCE(?, full_name),
              rate_per_km = COALESCE(?, rate_per_km)
            WHERE id = 1`,
      args: [full_name ?? null, rate_per_km],
    });
    const updated = await db.execute("SELECT full_name, rate_per_km FROM pdf_settings WHERE id = 1");
    return c.json({
      full_name:   updated.rows[0][0] as string,
      rate_per_km: updated.rows[0][1] as number,
    });
  });

  // POST /api/pdf-settings/signature — upload PNG de signature
  app.post("/api/pdf-settings/signature", async (c) => {
    const form = await c.req.formData();
    const file = form.get("file");
    if (!file || typeof file === "string") return c.json({ error: "Champ 'file' manquant" }, 400);
    const bytes = new Uint8Array(await (file as File).arrayBuffer());
    // Vérifier magic bytes PNG : 0x89 50 4E 47
    if (bytes[0] !== 0x89 || bytes[1] !== 0x50 || bytes[2] !== 0x4E || bytes[3] !== 0x47) {
      return c.json({ error: "Le fichier doit être un PNG" }, 400);
    }
    await db.execute({
      sql: "UPDATE pdf_settings SET signature = ? WHERE id = 1",
      args: [bytes],
    });
    return c.json({ success: true, size: bytes.length });
  });

  // GET /api/pdf-settings/signature — télécharger le PNG de signature
  app.get("/api/pdf-settings/signature", async (c) => {
    const r = await db.execute("SELECT signature FROM pdf_settings WHERE id = 1");
    if (!r.rows.length || !r.rows[0][0]) return c.json({ error: "Aucune signature chargée" }, 404);
    const data = r.rows[0][0] as unknown as Uint8Array;
    return new Response(data.buffer as ArrayBuffer, {
      headers: { "Content-Type": "image/png" },
    });
  });

  // DELETE /api/pdf-settings/signature — supprimer la signature
  app.delete("/api/pdf-settings/signature", async (c) => {
    await db.execute("UPDATE pdf_settings SET signature = NULL WHERE id = 1");
    return c.json({ success: true });
  });

  // ── Upload du PDF template ─────────────────────────────────────────────
  // POST /api/template  (multipart/form-data, champ "file")
  app.post("/api/template", async (c) => {
    const form = await c.req.formData();
    const file = form.get("file");
    if (!file || typeof file === "string") {
      return c.json({ error: "Champ 'file' manquant" }, 400);
    }
    const bytes = new Uint8Array(await (file as File).arrayBuffer());
    // Valider que c'est bien un PDF
    const magic = String.fromCharCode(...bytes.slice(0, 4));
    if (magic !== "%PDF") {
      return c.json({ error: "Le fichier doit être un PDF" }, 400);
    }
    // Stocker en BDD (INSERT OR REPLACE sur id=1)
    await db.execute({
      sql: "INSERT OR REPLACE INTO pdf_template (id, data) VALUES (1, ?)",
      args: [bytes],
    });
    return c.json({ success: true, size: bytes.length });
  });

  // GET /api/template — télécharger le template actuel
  app.get("/api/template", async (c) => {
    const result = await db.execute("SELECT data FROM pdf_template WHERE id = 1");
    if (result.rows.length === 0) {
      return c.json({ error: "Aucun template chargé" }, 404);
    }
    const data = result.rows[0][0] as unknown as Uint8Array;
    return new Response(data.buffer as ArrayBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="template.pdf"',
      },
    });
  });

  // ── Export PDF d'une fiche ─────────────────────────────────────────────
  // GET /api/timesheets/:id/export
  app.get("/api/timesheets/:id/export", async (c) => {
    const tsId = Number(c.req.param("id"));

    // 1. Récupérer la fiche
    const sheetResult = await db.execute({
      sql: "SELECT id, name FROM timesheets WHERE id = ?",
      args: [tsId],
    });
    if (sheetResult.rows.length === 0) return c.json({ error: "Fiche introuvable" }, 404);
    const sheet = {
      id: sheetResult.rows[0][0] as number,
      name: sheetResult.rows[0][1] as string,
    };

    // 2. Récupérer les lignes triées par date
    const entriesResult = await db.execute({
      sql: `SELECT e.date, fa.name, ta.name, e.distance_km, e.note, e.motifs
            FROM timesheet_entries e
            JOIN addresses fa ON fa.id = e.from_address_id
            JOIN addresses ta ON ta.id = e.to_address_id
            WHERE e.timesheet_id = ?
            ORDER BY e.date ASC, e.id ASC`,
      args: [tsId],
    });
    const entries = entriesResult.rows.map((r) => ({
      date: r[0] as string,
      from_name: r[1] as string,
      to_name: r[2] as string,
      distance_km: r[3] as number,
      note: r[4] as string,
      motifs: JSON.parse((r[5] as string) || "[]") as string[],
    }));

    // 3. Récupérer le template PDF
    const tplResult = await db.execute("SELECT data FROM pdf_template WHERE id = 1");
    if (tplResult.rows.length === 0) {
      return c.json({ error: "Aucun template PDF chargé. Veuillez d'abord uploader un template." }, 400);
    }
    const templateBytes = tplResult.rows[0][0] as unknown as Uint8Array;

    // 4. Récupérer les paramètres PDF (nom/prénom + signature)
    const settingsResult = await db.execute("SELECT full_name, signature FROM pdf_settings WHERE id = 1");
    const fullName = settingsResult.rows.length ? (settingsResult.rows[0][0] as string) || "" : "";
    const signatureRaw = settingsResult.rows.length ? settingsResult.rows[0][1] : null;
    const signatureBytes = signatureRaw ? signatureRaw as unknown as Uint8Array : null;

    // 5. Calculer les dates min/max à partir des entrées réelles
    const sortedDates = entries.map((e) => e.date).filter(Boolean).sort();
    const periodFrom = sortedDates.length ? sortedDates[0] : null;
    const periodTo   = sortedDates.length ? sortedDates[sortedDates.length - 1] : null;

    // 6. Générer le PDF
    const pdfBytes = await buildPdf(templateBytes, entries, signatureBytes, fullName, periodFrom, periodTo);

    const filenamePrefix = toFilePrefix(fullName) || "export";
    const filename = periodFrom && periodTo
      ? `${filenamePrefix}_${periodFrom}_${periodTo}.pdf`
      : `${filenamePrefix}_${sheet.name}.pdf`;
    return new Response(pdfBytes.buffer as ArrayBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  });
}

// ──────────────────────────────────────────────────────────────────────────────
// Génération du PDF
// ──────────────────────────────────────────────────────────────────────────────

type EntryRow = {
  date: string;
  from_name: string;
  to_name: string;
  distance_km: number;
  note: string;
  motifs: string[];
};

async function buildPdf(
  templateBytes: Uint8Array,
  entries: EntryRow[],
  signatureBytes: Uint8Array | null,
  fullName: string,
  periodFrom: string | null,
  periodTo: string | null,
): Promise<Uint8Array> {
  const cfg = PDF_CONFIG;

  // Charger le template
  const templateDoc = await PDFDocument.load(templateBytes);
  const [_templatePage] = templateDoc.getPages();

  // Créer le document de sortie
  const outDoc = await PDFDocument.create();
  const font = await outDoc.embedFont(StandardFonts.Helvetica);

  // Calculer le nombre de lignes par page
  const linesPerPage = Math.floor(
    (cfg.TABLE_TOP_Y - cfg.TABLE_BOTTOM_Y) / cfg.ROW_HEIGHT,
  );

  // Découper les entrées en pages
  const pages: EntryRow[][] = [];
  for (let i = 0; i < entries.length; i += linesPerPage) {
    pages.push(entries.slice(i, i + linesPerPage));
  }
  // Au moins une page même si aucune entrée
  if (pages.length === 0) pages.push([]);

  const totalPages = pages.length;

  for (let pageIdx = 0; pageIdx < totalPages; pageIdx++) {
    // Copier la page template dans le document de sortie
    const [copiedPage] = await outDoc.copyPages(templateDoc, [0]);
    const page = outDoc.addPage(copiedPage);

    const pageEntries = pages[pageIdx];
    let currentY = cfg.TABLE_TOP_Y;

    // ── En-tête : Nom/Prénom + Mois/Année ────────────────────────────────
    const headerOpts = { font, size: cfg.HEADER_FONT_SIZE, color: rgb(0, 0, 0) };
    if (fullName) {
      page.drawText(fullName, { x: cfg.HEADER_NAME_X, y: cfg.HEADER_NAME_Y, ...headerOpts });
    }
    const monthLabel = periodToMonthLabel(periodFrom, periodTo);
    if (monthLabel) {
      page.drawText(monthLabel, { x: cfg.HEADER_MONTH_X, y: cfg.HEADER_MONTH_Y, ...headerOpts });
    }

    // Écrire les lignes
    for (const entry of pageEntries) {
      const cols = cfg.COLUMNS;
      const textOpts = { font, size: cfg.FONT_SIZE, color: rgb(0, 0, 0) };

      page.drawText(isoToFr(entry.date),              { x: cols.date.x,     y: currentY, ...textOpts });
      page.drawText(truncate(entry.from_name, 27),    { x: cols.from.x,     y: currentY, ...textOpts });
      page.drawText(truncate(entry.to_name, 27),      { x: cols.to.x,       y: currentY, ...textOpts });
      // Colonnes motifs : cocher avec "X" si le motif est présent
      if (entry.motifs.includes("domicile_travail"))  page.drawText("X", { x: cols.domicile_travail.x,  y: currentY, ...textOpts });
      if (entry.motifs.includes("cours_prestation"))  page.drawText("X", { x: cols.cours_prestation.x,  y: currentY, ...textOpts });
      if (entry.motifs.includes("entre_prestations")) page.drawText("X", { x: cols.entre_prestations.x, y: currentY, ...textOpts });
      page.drawText(String(entry.distance_km) + " km",{ x: cols.distance.x, y: currentY, ...textOpts });
      page.drawText(truncate(entry.note, 14),         { x: cols.note.x,     y: currentY, ...textOpts });

      currentY -= cfg.ROW_HEIGHT;
    }

    // Numéro de page : effacer la zone du template puis réécrire
    const pageLabel = `${pageIdx + 1} / ${totalPages}`;
    // Rectangle blanc pour masquer le numéro imprimé sur le template
    page.drawRectangle({
      x: cfg.PAGE_NUMBER_X,
      y: cfg.PAGE_NUMBER_Y,
      width:  cfg.PAGE_NUMBER_ERASE_W,
      height: cfg.PAGE_NUMBER_ERASE_H,
      color: rgb(1, 1, 1),
      borderWidth: 0,
    });
    page.drawText(pageLabel, {
      x: cfg.PAGE_NUMBER_X + 2,
      y: cfg.PAGE_NUMBER_Y + 3,
      font,
      size: cfg.PAGE_NUMBER_FONT_SIZE,
      color: rgb(0, 0, 0),
    });

    // Signature PNG + total km sur la dernière page uniquement
    if (pageIdx === totalPages - 1) {
      // Total des kilomètres (toutes entrées confondues)
      const totalKm = entries.reduce((sum, e) => sum + e.distance_km, 0);
      const totalKmText = `Total : ${totalKm % 1 === 0 ? totalKm : totalKm.toFixed(1)} km`;
      page.drawText(totalKmText, {
        x: cfg.COLUMNS.distance.x-30,
        y: cfg.TABLE_BOTTOM_Y,
        font,
        size: cfg.FONT_SIZE,
        color: rgb(0, 0, 0),
      });

      if (signatureBytes) {
        const sigImage = await outDoc.embedPng(signatureBytes);
        const scaled = sigImage.scaleToFit(cfg.SIGNATURE_MAX_W, cfg.SIGNATURE_MAX_H);
        page.drawImage(sigImage, {
          x: cfg.SIGNATURE_X,
          y: cfg.SIGNATURE_Y,
          width: scaled.width,
          height: scaled.height,
        });
      }
    }
  }

  return outDoc.save();
}

/** Tronque un texte à maxLen caractères pour éviter le débordement */
function truncate(s: string, maxLen: number): string {
  if (!s) return "";
  return s.length > maxLen ? s.slice(0, maxLen - 1) + "…" : s;
}

/** Convertit une date ISO (YYYY-MM-DD) en dd/mm/YYYY */
function isoToFr(iso: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

/**
 * Génère un préfixe de fichier à partir du nom complet.
 * Ex: "Delphine Hédin" → "delphine_hedin"
 */
function toFilePrefix(fullName: string): string {
  if (!fullName) return "";
  return fullName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")   // supprimer les accents
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "_")              // espaces → underscores
    .replace(/[^a-z0-9_]/g, "");       // caractères non alphanumériques
}

/**
 * Génère le libellé mois/année pour l'en-tête du PDF.
 * - Même mois : "Mars 2026"
 * - Mois différents, même année : "Février-Mars 2026"
 * - Années différentes : "Décembre 2025-Janvier 2026"
 */
function periodToMonthLabel(isoFrom: string | null, isoTo: string | null): string {
  const MONTHS = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];
  if (!isoFrom) return "";
  const [yearFrom, monthFrom] = isoFrom.split("-");
  const [yearTo,   monthTo  ] = (isoTo || isoFrom).split("-");
  const labelFrom = MONTHS[Number(monthFrom) - 1];
  const labelTo   = MONTHS[Number(monthTo)   - 1];
  if (yearFrom === yearTo) {
    return monthFrom === monthTo
      ? `${labelFrom} ${yearFrom}`
      : `${labelFrom}-${labelTo} ${yearFrom}`;
  }
  return `${labelFrom} ${yearFrom}-${labelTo} ${yearTo}`;
}
