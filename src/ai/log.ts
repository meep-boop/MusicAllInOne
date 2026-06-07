/* ----------------------------------------------------------------------------
   Lightweight in-memory log for AI requests/responses/errors, surfaced in a
   viewer (Settings → AI → View log). Keeps the last N entries.
---------------------------------------------------------------------------- */

export type LogLevel = 'info' | 'error';

export interface LogEntry {
  time: number;
  level: LogLevel;
  label: string;
  detail?: string;
}

const MAX = 60;
let entries: LogEntry[] = [];
const listeners = new Set<() => void>();

export function aiLog(level: LogLevel, label: string, detail?: string): void {
  entries.push({ time: Date.now(), level, label, detail });
  if (entries.length > MAX) entries = entries.slice(-MAX);
  for (const l of listeners) l();
}

export function getLog(): LogEntry[] {
  return entries;
}

export function clearLog(): void {
  entries = [];
  for (const l of listeners) l();
}

export function subscribeLog(cb: () => void): () => void {
  listeners.add(cb);
  cb();
  return () => listeners.delete(cb);
}
