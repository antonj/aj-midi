import {
  isBlack,
  isWhite,
  midiToNote,
  noteInKeySignature,
  numNotesInOctave,
  numWhiteInOctate,
  toMidiTone,
  whiteIndexInOctave,
} from "../util/music";
import { blackWidthRatio, pixelRound, xCenterInPiano } from "./track-draw";
import type { Note } from "./use-song-sounds";
import type { MidiEngine } from "./midi-valtio";
import { drawNote } from "./track-draw-sheet";

function getFill(active: boolean, down: boolean) {
  switch (true) {
    case active && down:
      return "green";
    case active:
      return "gold";
    case down:
      return "red";
  }
  return "";
}

export function trackDrawKeyabord(
  ctx: CanvasRenderingContext2D,
  tick: number,
  songExt: MidiEngine,
  deviceDown: Map<number, Note>
) {
  let { width: w, height: h } = ctx.canvas;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, w, h);

  const { octaves } = songExt.octaves;
  const ks = songExt.keySignature;

  const minMidi = toMidiTone(octaves[0], 0);
  const maxMidi = toMidiTone(octaves[octaves.length - 1], numNotesInOctave - 1);
  const numWhites = octaves.length * numWhiteInOctate;

  const whiteWidthPx = w / numWhites;
  const blackWidthPx = blackWidthRatio * whiteWidthPx;

  const blackHeightRatio = 3 / 6;

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
        let fill = getFill(songExt.pressed.has(midi), deviceDown.has(midi));
        if (fill) {
          ctx.fillStyle = fill;
          ctx.fillRect(left, 0, whiteWidthPx, h);
        }
        ctx.strokeRect(left, 0, whiteWidthPx, h);
        // const n = midiToNote(midi);
        // ctx.strokeText(n + "-" + midi, left, h / 2, whiteWidthPx);
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
    let fill = getFill(songExt.pressed.has(midi), deviceDown.has(midi));
    ctx.fillStyle = fill ? fill : "rgba(40, 20, 30)";
    ctx.fillRect(pixelRound(x), 0, blackWidthPx, h * blackHeightRatio);
    ctx.lineWidth = 1;
    ctx.strokeStyle = "black";
    ctx.strokeRect(pixelRound(x), 0, blackWidthPx, h * blackHeightRatio);
  }

  // draw sheet notes
  for (let midi = minMidi; midi <= maxMidi; midi++) {
    const note = midiToNote(midi);
    if (!noteInKeySignature(note, ks)) continue;
    let left = xCenterInPiano(midi, octaves, 0, w, whiteWidthPx);
    let width = whiteWidthPx;
    let height = h - h * blackHeightRatio;
    const black = isBlack(note);
    if (black) {
      left = left - blackWidthPx / 2;
      width = blackWidthPx;
      height = h * blackHeightRatio;
    } else {
      left = left - whiteWidthPx / 2;
    }

    ctx.save();
    ctx.translate(left, black ? 0 : h * blackHeightRatio);

    drawNote(ctx, midi, {
      ks,
      theme: black ? "dark" : "light",
      midiMin: minMidi,
      midiMax: maxMidi,
      height,
      width,
    });
    ctx.restore();
  }

  // top line
  ctx.fillStyle = "gold";
  ctx.fillRect(0, 0, w, 4);
}
