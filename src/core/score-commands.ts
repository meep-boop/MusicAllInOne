/* ----------------------------------------------------------------------------
   Score command layer — STAGE 2 STUB.

   This is the *stable interface* through which all notation edits will flow.
   It is defined now (Stage 0/1) so the Stage 2 editor slots straight in without
   touching the render/play pipeline.

   Per the external review (CLAUDE.md §3), the *implementation* is an open
   question to prototype two ways:
     1. Direct mutation of alphaTab's live Score graph + consistency/finish steps
        + api.render()  — fine-grained but fragile (docs warn it can break
        rendering).
     2. Emit alphaTex and re-parse — more robust, at some edit-latency cost.

   Whichever wins, callers depend only on this interface, never on the
   implementation. For now every method throws so accidental Stage-2 usage is
   obvious during development.
---------------------------------------------------------------------------- */

export type Duration = 1 | 2 | 4 | 8 | 16 | 32 | 64;

/** Drum voices we support (mapped to alphaTab percussion articulations later). */
export type DrumHit =
  | 'kick'
  | 'snare'
  | 'hihatClosed'
  | 'hihatOpen'
  | 'hihatPedal'
  | 'crash'
  | 'ride'
  | 'rideBell'
  | 'highTom'
  | 'midTom'
  | 'floorTom'
  | 'crossStick';

export interface ScoreCommands {
  addBeat(barIndex: number, voice: number): void;
  setNoteOnBeat(beatRef: unknown, hit: DrumHit): void;
  removeNote(beatRef: unknown, hit: DrumHit): void;
  setDuration(beatRef: unknown, duration: Duration): void;
  toggleGhost(beatRef: unknown): void;
  toggleAccent(beatRef: unknown): void;
  setTuplet(beatRef: unknown, numerator: number, denominator: number): void;
  setTimeSignature(barIndex: number, numerator: number, denominator: number): void;
}

const NOT_IMPLEMENTED = 'score-commands: editing lands in Stage 2 (not implemented yet)';

/** Placeholder implementation. Replace in Stage 2. */
export class StubScoreCommands implements ScoreCommands {
  addBeat(): void {
    throw new Error(NOT_IMPLEMENTED);
  }
  setNoteOnBeat(): void {
    throw new Error(NOT_IMPLEMENTED);
  }
  removeNote(): void {
    throw new Error(NOT_IMPLEMENTED);
  }
  setDuration(): void {
    throw new Error(NOT_IMPLEMENTED);
  }
  toggleGhost(): void {
    throw new Error(NOT_IMPLEMENTED);
  }
  toggleAccent(): void {
    throw new Error(NOT_IMPLEMENTED);
  }
  setTuplet(): void {
    throw new Error(NOT_IMPLEMENTED);
  }
  setTimeSignature(): void {
    throw new Error(NOT_IMPLEMENTED);
  }
}
