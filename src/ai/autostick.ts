/* ----------------------------------------------------------------------------
   Apply the offline (non-AI) sticking to the loaded song, honouring the chosen
   mode (precise DP vs the simple heuristic). Runs on song load and whenever the
   mode changes. The AI button can still override this with a tips-bearing pass.
---------------------------------------------------------------------------- */

import type { ScoreEngine } from '../core/score-engine';
import { buildDrumTimeline } from '../core/timeline';
import {
  computeAutoSticking,
  computePreciseSticking,
  getStickingMode,
} from '../core/sticking-algo';
import { setSticking } from './sticking';

export function applyAutoSticking(engine: ScoreEngine): void {
  const score = engine.api.score;
  if (!score) return;
  const timeline = buildDrumTimeline(score);
  const hands =
    getStickingMode() === 'simple'
      ? computeAutoSticking(timeline)
      : computePreciseSticking(timeline);
  setSticking({
    hands,
    sections: [],
    overall: '',
    songTitle: score.title || 'Untitled',
  });
}
