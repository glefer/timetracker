import { layout } from "./layout.ts";

export function configPage(): string {
  const body = `
<section class="card">
  <h2>Ajouter une adresse</h2>
  <form id="add-form" class="form-row">
    <div class="form-group">
      <label for="name">Nom</label>
      <input id="name" type="text" placeholder="Ex : Domicile, Bureau..." required />
    </div>
    <div class="form-group" style="flex:2">
      <label for="address">Adresse</label>
      <input id="address" type="text" placeholder="Ex : 12 rue de la Paix, Paris" required />
    </div>
    <button type="submit" class="btn-primary">Ajouter</button>
  </form>
</section>

<section class="card">
  <h2>Adresses enregistrées</h2>
  <table id="addr-table">
    <thead>
      <tr><th>Nom</th><th>Adresse</th><th style="width:110px"></th></tr>
    </thead>
    <tbody id="addr-body">
      <tr><td colspan="3" class="empty">Chargement…</td></tr>
    </tbody>
  </table>
</section>

<!-- Edit modal -->
<div id="edit-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:100;align-items:center;justify-content:center;">
  <div style="background:#fff;border-radius:8px;padding:1.5rem;width:min(480px,90%);box-shadow:0 4px 24px rgba(0,0,0,.2)">
    <h2 style="margin-bottom:1rem">Modifier l'adresse</h2>
    <div class="form-group" style="margin-bottom:.75rem">
      <label>Nom</label>
      <input id="edit-name" type="text" />
    </div>
    <div class="form-group" style="margin-bottom:1rem">
      <label>Adresse</label>
      <input id="edit-address" type="text" />
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
    const rows = await api('GET', '/api/addresses');
    const tbody = document.getElementById('addr-body');
    if (!rows.length) { tbody.innerHTML = '<tr><td colspan="3" class="empty">Aucune adresse enregistrée.</td></tr>'; return; }
    tbody.innerHTML = rows.map(r => \`
      <tr data-id="\${r.id}">
        <td><strong>\${esc(r.name)}</strong></td>
        <td>\${esc(r.address)}</td>
        <td style="white-space:nowrap;display:flex;gap:.3rem">
          <button class="btn-edit"   onclick="openEdit(\${r.id},'\${esc(r.name)}','\${esc(r.address)}')">Modifier</button>
          <button class="btn-danger" onclick="deleteAddress(\${r.id})">Supprimer</button>
        </td>
      </tr>\`).join('');
  }

  document.getElementById('add-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name    = document.getElementById('name').value.trim();
    const address = document.getElementById('address').value.trim();
    try {
      await api('POST', '/api/addresses', { name, address });
      toast('Adresse ajoutée ✓');
      e.target.reset();
      loadAddresses();
    } catch(err) { toast(err.message, true); }
  });

  async function deleteAddress(id) {
    if (!confirm('Supprimer cette adresse ?')) return;
    try {
      await api('DELETE', '/api/addresses/' + id);
      toast('Adresse supprimée');
      loadAddresses();
    } catch(err) { toast(err.message, true); }
  }

  function openEdit(id, name, address) {
    editId = id;
    document.getElementById('edit-name').value = name;
    document.getElementById('edit-address').value = address;
    const m = document.getElementById('edit-modal');
    m.style.display = 'flex';
  }

  function closeEdit() {
    document.getElementById('edit-modal').style.display = 'none';
    editId = null;
  }

  async function saveEdit() {
    const name    = document.getElementById('edit-name').value.trim();
    const address = document.getElementById('edit-address').value.trim();
    try {
      await api('PUT', '/api/addresses/' + editId, { name, address });
      toast('Adresse mise à jour ✓');
      closeEdit();
      loadAddresses();
    } catch(err) { toast(err.message, true); }
  }

  function esc(s) { return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

  loadAddresses();
</script>`;

  return layout("Configuration", "config", body);
}
