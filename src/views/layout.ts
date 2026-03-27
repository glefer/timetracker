import { APP_VERSION } from "../version.ts";

/** Shared HTML layout wrapper */
export function layout(title: string, activeTab: "config" | "distances" | "timesheet" | "settings", body: string): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="robots" content="noindex">
  <title>${title} — TimeTracker</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, sans-serif; background: #f5f5f5; color: #222; }
    header { background: #1a1a2e; color: #fff; padding: 1rem 1.5rem; display: flex; align-items: center; gap: 1rem; }
    header h1 { font-size: 1.2rem; font-weight: 700; letter-spacing: .05em; }
    header .version { margin-left: auto; font-size: .75rem; color: #999; font-weight: 400; }
    nav { display: flex; gap: .25rem; }
    nav a { padding: .4rem .9rem; border-radius: 4px; color: #cdd; text-decoration: none; font-size: .9rem; transition: background .15s; }
    nav a:hover { background: rgba(255,255,255,.1); }
    nav a.active { background: #e94560; color: #fff; }
    main { max-width: 960px; margin: 2rem auto; padding: 0 1rem; }
    section.card { background: #fff; border-radius: 8px; box-shadow: 0 1px 4px rgba(0,0,0,.08); padding: 1.5rem; margin-bottom: 1.5rem; }
    section.card h2 { font-size: 1.1rem; margin-bottom: 1rem; color: #1a1a2e; border-bottom: 2px solid #e94560; padding-bottom: .4rem; display: inline-block; }
    .form-row { display: flex; gap: .75rem; flex-wrap: wrap; align-items: flex-end; margin-bottom: .75rem; }
    .form-group { display: flex; flex-direction: column; gap: .25rem; flex: 1; min-width: 140px; }
    label { font-size: .8rem; font-weight: 600; color: #555; text-transform: uppercase; letter-spacing: .04em; }
    input, select { padding: .45rem .7rem; border: 1px solid #ccc; border-radius: 4px; font-size: .9rem; background: #fafafa; width: 100%; }
    input:focus, select:focus { outline: 2px solid #e94560; border-color: #e94560; background: #fff; }
    button { padding: .45rem 1.1rem; border: none; border-radius: 4px; font-size: .9rem; cursor: pointer; font-weight: 600; transition: opacity .15s; }
    button:hover { opacity: .85; }
    .btn-primary { background: #e94560; color: #fff; }
    .btn-danger  { background: #dc3545; color: #fff; font-size: .8rem; padding: .3rem .7rem; }
    .btn-edit    { background: #0d6efd; color: #fff; font-size: .8rem; padding: .3rem .7rem; }
    table { width: 100%; border-collapse: collapse; font-size: .9rem; }
    th { text-align: left; padding: .5rem .6rem; background: #f0f0f0; font-size: .78rem; text-transform: uppercase; letter-spacing: .04em; color: #555; border-bottom: 1px solid #ddd; }
    td { padding: .5rem .6rem; border-bottom: 1px solid #eee; vertical-align: middle; }
    tr:last-child td { border-bottom: none; }
    .badge { display: inline-block; background: #e8f4fd; color: #0d6efd; border-radius: 20px; padding: .15rem .6rem; font-size: .78rem; font-weight: 600; }
    .empty { color: #999; font-style: italic; padding: 1rem 0; text-align: center; }
    .toast { position: fixed; bottom: 1.5rem; right: 1.5rem; background: #1a1a2e; color: #fff; padding: .7rem 1.2rem; border-radius: 6px; font-size: .9rem; opacity: 0; transition: opacity .3s; pointer-events: none; z-index: 9999; }
    .toast.show { opacity: 1; }
    .toast.error { background: #dc3545; }
    #loading { position: fixed; top: 0; left: 0; right: 0; height: 3px; background: #e94560; animation: loading-bar 1s ease-in-out infinite; display: none; }
    @keyframes loading-bar { 0%{width:0%;left:0} 50%{width:60%;left:20%} 100%{width:0%;left:100%} }
  </style>
  <script>
    function toast(msg, isError = false) {
      const t = document.getElementById('toast');
      t.textContent = msg;
      t.className = 'toast show' + (isError ? ' error' : '');
      clearTimeout(t._timer);
      t._timer = setTimeout(() => t.className = 'toast', 3000);
    }
    function loading(on) {
      document.getElementById('loading').style.display = on ? 'block' : 'none';
    }
    async function api(method, url, body) {
      loading(true);
      try {
        const res = await fetch(url, {
          method,
          headers: body ? { 'Content-Type': 'application/json' } : {},
          body: body ? JSON.stringify(body) : undefined,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || res.statusText);
        return data;
      } finally {
        loading(false);
      }
    }
    /** Convertit une date ISO (YYYY-MM-DD) en dd/mm/YYYY */
    function fmtDate(iso) {
      if (!iso) return '';
      const [y, m, d] = iso.split('-');
      return d + '/' + m + '/' + y;
    }
  </script>
</head>
<body>
  <div id="loading"></div>
  <div id="toast" class="toast"></div>
  <header>
    <h1>😽 TimeTracker</h1>
    <nav>
      <a href="/timesheet"   class="${activeTab === "timesheet"  ? "active" : ""}">📋 Pointage</a>
      <a href="/config"      class="${activeTab === "config"     ? "active" : ""}">⚙️ Adresses</a>
      <a href="/distances"   class="${activeTab === "distances"  ? "active" : ""}">📏 Distances</a>
      <a href="/settings"    class="${activeTab === "settings"   ? "active" : ""}">🖨 Configuration</a>
    </nav>
    <span class="version">v${APP_VERSION}</span>
  </header>
  <main>${body}</main>
</body>
</html>`;
}
