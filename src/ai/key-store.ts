/* ----------------------------------------------------------------------------
   OpenRouter API key access — STAGE 3 STUB, but isolated now on purpose.

   All key access goes through this one module so the storage backend can later
   swap from localStorage to an OS keychain (e.g. the `keyring` crate under a
   Tauri build) without touching any callers. For personal/local use, plaintext
   localStorage is acceptable (CLAUDE.md §1, §5).
---------------------------------------------------------------------------- */

const KEY = 'drumscore.openrouter.key';
const MODEL_KEY = 'drumscore.openrouter.model';

export function getApiKey(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function setApiKey(key: string): void {
  try {
    localStorage.setItem(KEY, key);
  } catch {
    /* ignore */
  }
}

export function clearApiKey(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

export function hasApiKey(): boolean {
  return !!getApiKey();
}

/** Selected model slug. Defaults are confirmed against OpenRouter's live list
 *  at Stage 3 build time (model names change). */
export function getModel(): string | null {
  try {
    return localStorage.getItem(MODEL_KEY);
  } catch {
    return null;
  }
}
export function setModel(model: string): void {
  try {
    localStorage.setItem(MODEL_KEY, model);
  } catch {
    /* ignore */
  }
}
