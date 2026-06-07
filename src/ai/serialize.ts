/* ----------------------------------------------------------------------------
   Serialize the drum part for the AI sticking request — DE-DUPLICATED.

   Repeated bars are collapsed into unique one-bar "patterns" (fingerprinted on
   their HAND hits only — kick excluded, since the foot doesn't change which
   hand plays). We send each unique pattern once plus a compact "form map"
   (bar -> pattern) so the model still sees the song's structure for its tips.

   Each pattern records every occurrence's real (tick, piece) per hit, in the
   same order it's serialized, so the returned per-pattern R/L array maps back
   onto every repeat (keyed by `${tick}:${piece}`).
---------------------------------------------------------------------------- */

import { PIECE_LABEL, KIT_PIECE_ORDER, type KitPiece } from '../core/drums';
import { firstNumAtOrAfter, type DrumEvent, type DrumGrid } from '../core/timeline';

const HAND_PIECES = new Set<KitPiece>([
  'snare', 'hihat', 'hiTom', 'midTom', 'floorTom', 'ride', 'crash',
]);
const PIECE_ORDER = new Map<KitPiece, number>(KIT_PIECE_ORDER.map((p, i) => [p, i]));

export interface PatternOccurrenceHit {
  tick: number;
  piece: KitPiece;
}

export interface UniquePattern {
  id: number; // 1-based
  /** Each occurrence is the ordered list of its hits' (tick, piece). */
  occurrences: PatternOccurrenceHit[][];
}

export interface SerializedUnique {
  text: string;
  patterns: UniquePattern[];
  uniqueCount: number;
  barCount: number;
  totalHandHits: number;
}

function posLabel(relTick: number): string {
  const sixteenth = Math.round(relTick / 240);
  const beat = Math.floor(sixteenth / 4) + 1;
  const sub = ['', 'e', '&', 'a'][((sixteenth % 4) + 4) % 4];
  return `${beat}${sub}`;
}

export function serializeUniqueBars(
  timeline: DrumEvent[],
  grid: DrumGrid,
): SerializedUnique {
  const bars = grid.bars;
  const nBars = bars.length;
  if (nBars === 0) {
    return { text: '', patterns: [], uniqueCount: 0, barCount: 0, totalHandHits: 0 };
  }

  // Bucket hand hits per bar.
  type Hit = { tick: number; piece: KitPiece; accent: boolean; ghost: boolean };
  const perBar: Hit[][] = Array.from({ length: nBars }, () => []);
  let totalHandHits = 0;
  for (const ev of timeline) {
    if (!HAND_PIECES.has(ev.piece)) continue;
    const bi = firstNumAtOrAfter(bars, ev.tick + 1) - 1;
    if (bi < 0 || bi >= nBars) continue;
    perBar[bi].push({ tick: ev.tick, piece: ev.piece, accent: ev.accent, ghost: ev.ghost });
    totalHandHits++;
  }
  for (const arr of perBar) {
    arr.sort(
      (a, b) =>
        a.tick - b.tick ||
        (PIECE_ORDER.get(a.piece) ?? 9) - (PIECE_ORDER.get(b.piece) ?? 9),
    );
  }

  // Fingerprint each bar (relative positions + drum + flags) and group.
  const fpToId = new Map<string, number>();
  const patterns: {
    id: number;
    labels: string[];
    occurrences: PatternOccurrenceHit[][];
    count: number;
  }[] = [];
  const barPattern = new Array<number>(nBars).fill(0); // 0 = no hand hits

  for (let i = 0; i < nBars; i++) {
    const hits = perBar[i];
    if (hits.length === 0) continue;
    const start = bars[i];
    const fp = hits
      .map((h) => `${h.tick - start}:${h.piece}:${h.accent ? 1 : 0}${h.ghost ? 1 : 0}`)
      .join(',');
    let id = fpToId.get(fp);
    if (id === undefined) {
      id = patterns.length + 1;
      fpToId.set(fp, id);
      patterns.push({
        id,
        labels: hits.map(
          (h) =>
            `${PIECE_LABEL[h.piece]}@${posLabel(h.tick - start)}${h.accent ? '>' : ''}${h.ghost ? '~' : ''}`,
        ),
        occurrences: [],
        count: 0,
      });
    }
    const pat = patterns[id - 1];
    pat.occurrences.push(hits.map((h) => ({ tick: h.tick, piece: h.piece })));
    pat.count++;
    barPattern[i] = id;
  }

  // Build the prompt body.
  const lines: string[] = [];
  lines.push(
    'Each Pattern is one bar of HAND hits (kick/feet omitted). Assign R or L to ' +
      'every hit IN ORDER. Drums: HH=hi-hat SN=snare RD=ride CR=crash T1=hi-tom ' +
      'T2=mid-tom FT=floor-tom. ">"=accent "~"=ghost. Position is beat[e/&/a].',
  );
  for (const p of patterns) {
    lines.push(`Pattern ${p.id} (${p.count}x, ${p.labels.length} hits): ${p.labels.join(' ')}`);
  }
  const form: string[] = [];
  for (let i = 0; i < nBars; i++) form.push(`${i + 1}:${barPattern[i] || '-'}`);
  lines.push(`Form (bar:pattern, "-"=no hand hits): ${form.join(' ')}`);

  return {
    text: lines.join('\n'),
    patterns: patterns.map((p) => ({ id: p.id, occurrences: p.occurrences })),
    uniqueCount: patterns.length,
    barCount: nBars,
    totalHandHits,
  };
}
