/* A tiny transient toast notification. */
export function toast(message: string): void {
  const el = document.createElement('div');
  el.textContent = message;
  el.style.cssText = `
    position: fixed; left: 50%; bottom: 84px; transform: translateX(-50%);
    max-width: min(520px, 90vw); background: #242833; color: #e7e9ee;
    border: 1px solid #2e333f; padding: 10px 16px; border-radius: 10px;
    z-index: 2000; box-shadow: 0 10px 30px rgba(0,0,0,.5); font-size: 13px;
    line-height: 1.4;`;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 4200);
}
