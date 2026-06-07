/* ----------------------------------------------------------------------------
   AI coach tips panel. Subscribes to the sticking store and shows the overall
   note + per-section practice tips. Auto-opens when a fresh analysis lands.
---------------------------------------------------------------------------- */

import { subscribeSticking, type StickingResult } from '../ai/sticking';
import { openAiLog } from './ai-log';

export function createAiPanel(): { open: () => void } {
  const overlay = document.createElement('div');
  overlay.className = 'overlay settings-overlay';
  overlay.innerHTML = `
    <div class="settings-card">
      <div class="settings-head">
        <h2>Coach — sticking &amp; tips</h2>
        <button class="btn icon ai-close" title="Close">✕</button>
      </div>
      <div class="settings-body ai-body"></div>
      <div class="settings-foot">
        <button class="btn ai-viewlog">View log</button>
        <button class="btn btn-primary ai-done">Done</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);

  const body = overlay.querySelector('.ai-body') as HTMLElement;
  const close = () => overlay.classList.remove('is-visible');
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });
  (overlay.querySelector('.ai-close') as HTMLElement).onclick = close;
  (overlay.querySelector('.ai-done') as HTMLElement).onclick = close;
  (overlay.querySelector('.ai-viewlog') as HTMLElement).onclick = () => openAiLog();

  function render(r: StickingResult | null): void {
    if (!r) {
      body.innerHTML =
        '<p class="ai-empty">No analysis yet. Press <b>AI</b> in the transport bar to get sticking + tips for the loaded song.</p>';
      return;
    }
    const sections = r.sections.length
      ? r.sections
          .map(
            (s) => `
            <div class="ai-tip">
              <span class="ai-bars">Bars ${s.fromBar}–${s.toBar}</span>
              <span>${escapeHtml(s.tip)}</span>
            </div>`,
          )
          .join('')
      : '<p class="ai-empty">No section tips returned.</p>';

    body.innerHTML = `
      <section class="settings-section">
        <h3>Overall</h3>
        <p class="ai-overall">${escapeHtml(r.overall) || '—'}</p>
      </section>
      <section class="settings-section">
        <h3>Per-section tips</h3>
        ${sections}
      </section>
      <p class="ai-note">R / L stickings are shown on the highway notes.</p>`;
  }

  // Re-render whenever the result changes; auto-open only for AI results that
  // carry tips (the instant algorithmic default has no tips, so stays quiet).
  let first = true;
  subscribeSticking((r) => {
    render(r);
    if (!first && r && (r.overall || r.sections.length)) {
      overlay.classList.add('is-visible');
    }
    first = false;
  });

  return { open: () => overlay.classList.add('is-visible') };
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"]/g, (c) =>
    c === '&' ? '&amp;' : c === '<' ? '&lt;' : c === '>' ? '&gt;' : '&quot;',
  );
}
