/* ----------------------------------------------------------------------------
   Algorithmic (offline, instant) sticking — a deterministic hand-economy +
   alternation heuristic. No network, no waiting. Used as the default; the AI
   coach stays available as an optional "refine + tips" pass.

   Heuristic (right-hand lead):
   - Lead voices (hi-hat / ride / crash) → right hand (the time-keeping hand).
   - Snare / toms / cross-stick → left hand by default (backbeat), BUT when
     several land close together (a fill/run, gaps ≤ a 16th) they ALTERNATE.
   - Simultaneous hits split across the hands: a cymbal/lead voice takes the
     right, the drum takes the left.

   It's a heuristic — great for grooves and most fills, not a substitute for a
   teacher on advanced/ambiguous parts. But it's instant and consistent.
---------------------------------------------------------------------------- */

import type { KitPiece } from './drums';
import type { DrumEvent } from './timeline';
import type { Hand } from '../ai/sticking';

const HAND_PIECES = new Set<KitPiece>([
  'snare', 'hihat', 'hiTom', 'midTom', 'floorTom', 'ride', 'crash',
]);
const LEAD = new Set<KitPiece>(['hihat', 'ride', 'crash']); // right-hand voices
const RUN_GAP = 240; // ticks (a 16th): hits this close count as a run/fill
const X: Record<string, number> = {
  hihat: 0, crash: 1, snare: 2, hiTom: 3, midTom: 4, ride: 5, floorTom: 6,
};

const opp = (h: Hand): Hand => (h === 'R' ? 'L' : 'R');

export function computeAutoSticking(timeline: DrumEvent[]): Map<string, Hand> {
  const out = new Map<string, Hand>();
  let lastHand: Hand = 'R';
  let lastTick = -1;
  let lastWasOther = false; // previous hit was a non-lead (fill candidate)

  let i = 0;
  const n = timeline.length;
  while (i < n) {
    const t = timeline[i].tick;
    const group: DrumEvent[] = [];
    while (i < n && timeline[i].tick === t) {
      if (HAND_PIECES.has(timeline[i].piece)) group.push(timeline[i]);
      i++;
    }
    if (group.length === 0) continue;

    if (group.length === 1) {
      const p = group[0].piece;
      let hand: Hand;
      if (LEAD.has(p)) {
        hand = 'R';
      } else {
        const gap = lastTick >= 0 ? t - lastTick : Infinity;
        hand = gap <= RUN_GAP && lastWasOther ? opp(lastHand) : 'L';
      }
      out.set(`${t}:${p}`, hand);
      lastHand = hand;
      lastWasOther = !LEAD.has(p);
    } else {
      // simultaneous: split across hands
      const sorted = group.slice().sort((a, b) => (X[a.piece] ?? 9) - (X[b.piece] ?? 9));
      const hasLead = sorted.some((g) => LEAD.has(g.piece));
      let usedR = false;
      sorted.forEach((g, k) => {
        const hand: Hand = hasLead
          ? LEAD.has(g.piece)
            ? 'R'
            : 'L'
          : k === 0
            ? 'L'
            : 'R';
        out.set(`${t}:${g.piece}`, hand);
        if (hand === 'R') usedR = true;
      });
      lastHand = usedR ? 'R' : 'L';
      lastWasOther = false;
    }
    lastTick = t;
  }

  return out;
}

/* ----------------------------------------------------------------------------
   Precise sticking — a global cost-minimising DP (Viterbi) over hand
   assignments. Tempo-aware feasibility (a hand can't move faster than
   MIN_SAME_HAND_MS), spatial movement + crossover cost from a kit-geometry
   table, an alternation bias, and lead-hand bias on ostinato voices/accents.
   Looks ahead across the whole phrase, so it can pick a less-obvious hand now
   to avoid an awkward move later.
---------------------------------------------------------------------------- */

type Pos = { x: number; y: number };
const KIT_XY: Record<KitPiece, Pos> = {
  hihat: { x: 1.0, y: 1.2 },
  crash: { x: 1.2, y: 0.0 },
  snare: { x: 2.6, y: 2.0 },
  hiTom: { x: 3.2, y: 0.6 },
  midTom: { x: 4.2, y: 0.6 },
  floorTom: { x: 5.6, y: 1.6 },
  ride: { x: 5.6, y: 0.2 },
  kick: { x: 2.6, y: 3.6 },
};
const DRUMS = new Set<KitPiece>(['snare', 'hiTom', 'midTom', 'floorTom']);

const MIN_SAME_HAND_MS = 105; // below this, one hand can't make both strokes
const W_MOVE = 0.5; // cost per unit of hand travel
const C_DOUBLE = 0.5; // mild bias toward alternating (singles)
const C_CROSS = 2.5; // hands crossed over (drums only)
const C_INFEASIBLE = 60; // same hand too fast
const B_LEAD = 1.0; // bonus for the lead hand on hi-hat/ride/crash
const B_ACCENT = 0.5; // bonus for the lead hand on an accent
const LEAD_HAND_DEFAULT: Hand = 'R';

function dist(a: Pos, b: Pos): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

interface SlotNote { key: string; piece: KitPiece; accent: boolean; pos: Pos }
interface Slot { t: number; notes: SlotNote[] }
interface HandState { pos: Pos | null; t: number; isDrum: boolean }
interface Snap { R: HandState; L: HandState; lastHand: Hand | null }

function slotOptions(notes: SlotNote[]): Hand[][] {
  if (notes.length === 1) return [['R'], ['L']];
  if (notes.length === 2) return [['L', 'R'], ['R', 'L']];
  // 3+ simultaneous (rare): leftmost L, rightmost R, middles alternate.
  return [notes.map((_, i) => (i === 0 ? 'L' : i === notes.length - 1 ? 'R' : i % 2 ? 'R' : 'L'))];
}

function transition(
  snap: Snap,
  slot: Slot,
  opt: Hand[],
  leadHand: Hand,
): { cost: number; next: Snap } {
  let cost = 0;
  const next: Snap = { R: { ...snap.R }, L: { ...snap.L }, lastHand: snap.lastHand };
  for (let i = 0; i < slot.notes.length; i++) {
    const note = slot.notes[i];
    const H = opt[i];
    const prev = next[H];
    if (prev.pos) {
      const gap = slot.t - prev.t;
      if (gap < MIN_SAME_HAND_MS) cost += C_INFEASIBLE * (1 - Math.max(0, gap) / MIN_SAME_HAND_MS);
      cost += W_MOVE * dist(prev.pos, note.pos);
    }
    if (next.lastHand && H === next.lastHand) cost += C_DOUBLE;
    if (LEAD.has(note.piece) && H === leadHand) cost -= B_LEAD;
    if (note.accent && H === leadHand) cost -= B_ACCENT;
    next[H] = { pos: note.pos, t: slot.t, isDrum: DRUMS.has(note.piece) };
    next.lastHand = H;
  }
  // crossover penalty only when BOTH hands are on drums (a cymbal/hi-hat is
  // reached overhead, so a right hand on the left-side hat isn't a "crossover").
  if (
    next.R.pos && next.L.pos && next.R.isDrum && next.L.isDrum &&
    next.L.pos.x > next.R.pos.x + 0.3
  ) {
    cost += C_CROSS;
  }
  return { cost, next };
}

export function computePreciseSticking(
  timeline: DrumEvent[],
  leadHand: Hand = LEAD_HAND_DEFAULT,
): Map<string, Hand> {
  const out = new Map<string, Hand>();

  // Group hand hits into time slots (left→right within a slot).
  const slots: Slot[] = [];
  let i = 0;
  const n = timeline.length;
  while (i < n) {
    const tick = timeline[i].tick;
    const t = timeline[i].timeMs;
    const notes: SlotNote[] = [];
    while (i < n && timeline[i].tick === tick) {
      const ev = timeline[i];
      if (HAND_PIECES.has(ev.piece)) {
        notes.push({ key: `${ev.tick}:${ev.piece}`, piece: ev.piece, accent: ev.accent, pos: KIT_XY[ev.piece] });
      }
      i++;
    }
    if (notes.length) {
      notes.sort((a, b) => a.pos.x - b.pos.x);
      slots.push({ t, notes });
    }
  }
  if (slots.length === 0) return out;

  // DP: dp cell = { cost, snap }; back[s][k] = { opt, prev }.
  const init: Snap = {
    R: { pos: null, t: -1e9, isDrum: false },
    L: { pos: null, t: -1e9, isDrum: false },
    lastHand: null,
  };
  let prev: { cost: number; snap: Snap }[] = [];
  const back: { opt: Hand[]; prev: number }[][] = [];

  const first = slotOptions(slots[0].notes);
  const firstBack: { opt: Hand[]; prev: number }[] = [];
  for (const opt of first) {
    const { cost, next } = transition(init, slots[0], opt, leadHand);
    prev.push({ cost, snap: next });
    firstBack.push({ opt, prev: -1 });
  }
  back.push(firstBack);

  for (let s = 1; s < slots.length; s++) {
    const opts = slotOptions(slots[s].notes);
    const cells: { cost: number; snap: Snap }[] = [];
    const bk: { opt: Hand[]; prev: number }[] = [];
    for (const opt of opts) {
      let best = Infinity;
      let bestSnap: Snap | null = null;
      let bestPrev = 0;
      for (let p = 0; p < prev.length; p++) {
        const { cost, next } = transition(prev[p].snap, slots[s], opt, leadHand);
        const total = prev[p].cost + cost;
        if (total < best) { best = total; bestSnap = next; bestPrev = p; }
      }
      cells.push({ cost: best, snap: bestSnap! });
      bk.push({ opt, prev: bestPrev });
    }
    prev = cells;
    back.push(bk);
  }

  // backtrack the cheapest path
  let idx = 0;
  for (let k = 1; k < prev.length; k++) if (prev[k].cost < prev[idx].cost) idx = k;
  for (let s = slots.length - 1; s >= 0; s--) {
    const { opt, prev: p } = back[s][idx];
    slots[s].notes.forEach((nn, j) => out.set(nn.key, opt[j]));
    if (p < 0) break;
    idx = p;
  }
  return out;
}

// ---------------------------------------------------------------- mode
export type StickingMode = 'precise' | 'simple';
const MODE_KEY = 'drumscore.stickingMode';

export function getStickingMode(): StickingMode {
  try {
    return localStorage.getItem(MODE_KEY) === 'simple' ? 'simple' : 'precise';
  } catch {
    return 'precise';
  }
}
export function setStickingMode(mode: StickingMode): void {
  try {
    localStorage.setItem(MODE_KEY, mode);
  } catch {
    /* ignore */
  }
}
