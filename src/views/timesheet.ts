import { layout } from "./layout.ts";

export function timesheetPage(): string {
  const body = `
<!-- ══ VUE LISTE DES FICHES ══════════════════════════════════════════════ -->
<div id="view-list">
  <section class="card">
    <h2>Nouvelle fiche de pointage</h2>
    <form id="sheet-form" class="form-row">
      <div class="form-group" style="flex:2">
        <label>Nom de la fiche</label>
        <input id="sheet-name" type="text" placeholder="Ex : Mars 2026 — Véhicule perso" required />
      </div>
      <div class="form-group" style="max-width:160px">
        <label>Période du</label>
        <input id="sheet-from" type="date" required />
      </div>
      <div class="form-group" style="max-width:160px">
        <label>Au</label>
        <input id="sheet-to" type="date" required />
      </div>
      <button type="submit" class="btn-primary">Créer</button>
    </form>
  </section>

  <section class="card">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem;flex-wrap:wrap;gap:.5rem">
      <h2 style="margin-bottom:0;border:none;padding:0">Fiches de pointage</h2>
    </div>
    <table id="sheets-table">
      <thead>
        <tr><th>Nom</th><th>Période</th><th>Lignes</th><th>Total km</th><th style="width:160px"></th></tr>
      </thead>
      <tbody id="sheets-body">
        <tr><td colspan="5" class="empty">Chargement…</td></tr>
      </tbody>
    </table>
  </section>
</div>

<!-- ══ VUE DÉTAIL D'UNE FICHE ════════════════════════════════════════════ -->
<div id="view-detail" style="display:none">
  <div style="display:flex;align-items:center;gap:.75rem;margin-bottom:1rem;flex-wrap:wrap">
    <button onclick="backToList()" style="background:#eee;color:#333;border:none;border-radius:4px;padding:.4rem .8rem;cursor:pointer;font-size:.9rem">← Retour</button>
    <h2 id="detail-title" style="margin:0;font-size:1.1rem;color:#1a1a2e;flex:1"></h2>
    <button onclick="exportPdf()" style="background:#198754;color:#fff;border:none;border-radius:4px;padding:.45rem 1rem;cursor:pointer;font-weight:600;font-size:.9rem">⬇ Export PDF</button>
  </div>

  <section class="card">
    <h2>Ajouter une ligne</h2>
    <form id="entry-form" class="form-row">
      <div class="form-group" style="max-width:160px">
        <label>Date</label>
        <input id="entry-date" type="date" required />
      </div>
      <div class="form-group">
        <label>Départ</label>
        <select id="entry-from" required onchange="lookupDistance()"><option value="">— Sélectionner —</option></select>
      </div>
      <div class="form-group">
        <label>Arrivée</label>
        <select id="entry-to" required onchange="lookupDistance()"><option value="">— Sélectionner —</option></select>
      </div>
      <div class="form-group" style="max-width:130px">
        <label>Distance (km)</label>
        <input id="entry-km" type="number" min="0" step="0.1" placeholder="Auto" />
      </div>
      <div class="form-group" style="flex:2">
        <label>Note</label>
        <input id="entry-note" type="text" placeholder="Optionnel" />
      </div>
      <div class="form-group" style="flex:3;min-width:220px">
        <label>Motif du déplacement</label>
        <div style="display:flex;gap:.75rem;flex-wrap:wrap;margin-top:.5rem">
          <div style="display:flex;align-items:center;gap:.4rem;cursor:pointer" onclick="document.getElementById('motif-domicile').click()">
            <input type="checkbox" id="motif-domicile" value="domicile_travail" onclick="event.stopPropagation()" style="width:15px;height:15px;flex-shrink:0;cursor:pointer" />
            <span style="font-size:.88rem;color:#333;line-height:1.3">Domicile / travail &gt; 20kms</span>
          </div>
          <div style="display:flex;align-items:center;gap:.4rem;cursor:pointer" onclick="document.getElementById('motif-cours').click()">
            <input type="checkbox" id="motif-cours" value="cours_prestation" onclick="event.stopPropagation()" style="width:15px;height:15px;flex-shrink:0;cursor:pointer" />
            <span style="font-size:.88rem;color:#333;line-height:1.3">Au cours de la prestation</span>
          </div>
          <div style="display:flex;align-items:center;gap:.4rem;cursor:pointer" onclick="document.getElementById('motif-entre').click()">
            <input type="checkbox" id="motif-entre" value="entre_prestations" onclick="event.stopPropagation()" style="width:15px;height:15px;flex-shrink:0;cursor:pointer" />
            <span style="font-size:.88rem;color:#333;line-height:1.3">Entre deux prestations</span>
          </div>
        </div>
      </div>
      <button type="submit" class="btn-primary">Ajouter</button>
    </form>
  </section>

  <section class="card">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:.75rem;flex-wrap:wrap;gap:.5rem">
      <h2 style="margin-bottom:0;border:none;padding:0">Lignes de pointage</h2>
      <span id="entry-total" class="badge" style="font-size:.9rem"></span>
    </div>
    <div style="overflow-x:auto">
      <table>
        <thead>
          <tr><th>Date</th><th>Départ</th><th>Arrivée</th><th>Motifs</th><th>Distance</th><th>Note</th><th style="width:80px"></th></tr>
        </thead>
        <tbody id="entries-body">
          <tr><td colspan="6" class="empty">Aucune ligne.</td></tr>
        </tbody>
      </table>
    </div>
  </section>
</div>

<!-- ══ MODALS ════════════════════════════════════════════════════════════ -->

<!-- Modifier une fiche -->
<div id="edit-sheet-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:100;align-items:center;justify-content:center;">
  <div style="background:#fff;border-radius:8px;padding:1.5rem;width:min(500px,92%);box-shadow:0 4px 24px rgba(0,0,0,.2)">
    <h2 style="margin-bottom:1rem">Modifier la fiche</h2>
    <div class="form-group" style="margin-bottom:.75rem">
      <label>Nom</label>
      <input id="edit-sheet-name" type="text" />
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>Du</label>
        <input id="edit-sheet-from" type="date" />
      </div>
      <div class="form-group">
        <label>Au</label>
        <input id="edit-sheet-to" type="date" />
      </div>
    </div>
    <div style="display:flex;gap:.5rem;justify-content:flex-end;margin-top:1rem">
      <button onclick="closeEditSheet()" style="background:#eee;color:#333">Annuler</button>
      <button onclick="saveEditSheet()" class="btn-primary">Enregistrer</button>
    </div>
  </div>
</div>

<!-- Modifier une ligne -->
<div id="edit-entry-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:100;align-items:center;justify-content:center;">
  <div style="background:#fff;border-radius:8px;padding:1.5rem;width:min(520px,94%);box-shadow:0 4px 24px rgba(0,0,0,.2)">
    <h2 style="margin-bottom:1rem">Modifier la ligne</h2>
    <div class="form-row">
      <div class="form-group" style="max-width:160px">
        <label>Date</label>
        <input id="edit-entry-date" type="date" />
      </div>
      <div class="form-group">
        <label>Départ</label>
        <select id="edit-entry-from" onchange="editEntryLookup()"></select>
      </div>
      <div class="form-group">
        <label>Arrivée</label>
        <select id="edit-entry-to" onchange="editEntryLookup()"></select>
      </div>
    </div>
    <div class="form-row">
      <div class="form-group" style="max-width:130px">
        <label>Distance (km)</label>
        <input id="edit-entry-km" type="number" min="0" step="0.1" />
      </div>
      <div class="form-group" style="flex:2">
        <label>Note</label>
        <input id="edit-entry-note" type="text" />
      </div>
      <div class="form-group" style="flex:3;min-width:220px">
        <label>Motif du déplacement</label>
        <div style="display:flex;gap:.75rem;flex-wrap:wrap;margin-top:.5rem">
          <div style="display:flex;align-items:center;gap:.4rem;cursor:pointer" onclick="document.getElementById('edit-motif-domicile').click()">
            <input type="checkbox" id="edit-motif-domicile" value="domicile_travail" onclick="event.stopPropagation()" style="width:15px;height:15px;flex-shrink:0;cursor:pointer" />
            <span style="font-size:.88rem;color:#333;line-height:1.3">Domicile / travail &gt; 20kms</span>
          </div>
          <div style="display:flex;align-items:center;gap:.4rem;cursor:pointer" onclick="document.getElementById('edit-motif-cours').click()">
            <input type="checkbox" id="edit-motif-cours" value="cours_prestation" onclick="event.stopPropagation()" style="width:15px;height:15px;flex-shrink:0;cursor:pointer" />
            <span style="font-size:.88rem;color:#333;line-height:1.3">Au cours de la prestation</span>
          </div>
          <div style="display:flex;align-items:center;gap:.4rem;cursor:pointer" onclick="document.getElementById('edit-motif-entre').click()">
            <input type="checkbox" id="edit-motif-entre" value="entre_prestations" onclick="event.stopPropagation()" style="width:15px;height:15px;flex-shrink:0;cursor:pointer" />
            <span style="font-size:.88rem;color:#333;line-height:1.3">Entre deux prestations</span>
          </div>
        </div>
      </div>
    </div>
    <div style="display:flex;gap:.5rem;justify-content:flex-end;margin-top:.5rem">
      <button onclick="closeEditEntry()" style="background:#eee;color:#333">Annuler</button>
      <button onclick="saveEditEntry()" class="btn-primary">Enregistrer</button>
    </div>
  </div>
</div>

<script>
  let currentSheetId = null;
  let editSheetId    = null;
  let editEntryId    = null;

  // ── Init ──────────────────────────────────────────────────────────────────
  async function init() {
    // Défaut : période du mois en cours
    const now = new Date();
    const y = now.getFullYear(), m = String(now.getMonth()+1).padStart(2,'0');
    const lastDay = new Date(y, now.getMonth()+1, 0).getDate();
    document.getElementById('sheet-from').value = \`\${y}-\${m}-01\`;
    document.getElementById('sheet-to').value   = \`\${y}-\${m}-\${String(lastDay).padStart(2,'0')}\`;
    document.getElementById('entry-date').value = now.toISOString().slice(0,10);

    await loadAddresses();
    loadSheets();
  }

  async function loadAddresses() {
    const addrs = await api('GET', '/api/addresses');
    const opts = '<option value="">— Sélectionner —</option>' +
      addrs.map(a => \`<option value="\${a.id}">\${esc(a.name)}</option>\`).join('');
    ['entry-from','entry-to','edit-entry-from','edit-entry-to'].forEach(id => {
      document.getElementById(id).innerHTML = opts;
    });
  }

  // ── LISTE DES FICHES ──────────────────────────────────────────────────────
  async function loadSheets() {
    const sheets = await api('GET', '/api/timesheets');
    const tbody = document.getElementById('sheets-body');
    if (!sheets.length) {
      tbody.innerHTML = '<tr><td colspan="5" class="empty">Aucune fiche. Créez-en une ci-dessus.</td></tr>';
      return;
    }
    tbody.innerHTML = sheets.map(s => \`
      <tr>
        <td><strong>\${esc(s.name)}</strong></td>
        <td>\${fmtDate(s.period_from)} → \${fmtDate(s.period_to)}</td>
        <td>\${s.entry_count}</td>
        <td><span class="badge">\${(+s.total_km).toFixed(1)} km</span></td>
        <td style="display:flex;gap:.3rem;flex-wrap:wrap">
          <button class="btn-primary" style="font-size:.78rem;padding:.3rem .6rem" onclick="openSheet(\${s.id},'\${esc(s.name)}','\${s.period_from}','\${s.period_to}')">Ouvrir</button>
          <button class="btn-edit"    onclick="openEditSheet(\${s.id},'\${esc(s.name)}','\${s.period_from}','\${s.period_to}')">Modifier</button>
          <button class="btn-danger"  onclick="deleteSheet(\${s.id})">Supprimer</button>
        </td>
      </tr>\`).join('');
  }

  document.getElementById('sheet-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('sheet-name').value.trim();
    const from = document.getElementById('sheet-from').value;
    const to   = document.getElementById('sheet-to').value;
    try {
      const sheet = await api('POST', '/api/timesheets', { name, period_from: from, period_to: to });
      toast('Fiche créée ✓');
      e.target.reset();
      // Rouvrir les valeurs par défaut
      init();
      openSheet(sheet.id, sheet.name, sheet.period_from, sheet.period_to);
    } catch(err) { toast(err.message, true); }
  });

  async function deleteSheet(id) {
    if (!confirm('Supprimer cette fiche et toutes ses lignes ?')) return;
    try {
      await api('DELETE', '/api/timesheets/' + id);
      toast('Fiche supprimée');
      loadSheets();
    } catch(err) { toast(err.message, true); }
  }

  // Edit fiche modal
  function openEditSheet(id, name, from, to) {
    editSheetId = id;
    document.getElementById('edit-sheet-name').value = name;
    document.getElementById('edit-sheet-from').value = from;
    document.getElementById('edit-sheet-to').value   = to;
    document.getElementById('edit-sheet-modal').style.display = 'flex';
  }
  function closeEditSheet() {
    document.getElementById('edit-sheet-modal').style.display = 'none';
  }
  async function saveEditSheet() {
    const name = document.getElementById('edit-sheet-name').value.trim();
    const from = document.getElementById('edit-sheet-from').value;
    const to   = document.getElementById('edit-sheet-to').value;
    try {
      await api('PUT', '/api/timesheets/' + editSheetId, { name, period_from: from, period_to: to });
      toast('Fiche mise à jour ✓');
      closeEditSheet();
      loadSheets();
    } catch(err) { toast(err.message, true); }
  }

  // ── DÉTAIL D'UNE FICHE ────────────────────────────────────────────────────
  function openSheet(id, name, periodFrom, periodTo) {
    currentSheetId = id;
    document.getElementById('detail-title').textContent = name + ' (' + fmtDate(periodFrom) + ' → ' + fmtDate(periodTo) + ')';
    document.getElementById('view-list').style.display   = 'none';
    document.getElementById('view-detail').style.display = 'block';
    loadEntries();
  }

  function backToList() {
    currentSheetId = null;
    document.getElementById('view-detail').style.display = 'none';
    document.getElementById('view-list').style.display   = 'block';
    loadSheets();
  }

  async function loadEntries() {
    const rows = await api('GET', '/api/timesheets/' + currentSheetId + '/entries');
    const tbody = document.getElementById('entries-body');
    if (!rows.length) {
      tbody.innerHTML = '<tr><td colspan="6" class="empty">Aucune ligne de pointage.</td></tr>';
      document.getElementById('entry-total').textContent = '';
      return;
    }
    const total = rows.reduce((s, r) => s + r.distance_km, 0);
    document.getElementById('entry-total').textContent = 'Total : ' + total.toFixed(1) + ' km';
    const MOTIF_LABELS = {
      domicile_travail:  'Dom/trav',
      cours_prestation:  'Prestation',
      entre_prestations: 'Entre prest.',
    };
    tbody.innerHTML = rows.map(r => \`
      <tr>
        <td>\${fmtDate(r.date)}</td>
        <td>\${esc(r.from_name)}</td>
        <td>\${esc(r.to_name)}</td>
        <td>\${(r.motifs||[]).map(m => \`<span class="badge" style="background:#e8f0fe;color:#1a73e8;margin-right:.2rem">\${MOTIF_LABELS[m]||m}</span>\`).join('')}</td>
        <td><span class="badge">\${r.distance_km} km</span></td>
        <td>\${esc(r.note)}</td>
        <td style="display:flex;gap:.3rem">
          <button class="btn-edit"   onclick="openEditEntry(\${JSON.stringify(r).replace(/"/g,'&quot;')})">✏️</button>
          <button class="btn-danger" onclick="deleteEntry(\${r.id})">🗑</button>
        </td>
      </tr>\`).join('');
  }

  // Auto-fill distance
  async function lookupDistance() {
    const from = document.getElementById('entry-from').value;
    const to   = document.getElementById('entry-to').value;
    if (!from || !to || from === to) return;
    try {
      const r = await api('GET', \`/api/distances/lookup?from=\${from}&to=\${to}\`);
      if (r.distance_km !== null) document.getElementById('entry-km').value = r.distance_km;
    } catch(_) {}
  }
  async function editEntryLookup() {
    const from = document.getElementById('edit-entry-from').value;
    const to   = document.getElementById('edit-entry-to').value;
    if (!from || !to || from === to) return;
    try {
      const r = await api('GET', \`/api/distances/lookup?from=\${from}&to=\${to}\`);
      if (r.distance_km !== null) document.getElementById('edit-entry-km').value = r.distance_km;
    } catch(_) {}
  }

  // Ajouter une ligne
  document.getElementById('entry-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const date = document.getElementById('entry-date').value;
    const from = parseInt(document.getElementById('entry-from').value);
    const to   = parseInt(document.getElementById('entry-to').value);
    const km   = parseFloat(document.getElementById('entry-km').value);
    const note = document.getElementById('entry-note').value.trim();
    const motifs = ['motif-domicile','motif-cours','motif-entre']
      .filter(id => document.getElementById(id).checked)
      .map(id => document.getElementById(id).value);
    if (!date || !from || !to) { toast('Date, départ et arrivée requis', true); return; }
    if (isNaN(km) || km <= 0)  { toast('Distance invalide', true); return; }
    if (!motifs.length)        { toast('Sélectionnez au moins un motif de déplacement', true); return; }
    try {
      await api('POST', '/api/timesheets/' + currentSheetId + '/entries',
        { date, from_address_id: from, to_address_id: to, distance_km: km, note, motifs });
      toast('Ligne ajoutée ✓');
      document.getElementById('entry-from').value = '';
      document.getElementById('entry-to').value   = '';
      document.getElementById('entry-km').value   = '';
      document.getElementById('entry-note').value = '';
      ['motif-domicile','motif-cours','motif-entre'].forEach(id => document.getElementById(id).checked = false);
      loadEntries();
    } catch(err) { toast(err.message, true); }
  });

  async function deleteEntry(id) {
    if (!confirm('Supprimer cette ligne ?')) return;
    try {
      await api('DELETE', '/api/entries/' + id);
      toast('Ligne supprimée');
      loadEntries();
    } catch(err) { toast(err.message, true); }
  }

  // Edit ligne modal
  function openEditEntry(r) {
    editEntryId = r.id;
    document.getElementById('edit-entry-date').value = r.date;
    document.getElementById('edit-entry-from').value = r.from_address_id;
    document.getElementById('edit-entry-to').value   = r.to_address_id;
    document.getElementById('edit-entry-km').value   = r.distance_km;
    document.getElementById('edit-entry-note').value = r.note;
    const motifs = r.motifs || [];
    document.getElementById('edit-motif-domicile').checked = motifs.includes('domicile_travail');
    document.getElementById('edit-motif-cours').checked    = motifs.includes('cours_prestation');
    document.getElementById('edit-motif-entre').checked    = motifs.includes('entre_prestations');
    document.getElementById('edit-entry-modal').style.display = 'flex';
  }
  function closeEditEntry() {
    document.getElementById('edit-entry-modal').style.display = 'none';
  }
  async function saveEditEntry() {
    const date = document.getElementById('edit-entry-date').value;
    const from = parseInt(document.getElementById('edit-entry-from').value);
    const to   = parseInt(document.getElementById('edit-entry-to').value);
    const km   = parseFloat(document.getElementById('edit-entry-km').value);
    const note = document.getElementById('edit-entry-note').value.trim();
    const motifs = ['edit-motif-domicile','edit-motif-cours','edit-motif-entre']
      .filter(id => document.getElementById(id).checked)
      .map(id => document.getElementById(id).value);
    if (!motifs.length) { toast('Sélectionnez au moins un motif de déplacement', true); return; }
    try {
      await api('PUT', '/api/entries/' + editEntryId,
        { date, from_address_id: from, to_address_id: to, distance_km: km, note, motifs });
      toast('Ligne mise à jour ✓');
      closeEditEntry();
      loadEntries();
    } catch(err) { toast(err.message, true); }
  }

  // ── EXPORT PDF ────────────────────────────────────────────────────────────
  function exportPdf() {
    if (!currentSheetId) return;
    const url = '/api/timesheets/' + currentSheetId + '/export';
    // Déclencher le téléchargement directement
    const a = document.createElement('a');
    a.href = url;
    a.download = '';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast('Génération du PDF…');
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  init();
</script>`;

  return layout("Pointage", "timesheet", body);
}
