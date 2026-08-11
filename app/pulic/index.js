<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Gateway — route one prompt, compare every answer</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
  /* Theme system: three named themes, switched via [data-theme] on <html>.
     "dark" is the default look. Add a new theme by copying one of these
     blocks with a new selector and new values - every other rule in this
     file reads colors through the variables below, so no other CSS needs
     to change. See THEMING.md for the full walkthrough. */
  :root,
  [data-theme="dark"] {
    --bg: #10121b;
    --panel: #191c29;
    --panel-raised: #20243452;
    --border: #2a2e42;
    --text: #e8e9f3;
    --muted: #8a8da6;
    --accent: #7c6fff;
    --accent-dim: #7c6fff33;
    --winner: #ffb454;
    --winner-dim: #ffb45422;
  }
  [data-theme="light"] {
    --bg: #f5f5f8;
    --panel: #ffffff;
    --panel-raised: #f0f0f5;
    --border: #dcdce4;
    --text: #17182a;
    --muted: #6b6d80;
    --accent: #5a4fd6;
    --accent-dim: #5a4fd61a;
    --winner: #c97a1f;
    --winner-dim: #c97a1f1a;
  }
  [data-theme="sunset"] {
    --bg: #1c1410;
    --panel: #2a2019;
    --panel-raised: #34281f52;
    --border: #4a382a;
    --text: #f5e9dc;
    --muted: #b09a85;
    --accent: #ff8a5c;
    --accent-dim: #ff8a5c33;
    --winner: #ffd166;
    --winner-dim: #ffd16622;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    background: var(--bg);
    color: var(--text);
    font-family: 'Inter', sans-serif;
    min-height: 100vh;
    transition: background 0.2s ease, color 0.2s ease;
  }
  .wrap { max-width: 1100px; margin: 0 auto; padding: 48px 24px 80px; }

  header { margin-bottom: 36px; }
  .eyebrow {
    font-family: 'JetBrains Mono', monospace;
    font-size: 12px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--accent);
    margin: 0 0 10px;
  }
  h1 {
    font-family: 'Space Grotesk', sans-serif;
    font-size: 34px;
    line-height: 1.15;
    margin: 0 0 10px;
    font-weight: 700;
  }
  header p { color: var(--muted); max-width: 560px; line-height: 1.55; margin: 0; }

  /* Routing visualization - the signature element: prompt fans out to
     provider nodes, then a winner line converges back */
  .routing {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin: 32px 0 28px;
    padding: 18px 22px;
    background: var(--panel);
    border: 1px solid var(--border);
    border-radius: 14px;
  }
  .routing svg { width: 100%; height: 64px; display: block; }
  .node-dot { fill: var(--panel); stroke: var(--border); stroke-width: 1.5; }
  .node-dot.active { stroke: var(--accent); }
  .node-dot.winner { stroke: var(--winner); }
  .route-line { stroke: var(--border); stroke-width: 1.5; fill: none; }
  .route-line.active { stroke: var(--accent); stroke-dasharray: 4 3; animation: dash 0.9s linear infinite; }
  .route-line.winner { stroke: var(--winner); }
  @keyframes dash { to { stroke-dashoffset: -14; } }
  .node-label { font-family: 'JetBrains Mono', monospace; font-size: 10px; fill: var(--muted); }

  .composer {
    background: var(--panel);
    border: 1px solid var(--border);
    border-radius: 14px;
    padding: 20px;
  }
  .composer-row { display: flex; gap: 10px; margin-bottom: 12px; flex-wrap: wrap; }
  select, textarea, button {
    font-family: 'Inter', sans-serif;
    border-radius: 10px;
    border: 1px solid var(--border);
    background: #14162200;
    color: var(--text);
  }
  select {
    background: var(--panel-raised);
    padding: 10px 12px;
    font-size: 13px;
  }
  textarea {
    width: 100%;
    min-height: 100px;
    background: var(--panel-raised);
    padding: 14px;
    font-size: 14px;
    line-height: 1.5;
    resize: vertical;
  }
  textarea:focus, select:focus, button:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 1px;
  }
  .actions { display: flex; justify-content: flex-end; margin-top: 12px; }
  button.primary {
    background: var(--accent);
    color: #10121b;
    border: none;
    font-weight: 600;
    font-size: 14px;
    padding: 12px 22px;
    cursor: pointer;
  }
  button.primary:hover { filter: brightness(1.08); }
  button.primary:disabled { opacity: 0.5; cursor: default; }

  .results {
    margin-top: 28px;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
    gap: 16px;
  }
  .card {
    background: var(--panel);
    border: 1px solid var(--border);
    border-radius: 14px;
    padding: 18px;
    display: flex;
    flex-direction: column;
    transition: border-color 0.2s ease;
  }
  .card.picked { border-color: var(--winner); background: linear-gradient(180deg, var(--winner-dim), var(--panel) 40%); }
  .card-head { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 10px; }
  .card-head h3 { font-family: 'Space Grotesk', sans-serif; font-size: 15px; margin: 0; }
  .latency { font-family: 'JetBrains Mono', monospace; font-size: 11px; color: var(--muted); }
  .card-body {
    font-family: 'JetBrains Mono', monospace;
    font-size: 12.5px;
    line-height: 1.6;
    color: var(--text);
    white-space: pre-wrap;
    flex: 1;
    margin-bottom: 14px;
  }
  .pick-btn {
    align-self: flex-start;
    background: transparent;
    color: var(--muted);
    border: 1px solid var(--border);
    font-size: 12px;
    padding: 7px 14px;
    cursor: pointer;
  }
  .pick-btn:hover { border-color: var(--accent); color: var(--text); }
  .card.picked .pick-btn { background: var(--winner); color: #10121b; border-color: var(--winner); font-weight: 600; }

  .empty {
    margin-top: 28px;
    color: var(--muted);
    font-size: 13px;
    text-align: center;
    padding: 40px 20px;
    border: 1px dashed var(--border);
    border-radius: 14px;
  }

  footer { margin-top: 48px; color: var(--muted); font-size: 12px; text-align: center; }

  .header-row { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; }
  #themeToggle {
    flex-shrink: 0;
    background: var(--panel);
    color: var(--text);
    border: 1px solid var(--border);
    border-radius: 10px;
    font-size: 12px;
    padding: 8px 14px;
    cursor: pointer;
    white-space: nowrap;
  }
  #themeToggle:hover { border-color: var(--accent); }
</style>
</head>
<body>
<div class="wrap">
  <header>
    <div class="header-row">
      <p class="eyebrow">Gateway · 001</p>
      <button id="themeToggle" type="button" aria-label="Switch theme">Theme: Dark</button>
    </div>
    <h1>Send one prompt.<br/>Watch it fan out.</h1>
    <p>Pick a template or write your own prompt. The gateway routes it to every connected model at once, then you choose the response that actually did the job.</p>
  </header>

  <div class="routing" aria-hidden="true">
    <svg id="routingSvg" viewBox="0 0 700 64" xmlns="http://www.w3.org/2000/svg"></svg>
  </div>

  <div class="composer">
    <div class="composer-row">
      <select id="templateSelect">
        <option value="">No template — write your own</option>
      </select>
    </div>
    <textarea id="promptInput" placeholder="Type your prompt, or pick a template above and fill in the details..."></textarea>
    <div class="actions">
      <button class="primary" id="sendBtn">Route to all models</button>
    </div>
  </div>

  <div id="resultsArea">
    <div class="empty">No responses yet — send a prompt to see every model's answer side by side.</div>
  </div>

  <footer>AI Prompt Gateway · built as a CI/CD demo (Jenkins → Docker → Kubernetes → Prometheus/Grafana)</footer>
</div>

<script>
const providerNames = { claude: 'Claude', openai: 'GPT', gemini: 'Gemini' };
let currentPicked = null;

// ---- Theme switching ----
// Cycles dark -> light -> sunset -> dark. Persists the choice in
// localStorage so it survives a refresh; falls back to the system's
// light/dark preference on first visit.
const THEMES = ['dark', 'light', 'sunset'];
const THEME_LABELS = { dark: 'Dark', light: 'Light', sunset: 'Sunset' };

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  document.getElementById('themeToggle').textContent = 'Theme: ' + THEME_LABELS[theme];
  localStorage.setItem('gateway-theme', theme);
}

function initTheme() {
  const saved = localStorage.getItem('gateway-theme');
  if (saved && THEMES.includes(saved)) {
    applyTheme(saved);
    return;
  }
  const prefersLight = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
  applyTheme(prefersLight ? 'light' : 'dark');
}

document.getElementById('themeToggle').addEventListener('click', () => {
  const current = document.documentElement.getAttribute('data-theme') || 'dark';
  const next = THEMES[(THEMES.indexOf(current) + 1) % THEMES.length];
  applyTheme(next);
});

initTheme();

async function loadTemplates() {
  const res = await fetch('/api/templates');
  const templates = await res.json();
  const select = document.getElementById('templateSelect');
  templates.forEach(t => {
    const opt = document.createElement('option');
    opt.value = t.prompt;
    opt.textContent = t.label;
    select.appendChild(opt);
  });
  select.addEventListener('change', () => {
    if (select.value) document.getElementById('promptInput').value = select.value;
  });
}

function drawRouting(state) {
  // state: 'idle' | 'active' | provider id of winner
  const svg = document.getElementById('routingSvg');
  const providers = ['claude', 'openai', 'gemini'];
  const originX = 30, originY = 32;
  const nodeXs = [230, 400, 570];
  const nodeY = 32;

  let lines = '';
  let nodes = `<circle class="node-dot ${state !== 'idle' ? 'active' : ''}" cx="${originX}" cy="${originY}" r="7"></circle>
    <text class="node-label" x="${originX}" y="${originY + 22}" text-anchor="middle">prompt</text>`;

  providers.forEach((p, i) => {
    const x = nodeXs[i];
    const isWinner = state === p;
    const lineActive = state === 'active';
    lines += `<path class="route-line ${lineActive ? 'active' : ''} ${isWinner ? 'winner' : ''}" d="M ${originX + 8} ${originY} L ${x - 8} ${nodeY}"></path>`;
    nodes += `<circle class="node-dot ${lineActive ? 'active' : ''} ${isWinner ? 'winner' : ''}" cx="${x}" cy="${nodeY}" r="7"></circle>
      <text class="node-label" x="${x}" y="${nodeY + 22}" text-anchor="middle">${providerNames[p]}</text>`;
  });

  svg.innerHTML = lines + nodes;
}
drawRouting('idle');

async function sendPrompt() {
  const prompt = document.getElementById('promptInput').value.trim();
  if (!prompt) return;
  const btn = document.getElementById('sendBtn');
  btn.disabled = true;
  btn.textContent = 'Routing...';
  drawRouting('active');
  currentPicked = null;

  try {
    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
    });
    const data = await res.json();
    renderResults(data.results || []);
    drawRouting('idle');
  } catch (e) {
    document.getElementById('resultsArea').innerHTML = '<div class="empty">Something went wrong reaching the gateway. Check the server logs.</div>';
  } finally {
    btn.disabled = false;
    btn.textContent = 'Route to all models';
  }
}

function renderResults(results) {
  const area = document.getElementById('resultsArea');
  if (!results.length) {
    area.innerHTML = '<div class="empty">No responses came back.</div>';
    return;
  }
  area.innerHTML = `<div class="results">${results.map(r => cardHtml(r)).join('')}</div>`;
  results.forEach(r => {
    document.getElementById('pick-' + r.provider).addEventListener('click', () => pick(r.provider));
  });
}

function cardHtml(r) {
  const name = providerNames[r.provider] || r.provider;
  const latency = r.latencyMs != null ? r.latencyMs + ' ms' : '—';
  return `<div class="card" id="card-${r.provider}">
    <div class="card-head"><h3>${name}</h3><span class="latency">${latency}</span></div>
    <div class="card-body">${escapeHtml(r.text)}</div>
    <button class="pick-btn" id="pick-${r.provider}">Pick as best</button>
  </div>`;
}

async function pick(provider) {
  currentPicked = provider;
  document.querySelectorAll('.card').forEach(c => c.classList.remove('picked'));
  document.getElementById('card-' + provider).classList.add('picked');
  document.getElementById('pick-' + provider).textContent = 'Picked ✓';
  drawRouting(provider);
  await fetch('/api/select', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ provider }),
  });
}

function escapeHtml(s) {
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}

document.getElementById('sendBtn').addEventListener('click', sendPrompt);
loadTemplates();
</script>
</body>
</html>

