/* ----------------------------------------------------------------------------
   AI log viewer (singleton modal). Shows the request prompt, the raw model
   response, and any errors — so you can see exactly what came back.
   Open via openAiLog() (wired from Settings → AI and the coach panel).
---------------------------------------------------------------------------- */

import { getLog, clearLog, subscribeLog } from '../ai/log';

let overlay: HTMLElement | null = null;
let body: HTMLElement | null = null;

function fmtTime(t: number): string {
  const d = new Date(t);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}
function escapeHtml(s: string): string {
  return s.replace(/[&<>]/g, (c) => (c === '&' ? '&amp;' : c === '<' ? '&lt;' : '&gt;'));
}

function render(): void {
  if (!body) return;
  const entries = getLog();
  if (entries.length === 0) {
    body.innerHTML = '<p class="ai-empty">No AI activity yet. Press the AI button to run an analysis.</p>';
    return;
  }
  body.innerHTML = entries
    .slice()
    .reverse()
    .map(
      (e) => `
      <div class="log-entry ${e.level}">
        <div class="log-head">
          <span class="log-time">${fmtTime(e.time)}</span>
          <span class="log-label">${escapeHtml(e.label)}</span>
        </div>
        ${e.detail ? `<pre class="log-detail">${escapeHtml(e.detail)}</pre>` : ''}
      </div>`,
    )
    .join('');
}

function ensure(): void {
  if (overlay) return;
  overlay = document.createElement('div');
  overlay.className = 'overlay settings-overlay';
  overlay.innerHTML = `
    <div class="settings-card">
      <div class="settings-head">
        <h2>AI log</h2>
        <div class="log-actions">
          <button class="btn log-clear">Clear</button>
          <button class="btn icon log-close" title="Close">✕</button>
        </div>
      </div>
      <div class="settings-body log-body"></div>
    </div>`;
  document.body.appendChild(overlay);
  body = overlay.querySelector('.log-body') as HTMLElement;

  const close = () => overlay!.classList.remove('is-visible');
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });
  (overlay.querySelector('.log-close') as HTMLElement).onclick = close;
  (overlay.querySelector('.log-clear') as HTMLElement).onclick = () => clearLog();
  subscribeLog(render);
}

export function openAiLog(): void {
  ensure();
  render();
  overlay!.classList.add('is-visible');
}
