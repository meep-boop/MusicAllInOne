/* ----------------------------------------------------------------------------
   Store for the current AI sticking result (pub/sub). The highway reads the
   hand map to draw R/L; the tips panel reads the sections + overall note.
---------------------------------------------------------------------------- */

export type Hand = 'R' | 'L';

export interface SectionTip {
  fromBar: number;
  toBar: number;
  tip: string;
}

export interface StickingResult {
  /** key `${tick}:${piece}` -> hand */
  hands: Map<string, Hand>;
  sections: SectionTip[];
  overall: string;
  songTitle: string;
}

let current: StickingResult | null = null;
const listeners = new Set<(r: StickingResult | null) => void>();

export function getSticking(): StickingResult | null {
  return current;
}

export function setSticking(result: StickingResult | null): void {
  current = result;
  for (const l of listeners) l(current);
}

export function clearSticking(): void {
  setSticking(null);
}

export function subscribeSticking(cb: (r: StickingResult | null) => void): () => void {
  listeners.add(cb);
  cb(current);
  return () => listeners.delete(cb);
}
