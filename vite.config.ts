import { defineConfig } from 'vite';
// The official alphaTab Vite plugin. THIS IS LOAD-BEARING:
// it copies the Bravura music font to /font/ and the SoundFont to /soundfont/,
// and wires up alphaTab's Web Worker + Audio Worklet entry points.
// Without it, rendering and/or audio playback silently break.
import { alphaTab } from '@coderline/alphatab-vite';

export default defineConfig({
  plugins: [alphaTab()],
  server: {
    open: true,
  },
});
