/* ----------------------------------------------------------------------------
   Keybinds — default map + load/save. Used by the Stage 2 keypress editor.

   Defined now (and persisted) so they're "data, not logic" (CLAUDE.md §3):
   editable at runtime, never hard-coded into the editor. The editor reads this
   map; settings UI rewrites it.
---------------------------------------------------------------------------- */

import type { DrumHit } from '../core/score-commands';

export type EditorAction = DrumHit | 'accentModifier' | 'ghostModifier';

/** Lower-cased single-key -> action. Modifiers handled separately by the editor. */
export type KeyMap = Record<string, EditorAction>;

export const DEFAULT_KEYBINDS: KeyMap = {
  k: 'kick',
  s: 'snare',
  h: 'hihatClosed',
  o: 'hihatOpen',
  p: 'hihatPedal',
  c: 'crash',
  r: 'ride',
  b: 'rideBell',
  '1': 'highTom',
  '2': 'midTom',
  '3': 'floorTom',
  x: 'crossStick',
  // Held while striking a key:
  shift: 'accentModifier',
  g: 'ghostModifier',
};

const KEY = 'drumscore.keybinds';

export function loadKeybinds(): KeyMap {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT_KEYBINDS };
    return { ...DEFAULT_KEYBINDS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_KEYBINDS };
  }
}

export function saveKeybinds(map: KeyMap): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(map));
  } catch {
    /* ignore */
  }
}
