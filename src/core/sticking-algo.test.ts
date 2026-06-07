import { describe, it, expect } from 'vitest';
import { computePreciseSticking } from './sticking-algo';
import type { DrumEvent } from './timeline';
import type { KitPiece } from './drums';

function ev(tick: number, timeMs: number, piece: KitPiece, accent = false): DrumEvent {
  return { tick, timeMs, piece, accent, ghost: false, velocity: 0.7 };
}

describe('computePreciseSticking', () => {
  it('forces alternation on a fast single-surface run', () => {
    // 16th snare run with 80ms gaps (< the min single-hand interval)
    const tl: DrumEvent[] = [];
    for (let k = 0; k < 8; k++) tl.push(ev(k * 240, k * 80, 'snare'));
    const m = computePreciseSticking(tl);
    let prev: string | undefined;
    for (let k = 0; k < 8; k++) {
      const h = m.get(`${k * 240}:snare`);
      expect(h).toBeTruthy();
      if (prev) expect(h).not.toBe(prev); // no two consecutive same hand
      prev = h;
    }
  });

  it('keeps the lead hand on a steady (comfortable) hi-hat ostinato', () => {
    const tl: DrumEvent[] = [];
    for (let k = 0; k < 8; k++) tl.push(ev(k * 240, k * 250, 'hihat'));
    const m = computePreciseSticking(tl);
    for (let k = 0; k < 8; k++) expect(m.get(`${k * 240}:hihat`)).toBe('R');
  });

  it('splits a hat+snare backbeat: hat right, snare left', () => {
    const tl = [ev(0, 0, 'hihat'), ev(0, 0, 'snare')];
    const m = computePreciseSticking(tl);
    expect(m.get('0:hihat')).toBe('R');
    expect(m.get('0:snare')).toBe('L');
  });

  it('a simple 8th-hat groove keeps hats on R and backbeats on L', () => {
    const tl: DrumEvent[] = [];
    for (let k = 0; k < 8; k++) tl.push(ev(k * 480, k * 250, 'hihat'));
    tl.push(ev(2 * 480, 2 * 250, 'snare'));
    tl.push(ev(6 * 480, 6 * 250, 'snare'));
    tl.sort((a, b) => a.tick - b.tick);
    const m = computePreciseSticking(tl);
    for (let k = 0; k < 8; k++) expect(m.get(`${k * 480}:hihat`)).toBe('R');
    expect(m.get(`${2 * 480}:snare`)).toBe('L');
    expect(m.get(`${6 * 480}:snare`)).toBe('L');
  });
});
