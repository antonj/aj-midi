import {
  isBlack,
  isWhite,
  midiToNote,
  numNotesInOctave,
  numWhiteInOctate,
  toMidiTone,
  whiteIndexInOctave,
} from "../util/music";
import {
  blackWidthRatio,
  mapRound,
  miniMapWidthRatio,
  pixelRound,
  xCenterInPiano,
} from "./track-draw";
import type { Note } from "./use-song-sounds";
import type { MidiEngine } from "./midi-valtio";

function drawWhite(ctx: CanvasRenderingContext2D) {}

export function trackDrawKeyabord(
  ctx: CanvasRenderingContext2D,
  tick: number,
  songExt: MidiEngine,
  pressed: Map<number, Note>
) {
  let { width: w, height: h } = ctx.canvas;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, w, h);

  const { octaves } = songExt.octaves;

  const minMidi = toMidiTone(octaves[0], 0);
  const maxMidi = toMidiTone(octaves[octaves.length - 1], numNotesInOctave - 1);
  const numWhites = octaves.length * numWhiteInOctate;

  const whiteWidthPx = w / numWhites;
  const blackWidthPx = blackWidthRatio * whiteWidthPx;

  // draw bg whites
  for (let i = 0; i < octaves.length; i++) {
    const o = octaves[i];
    if (i % 2 == 0) {
      ctx.fillStyle = "rgba(150, 140, 100, 0.2)";
    } else {
      ctx.fillStyle = "rgba(150, 140, 100, 0.05)";
    }
    const octaveWidth = whiteWidthPx * 7;
    ctx.fillRect(pixelRound(i * octaveWidth), 0, octaveWidth, h);
    ctx.lineWidth = 1;
    for (let k = 0; k < 12; k++) {
      const wI = whiteIndexInOctave(k);
      if (wI % 1 === 0) {
        const left = pixelRound(i * octaveWidth + whiteWidthPx * wI);
        const midi = toMidiTone(o, k);
        if (songExt.pressed.has(midi)) {
          ctx.fillStyle = "gold";
          ctx.fillRect(left, 0, whiteWidthPx, h);
        }
        ctx.strokeRect(left, 0, whiteWidthPx, h);
        const n = midiToNote(midi);
        ctx.strokeText(n + "-" + midi, left, h / 2, whiteWidthPx);
      }
    }
  }
  // draw bg blacks
  for (let midi = minMidi; midi <= maxMidi; midi++) {
    const note = midiToNote(midi);
    if (isWhite(note)) {
      continue;
    }
    let x = xCenterInPiano(midi, octaves, 0, w, whiteWidthPx);
    x = x - blackWidthPx / 2;
    if (songExt.pressed.has(midi)) {
      ctx.fillStyle = "gold";
    } else {
      ctx.fillStyle = "rgba(40, 20, 30)";
    }
    ctx.fillRect(pixelRound(x), 0, blackWidthPx, (h * 2) / 3);
    ctx.lineWidth = 1;
    ctx.strokeStyle = "black";
    ctx.strokeRect(pixelRound(x), 0, blackWidthPx, (h * 2) / 3);
  }
  ctx.fillStyle = "gold";
  ctx.fillRect(0, 0, w, 4);
}
