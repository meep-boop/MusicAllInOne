# DrumScore

A free, local drum-learning app. Import a Guitar Pro file (or write your own
notation — coming in Stage 2), then play along at adjustable speed with the rest
of the band synthesised underneath. In the spirit of Songsterr / Melodics, but
free and yours.

Built on [alphaTab](https://www.alphatab.net) (notation + multi-track SoundFont
player) with Vite + TypeScript. See `CLAUDE.md` for the full design and roadmap.

> **Status:** Stage 0 (scaffold) + Stage 1 (play-along) complete.
> Stage 2 (keypress notation editor), Stage 3 (AI sticking/tips via OpenRouter),
> Stage 4 (sound packs) and Stage 5 (mic follow) are next.

---

## Run it

You need [Node.js](https://nodejs.org) (18+).

```bash
npm install      # first time only
npm run dev      # starts the Vite dev server and opens the app
```

Then build / preview a production bundle if you want:

```bash
npm run build
npm run preview
npm run typecheck   # optional: type-check without emitting
```

On first launch you'll see a built-in two-track demo (keys + a drum groove) so
you can immediately try playback. Import your own song to replace it.

---

## What works now (Stage 1)

- **Import** Guitar Pro 3–8, MusicXML and Capella files — drag-and-drop anywhere,
  or the **Import file…** button.
- **Multi-track play-along.** The whole band plays through alphaTab's SoundFont
  synth. The drum track is auto-detected and badged.
- **Mixer** (left panel): per-track **volume**, **mute** and **solo** — solo the
  drums, or pull the guitar down underneath. Click a track **name** to show/hide
  it in the score (display only; audio keeps playing).
- **Transport** (bottom bar): play/pause (or **Space**), stop, **playback-speed**
  slider (25–150%), **metronome**, **count-in**, and **loop**. Click a bar to
  seek; drag across bars to select a loop range.
- **Zoom** and page/horizontal **layout**, plus **print / export to PDF**.
- **Persistence.** Imported songs are saved locally (IndexedDB) and listed in the
  *Saved songs…* dropdown; your last song reloads on return. Transport settings
  persist (localStorage).

### First thing worth doing

Import one of **your real `.gp` drum files** and check the drum notation looks
right. alphaTab's percussion support is its youngest area, so this is the
cheapest important thing to verify early (see `CLAUDE.md` §8).

---

## Project structure

```
src/
  core/
    store.ts            # tiny reactive store (app state)
    score-engine.ts     # the ONE alphaTab wrapper: load, render, play, events
    score-commands.ts   # Stage 2 editing interface (stub for now)
    persistence.ts      # IndexedDB (songs) + localStorage (settings)
  ai/
    key-store.ts        # isolated OpenRouter key access (Stage 3 stub)
  input/
    keybinds.ts         # default, remappable drum keybinds (Stage 2)
  ui/
    transport.ts        # transport bar
    track-list.ts       # track list + mixer
  data/
    demo.ts             # bundled first-run alphaTex demo
  main.ts               # wires it all together
  styles.css
vite.config.ts          # registers the official @coderline/alphatab-vite plugin
```

The architectural rule (see `CLAUDE.md` §3): **alphaTab's `Score` is the single
source of truth**, and everything flows through one pipeline — load/create →
render → MIDI → play → overlays. Stage 1 fills the Score by importing; Stage 2
will fill the *same* Score via keypresses, so the editor can't break play-along.

---

## Troubleshooting

- **No sound / cursor doesn't move:** make sure you started via `npm run dev`
  (not by opening `index.html` directly). The alphaTab Vite plugin must serve the
  font and SoundFont, and audio needs the dev server.
- **First play is silent for a second:** the SoundFont (~several MB) is loading;
  the transport shows "Loading sounds …%". Play is disabled until it's ready.
- **A file won't import:** confirm it's a real Guitar Pro / MusicXML / Capella
  file. A toast will appear if alphaTab can't recognise the format.
