import { layout } from "./layout.ts";

export function distancesPage(): string {
  const body = `
<section class="card">
  <h2>Ajouter une distance</h2>
  <form id="dist-form" class="form-row">
    <div class="form-group">
      <label>Départ</label>
      <select id="from-addr" required><option value="">Chargement…</option></select>
    </div>
    <div class="form-group">
      <label>Arrivée</label>
      <select id="to-addr" required><option value="">Chargement…</option></select>
    </div>
    <div class="form-group" style="max-width:130px">
      <label>Distance (km)</label>
      <input id="dist-km" type="number" min="0.1" step="0.1" placeholder="Ex : 12.5" required />
    </div>
    <button type="submit" class="btn-primary">Ajouter</button>
  </form>
</section>

<section class="card">
  <h2>Distances enregistrées</h2>
  <table>
    <thead>
      <tr><th>Départ</th><th>Arrivée</th><th>Distance</th><th style="width:110px"></th></tr>
    </thead>
    <tbody id="dist-body">
      <tr><td colspan="4" class="empty">Chargement…</td></tr>
    </tbody>
  </table>
</section>

<!-- Edit modal -->
<div id="edit-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:100;align-items:center;justify-content:center;">
  <div style="background:#fff;border-radius:8px;padding:1.5rem;width:min(380px,90%);box-shadow:0 4px 24px rgba(0,0,0,.2)">
    <h2 style="margin-bottom:1rem">Modifier la distance</h2>
    <p id="edit-label" style="margin-bottom:.75rem;color:#555;font-size:.9rem"></p>
    <div class="form-group" style="margin-bottom:1rem">
      <label>Distance (km)</label>
      <input id="edit-km" type="number" min="0.1" step="0.1" />
    </div>
    <div style="display:flex;gap:.5rem;justify-content:flex-end">
      <button onclick="closeEdit()" style="background:#eee;color:#333">Annuler</button>
      <button onclick="saveEdit()" class="btn-primary">Enregistrer</button>
    </div>
  </div>
</div>

<script>
  let editId = null;

  async function loadAddresses() {
    const addrs = await api('GET', '/api/addresses');
    ['from-addr','to-addr'].forEach(id => {
      const sel = document.getElementById(id);
      sel.innerHTML = '<option value="">— Sélectionner —</option>' +
        addrs.map(a => \`<option value="\${a.id}">\${esc(a.name)}</option>\`).join('');
    });
  }

  async function loadDistances() {
    const rows = await api('GET', '/api/distances');
    const tbody = document.getElementById('dist-body');
    if (!rows.length) { tbody.innerHTML = '<tr><td colspan="4" class="empty">Aucune distance enregistrée.</td></tr>'; return; }
    tbody.innerHTML = rows.map(r => \`
      <tr data-id="\${r.id}">
        <td>\${esc(r.from_name)}</td>
        <td>\${esc(r.to_name)}</td>
        <td><span class="badge">\${r.distance_km} km</span></td>
        <td style="display:flex;gap:.3rem">
          <button class="btn-edit"   onclick="openEdit(\${r.id},\${r.distance_km},'\${esc(r.from_name)}','\${esc(r.to_name)}')">Modifier</button>
          <button class="btn-danger" onclick="deleteDistance(\${r.id})">Supprimer</button>
        </td>
      </tr>\`).join('');
  }

  document.getElementById('dist-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const from = parseInt(document.getElementById('from-addr').value);
    const to   = parseInt(document.getElementById('to-addr').value);
    const km   = parseFloat(document.getElementById('dist-km').value);
    if (!from || !to) { toast('Sélectionnez les deux adresses', true); return; }
    if (from === to) { toast('Les adresses doivent être différentes', true); return; }
    try {
      await api('POST', '/api/distances', { from_address_id: from, to_address_id: to, distance_km: km });
      toast('Distance enregistrée ✓');
      e.target.reset();
      loadDistances();
    } catch(err) { toast(err.message, true); }
  });

  async function deleteDistance(id) {
    if (!confirm('Supprimer cette distance ?')) return;
    try {
      await api('DELETE', '/api/distances/' + id);
      toast('Distance supprimée');
      loadDistances();
    } catch(err) { toast(err.message, true); }
  }

  function openEdit(id, km, fromName, toName) {
    editId = id;
    document.getElementById('edit-km').value = km;
    document.getElementById('edit-label').textContent = fromName + ' → ' + toName;
    const m = document.getElementById('edit-modal');
    m.style.display = 'flex';
  }

  function closeEdit() {
    document.getElementById('edit-modal').style.display = 'none';
    editId = null;
  }

  async function saveEdit() {
    const km = parseFloat(document.getElementById('edit-km').value);
    try {
      await api('PUT', '/api/distances/' + editId, { distance_km: km });
      toast('Distance mise à jour ✓');
      closeEdit();
      loadDistances();
    } catch(err) { toast(err.message, true); }
  }

  function esc(s) { return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

  loadAddresses().then(() => loadDistances());
</script>`;

  return layout("Distances", "distances", body);
}
