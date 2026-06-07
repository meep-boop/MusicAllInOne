/* ----------------------------------------------------------------------------
   Drum voice → colour map.

   Shared by two features:
   - Colour-coded noteheads on the sheet (e.g. snare is always yellow).
   - The live drum-kit visualisation (the same colours light up the kit).

   A percussion note maps to a General-MIDI drum number via its articulation
   (note.percussionArticulation -> track.percussionArticulations[i].outputMidiNumber,
   or the index itself when no custom articulations are present — alphaTab's
   default GP7 numbering). We bucket that number into a small set of voices.
---------------------------------------------------------------------------- */

export type DrumVoice =
  | 'kick'
  | 'snare'
  | 'hihat'
  | 'hiTom'
  | 'midTom'
  | 'tom'
  | 'ride'
  | 'crash'
  | 'crossStick'
  | 'other';

export type DrumColorMap = Record<DrumVoice, string>;

export interface DrumColorSettings {
  enabled: boolean;
  colors: DrumColorMap;
}

export const DRUM_VOICES: DrumVoice[] = [
  'kick',
  'snare',
  'hihat',
  'hiTom',
  'midTom',
  'tom',
  'ride',
  'crash',
  'crossStick',
  'other',
];

export const DRUM_VOICE_LABELS: Record<DrumVoice, string> = {
  kick: 'Kick',
  snare: 'Snare',
  hihat: 'Hi-hat',
  hiTom: 'Hi Tom',
  midTom: 'Mid Tom',
  tom: 'Floor Tom',
  ride: 'Ride',
  crash: 'Crash / cymbals',
  crossStick: 'Cross-stick / rim',
  other: 'Other percussion',
};

export const DEFAULT_DRUM_COLORS: DrumColorMap = {
  kick: '#e3493a',
  snare: '#f4c20d',
  hihat: '#4f8cff',
  hiTom: '#f472b6',
  midTom: '#a3e635',
  tom: '#46c97e',
  ride: '#a05fd6',
  crash: '#ff8a3d',
  crossStick: '#20c4c4',
  other: '#9aa1b1',
};

export function defaultDrumColorSettings(): DrumColorSettings {
  return { enabled: true, colors: { ...DEFAULT_DRUM_COLORS } };
}

const KEY = 'drumscore.drumColors';

export function loadDrumColors(): DrumColorSettings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultDrumColorSettings();
    const parsed = JSON.parse(raw);
    return {
      enabled: parsed.enabled ?? true,
      colors: { ...DEFAULT_DRUM_COLORS, ...(parsed.colors ?? {}) },
    };
  } catch {
    return defaultDrumColorSettings();
  }
}

export function saveDrumColors(settings: DrumColorSettings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(settings));
  } catch {
    /* ignore */
  }
}

// General-MIDI percussion key -> drum voice. Covers the standard kit; anything
// unmapped falls back to "other".
const MIDI_TO_VOICE: Record<number, DrumVoice> = {
  35: 'kick',
  36: 'kick',
  31: 'crossStick',
  33: 'crossStick',
  37: 'crossStick',
  38: 'snare',
  40: 'snare',
  91: 'snare', // rim shot
  39: 'snare', // hand clap -> treat as snare-ish
  42: 'hihat',
  44: 'hihat',
  46: 'hihat',
  92: 'hihat',
  50: 'hiTom',
  48: 'hiTom',
  47: 'midTom',
  45: 'midTom',
  43: 'tom',
  41: 'tom',
  49: 'crash',
  52: 'crash',
  55: 'crash',
  57: 'crash',
  95: 'crash',
  96: 'crash',
  97: 'crash',
  98: 'crash',
  51: 'ride',
  53: 'ride',
  59: 'ride',
  93: 'ride',
  94: 'ride',
  126: 'ride',
  127: 'ride',
};

export function midiToDrumVoice(midi: number): DrumVoice {
  return MIDI_TO_VOICE[midi] ?? 'other';
}
