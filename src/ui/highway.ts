/* ----------------------------------------------------------------------------
   Falling-notes highway (Guitar-Hero style), drawn on a <canvas>.

   One lane per drum piece. Notes fall toward a hit line near the bottom (just
   above the kit). Position is driven by the live MIDI tick position, so it stays
   in sync through tempo changes and the speed slider. Purely a visual guide
   (no input scoring yet — that comes with the Stage 5 mic follower).
---------------------------------------------------------------------------- */

import type { ScoreEngine } from '../core/score-engine';
import {
  KIT_PIECE_ORDER,
  PIECE_LABEL,
  PIECE_VOICE,
  QUARTER_TICKS,
  type KitPiece,
} from '../core/drums';
import {
  firstIndexAtOrAfter,
  firstNumAtOrAfter,
  type DrumEvent,
  type DrumGrid,
} from '../core/timeline';
import { getViz } from '../core/viz';
import { getSticking } from '../ai/sticking';

const LANE_INDEX = new Map<KitPiece, number>(
  KIT_PIECE_ORDER.map((p, i) => [p, i]),
);

/** Darken a #rrggbb colour by a factor (0..1) — the inner-marker shade. */
function darken(hex: string, f: number): string {
  const m = /^#?([0-9a-fA-F]{6})$/.exec(hex);
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const r = Math.round(((n >> 16) & 255) * f);
  const g = Math.round(((n >> 8) & 255) * f);
  const b = Math.round((n & 255) * f);
  return `rgb(${r},${g},${b})`;
}

export class Highway {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly engine: ScoreEngine;
  private events: DrumEvent[] = [];
  private grid: DrumGrid = { bars: [], quarters: [], eighths: [] };
  private raf = 0;
  private running = false;

  constructor(canvas: HTMLCanvasElement, engine: ScoreEngine) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.engine = engine;
    if ('ResizeObserver' in window) {
      new ResizeObserver(() => this.resize()).observe(canvas);
    }
    this.resize();
  }

  setTimeline(events: DrumEvent[]): void {
    this.events = events;
  }

  setGrid(grid: DrumGrid): void {
    this.grid = grid;
  }

  resize(): void {
    const dpr = window.devicePixelRatio || 1;
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    this.canvas.width = Math.max(1, Math.round(w * dpr));
    this.canvas.height = Math.max(1, Math.round(h * dpr));
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    const loop = () => {
      if (!this.running) return;
      this.draw();
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  private draw(): void {
    const ctx = this.ctx;
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    ctx.clearRect(0, 0, w, h);

    const lanes = KIT_PIECE_ORDER.length;
    const laneW = w / lanes;
    const topY = 6;
    const hitY = h - 24;
    const windowTicks = getViz().lookaheadBeats * QUARTER_TICKS;
    const now = this.engine.currentTick;
    const colours = this.engine.getDrumColors().colors;

    // lanes
    for (let i = 0; i < lanes; i++) {
      const piece = KIT_PIECE_ORDER[i];
      const x = i * laneW;
      ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.025)' : 'rgba(255,255,255,0.05)';
      ctx.fillRect(x, 0, laneW, h);
      ctx.strokeStyle = 'rgba(255,255,255,0.07)';
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
      // label
      ctx.fillStyle = 'rgba(231,233,238,0.5)';
      ctx.font = '700 10px -apple-system, Segoe UI, Roboto, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(PIECE_LABEL[piece], x + laneW / 2, h - 8);
    }

    // beat / bar gridlines (horizontal), scrolling with the music
    const drawGrid = (ticks: number[], style: string, lw: number) => {
      ctx.strokeStyle = style;
      ctx.lineWidth = lw;
      for (let gi = firstNumAtOrAfter(ticks, now); gi < ticks.length; gi++) {
        const dt = ticks[gi] - now;
        if (dt > windowTicks) break;
        const y = hitY - (dt / windowTicks) * (hitY - topY);
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }
    };
    drawGrid(this.grid.eighths, 'rgba(255,255,255,0.05)', 1); // "&" off-beats: faint
    drawGrid(this.grid.quarters, 'rgba(255,255,255,0.20)', 1); // numbered beats: clearer
    drawGrid(this.grid.bars, 'rgba(255,255,255,0.45)', 2); // bar lines: clearest

    // hit line
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, hitY);
    ctx.lineTo(w, hitY);
    ctx.stroke();
    ctx.lineWidth = 1;

    // counts ruler (1 e & a …) down the left edge
    this.drawRuler(now, windowTicks, topY, hitY);

    if (this.events.length === 0) return;

    // Uniform note boxes. Height fills most of a 16th slot (adjustable), so
    // 16ths sit close; width fills the lane minus a small margin (adjustable).
    const v = getViz();
    const sixteenthPx = (240 / windowTicks) * (hitY - topY);
    const boxH = Math.max(6, sixteenthPx * v.noteFill);
    const boxW = Math.max(6, laneW - 2 * v.laneMargin);
    const sticking = getSticking();

    // notes within [now, now + window]
    let i = firstIndexAtOrAfter(this.events, now);
    for (; i < this.events.length; i++) {
      const ev = this.events[i];
      const dt = ev.tick - now;
      if (dt > windowTicks) break;
      if (dt < 0) continue;
      const frac = dt / windowTicks; // 0 at hit line, 1 at top
      const lane = LANE_INDEX.get(ev.piece);
      if (lane === undefined) continue;
      const cx = lane * laneW + laneW / 2;
      const cy = hitY - frac * (hitY - topY);
      const colour = colours[PIECE_VOICE[ev.piece]];

      // Uniform box; the inner highlight encodes the 16th position in the beat:
      //   0 (on the beat) = bar,  1 (e) = ▲,  2 (&) = ◆,  3 (a) = ▼
      const sub = Math.round((ev.tick % 960) / 240) % 4;
      const alpha = Math.max(0.4, 1 - frac * 0.45);
      this.drawNote(cx, cy, boxW, boxH, sub, colour, ev.accent, ev.ghost, alpha);

      // sticking letter (R/L) from the AI coach
      if (sticking && boxH >= 9) {
        const hand = sticking.hands.get(`${ev.tick}:${ev.piece}`);
        if (hand) {
          ctx.globalAlpha = alpha;
          ctx.fillStyle = 'rgba(255,255,255,0.96)';
          ctx.font = `700 ${Math.min(12, Math.round(boxH * 0.82))}px -apple-system, Segoe UI, Roboto, sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(hand, cx, cy + 0.5);
          ctx.globalAlpha = 1;
        }
      }
    }
    ctx.textBaseline = 'alphabetic';
  }

  /** A uniform rounded box. Off-beats (e/&/a) get an inner marker — a darker
   *  shade of the note colour, filling the box edge-to-edge. The down-beat (1)
   *  is left as a plain box. */
  private drawNote(
    cx: number, cy: number, w: number, h: number, sub: number,
    colour: string, accent: boolean, ghost: boolean, alpha: number,
  ): void {
    const ctx = this.ctx;
    ctx.globalAlpha = alpha;
    const hw = w / 2;
    const hh = h / 2;

    // outer box (same size for every note)
    this.roundRect(cx - hw, cy - hh, w, h, Math.min(2, hh));
    if (ghost) {
      ctx.strokeStyle = colour;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    } else {
      ctx.fillStyle = colour;
      ctx.fill();
    }
    if (accent) {
      ctx.strokeStyle = 'rgba(255,255,255,0.92)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
    ctx.lineWidth = 1;

    if (sub === 0) {
      ctx.globalAlpha = 1; // down-beat: plain box, no marker
      return;
    }

    // marker fills the box edge-to-edge: corners → centre (triangles) / full ◆
    ctx.fillStyle = ghost ? colour : darken(colour, 0.5);
    ctx.beginPath();
    switch (sub) {
      case 1: // e — ▲ base at bottom, apex at centre
        ctx.moveTo(cx - hw, cy + hh);
        ctx.lineTo(cx + hw, cy + hh);
        ctx.lineTo(cx, cy);
        ctx.closePath();
        break;
      case 2: // & — ◆ full
        ctx.moveTo(cx, cy - hh);
        ctx.lineTo(cx + hw, cy);
        ctx.lineTo(cx, cy + hh);
        ctx.lineTo(cx - hw, cy);
        ctx.closePath();
        break;
      case 3: // a — ▼ base at top, apex at centre
        ctx.moveTo(cx - hw, cy - hh);
        ctx.lineTo(cx + hw, cy - hh);
        ctx.lineTo(cx, cy);
        ctx.closePath();
        break;
    }
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  private roundRect(x: number, y: number, w: number, h: number, r: number): void {
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  /** Counts ruler down the left edge: beat numbers + e / & / a. */
  private drawRuler(now: number, windowTicks: number, topY: number, hitY: number): void {
    const ctx = this.ctx;
    ctx.textAlign = 'left';
    const start = Math.ceil(now / 240) * 240; // first 16th at/after now
    for (let t = start; t - now <= windowTicks; t += 240) {
      const y = hitY - ((t - now) / windowTicks) * (hitY - topY);
      const m = ((t % 960) + 960) % 960;
      let text: string;
      let strong = false;
      if (m === 0) {
        const bi = firstNumAtOrAfter(this.grid.bars, t + 1) - 1;
        const barStart = bi >= 0 ? this.grid.bars[bi] : 0;
        text = String(Math.round((t - barStart) / 960) + 1);
        strong = true;
      } else if (m === 240) text = 'e';
      else if (m === 480) text = '&';
      else text = 'a';
      ctx.fillStyle = strong ? 'rgba(231,233,238,0.72)' : 'rgba(231,233,238,0.34)';
      ctx.font = strong
        ? '700 11px -apple-system, Segoe UI, Roboto, sans-serif'
        : '600 9px -apple-system, Segoe UI, Roboto, sans-serif';
      ctx.fillText(text, 3, y + 3);
    }
  }
}
