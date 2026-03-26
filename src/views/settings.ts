import { layout } from "./layout.ts";

export function settingsPage(): string {
  const body = `
<section class="card">
  <h2>Paramètres du PDF</h2>

  <!-- Nom / Prénom du salarié -->
  <div class="form-group" style="max-width:360px;margin-bottom:1.5rem">
    <label>Nom / Prénom du salarié</label>
    <div style="display:flex;gap:.5rem;margin-top:.25rem">
      <input id="fullname-input" type="text" placeholder="Ex : Delphine Hédin" style="flex:1" />
      <button class="btn-primary" onclick="saveFullName()">Enregistrer</button>
    </div>
    <small style="color:#888;font-size:.78rem;margin-top:.3rem;display:block">
      Le fichier exporté sera nommé : <code id="prefix-preview">…</code>
    </small>
  </div>

  <!-- Template PDF -->
  <div style="border-top:1px solid #eee;padding-top:1.25rem;margin-bottom:1.5rem">
    <label style="display:block;margin-bottom:.5rem">Template PDF</label>
    <div style="display:flex;align-items:center;gap:.75rem;flex-wrap:wrap">
      <label class="btn-primary" style="cursor:pointer;font-size:.85rem;padding:.45rem 1rem">
        📎 Charger un template
        <input id="template-upload" type="file" accept="application/pdf" style="display:none" onchange="uploadTemplate(this)" />
      </label>
      <span id="template-status" style="font-size:.85rem;color:#666">Chargement…</span>
    </div>
  </div>

  <!-- Signature PNG -->
  <div style="border-top:1px solid #eee;padding-top:1.25rem">
    <label style="display:block;margin-bottom:.5rem">Signature (PNG — insérée en bas à gauche de la dernière page)</label>
    <div style="display:flex;align-items:center;gap:.75rem;flex-wrap:wrap">
      <label class="btn-primary" style="cursor:pointer;font-size:.85rem;padding:.45rem 1rem">
        🖊 Charger une signature
        <input id="sig-upload" type="file" accept="image/png" style="display:none" onchange="uploadSignature(this)" />
      </label>
      <button id="sig-delete-btn" class="btn-danger" style="display:none;font-size:.85rem" onclick="deleteSignature()">Supprimer</button>
    </div>
    <div id="sig-preview" style="margin-top:.75rem;display:none">
      <img id="sig-img" src="/api/pdf-settings/signature" alt="Signature" style="max-height:80px;border:1px solid #ddd;border-radius:4px;padding:4px;background:#fafafa" />
    </div>
  </div>
</section>

<script>
  async function init() {
    // Charger le nom/prénom
    try {
      const s = await api('GET', '/api/pdf-settings');
      document.getElementById('fullname-input').value = s.full_name || '';
      updatePreview(s.full_name || '');
    } catch(_) {}

    // Vérifier si un template est chargé
    const tplRes = await fetch('/api/template');
    document.getElementById('template-status').textContent =
      tplRes.ok ? '✅ Template chargé' : '⚠️ Aucun template';

    // Vérifier si une signature est chargée
    loadSignaturePreview();
  }

  function toFilePrefix(fullName) {
    if (!fullName) return '…';
    return fullName
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .toLowerCase().trim()
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_]/g, '');
  }

  function updatePreview(fullName) {
    const p = toFilePrefix(fullName) || '…';
    document.getElementById('prefix-preview').textContent = p + '_YYYY-MM-DD_YYYY-MM-DD.pdf';
  }

  document.getElementById('fullname-input').addEventListener('input', (e) => {
    updatePreview(e.target.value);
  });

  async function saveFullName() {
    const full_name = document.getElementById('fullname-input').value.trim();
    if (!full_name) { toast('Le nom ne peut pas être vide', true); return; }
    try {
      await api('POST', '/api/pdf-settings', { full_name });
      toast('Nom enregistré ✓');
      updatePreview(full_name);
    } catch(err) { toast(err.message, true); }
  }

  async function uploadTemplate(input) {
    const file = input.files[0];
    if (!file) return;
    const form = new FormData();
    form.append('file', file);
    loading(true);
    try {
      const res = await fetch('/api/template', { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || res.statusText);
      toast('Template PDF chargé ✓ (' + (data.size / 1024).toFixed(0) + ' Ko)');
      document.getElementById('template-status').textContent = '✅ Template chargé';
    } catch(err) { toast(err.message, true); }
    finally { loading(false); input.value = ''; }
  }

  async function uploadSignature(input) {
    const file = input.files[0];
    if (!file) return;
    const form = new FormData();
    form.append('file', file);
    loading(true);
    try {
      const res = await fetch('/api/pdf-settings/signature', { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || res.statusText);
      toast('Signature chargée ✓ (' + (data.size / 1024).toFixed(1) + ' Ko)');
      loadSignaturePreview();
    } catch(err) { toast(err.message, true); }
    finally { loading(false); input.value = ''; }
  }

  async function deleteSignature() {
    if (!confirm('Supprimer la signature ?')) return;
    try {
      await api('DELETE', '/api/pdf-settings/signature');
      toast('Signature supprimée');
      document.getElementById('sig-preview').style.display = 'none';
      document.getElementById('sig-delete-btn').style.display = 'none';
    } catch(err) { toast(err.message, true); }
  }

  async function loadSignaturePreview() {
    const res = await fetch('/api/pdf-settings/signature');
    const preview = document.getElementById('sig-preview');
    const deleteBtn = document.getElementById('sig-delete-btn');
    if (res.ok) {
      // Forcer le rechargement de l'image
      document.getElementById('sig-img').src = '/api/pdf-settings/signature?t=' + Date.now();
      preview.style.display = 'block';
      deleteBtn.style.display = 'inline-block';
    } else {
      preview.style.display = 'none';
      deleteBtn.style.display = 'none';
    }
  }

  init();
</script>`;

  return layout("Paramètres", "settings", body);
}
