import {
  isBlack,
  isWhite,
  midiToNote,
  numNotesInOctave,
  numWhiteInOctate,
  toMidiTone,
} from "../util/music";
import { MidiEngine } from "./midi-valtio";
import {
  blackWidthRatio,
  mapRound,
  miniMapWidthRatio,
  pixelRound,
  xCenterInPiano,
} from "./track-draw";

export function trackDrawBg(
  ctx: CanvasRenderingContext2D,
  songExt: MidiEngine
) {
  const { width: w, height: h } = ctx.canvas;
  ctx.clearRect(0, 0, w, h);
  // draw white big bg
  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, w, h);

  const { octaves } = songExt.octaves;

  const minMidi = toMidiTone(octaves[0], 0);
  const maxMidi = toMidiTone(octaves[octaves.length - 1], numNotesInOctave - 1);
  const numWhites = octaves.length * numWhiteInOctate;

  const whiteWidthPx = w / numWhites;
  const blackWidthPx = blackWidthRatio * whiteWidthPx;

  // bg
  {
    // draw bg whites
    for (let i = 0; i < octaves.length; i++) {
      if (i % 2 == 0) {
        ctx.fillStyle = "rgba(150, 140, 100, 0.5)";
      } else {
        ctx.fillStyle = "rgba(150, 140, 100, 0.3)";
      }
      const octaveWidth = whiteWidthPx * 7;
      ctx.fillRect(pixelRound(i * octaveWidth), 0, octaveWidth, h);
    }
    // draw bg blacks
    for (let midi = minMidi; midi <= maxMidi; midi++) {
      const note = midiToNote(midi);
      if (isWhite(note)) {
        continue;
      }
      let x = xCenterInPiano(midi, octaves, 0, w, whiteWidthPx);
      x = x - blackWidthPx / 2;
      ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
      ctx.fillRect(pixelRound(x), 0, blackWidthPx, h);
    }

    // lines
    for (let midi = minMidi; midi <= maxMidi; midi++) {
      const note = midiToNote(midi);
      let x = xCenterInPiano(midi, octaves, 0, w, whiteWidthPx);
      switch (note) {
        case "F": {
          ctx.lineWidth = 1;
          ctx.strokeStyle = "rgba(0, 0, 0, 0.08)";
          x = x - whiteWidthPx / 2;
          break;
        }
        default: {
          continue;
        }
      }
      x = pixelRound(x);
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.closePath();
      ctx.stroke();
    }
  }

  const miniLeftPx = 0;
  const miniRightPx = pixelRound(miniLeftPx + w * miniMapWidthRatio);
  const miniWidthPx = miniRightPx - miniLeftPx;
  const whiteWidthMini = miniWidthPx / numWhites;
  const blackWidthMini = blackWidthRatio * whiteWidthMini;
  const minTickMiniPx = 0;
  const maxTickMiniPx = songExt.song.durationTicks;

  // minimap
  if (true) {
    // draw minimap
    // bars
    for (
      let barTick = 0;
      barTick < maxTickMiniPx;
      barTick = barTick + songExt.ticksPerBar
    ) {
      ctx.lineWidth = 2;
      ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
      const y = mapRound(barTick, minTickMiniPx, maxTickMiniPx, h, 0);
      ctx.fillRect(miniLeftPx, y, miniWidthPx, 1);
    }

    // draw notes
    for (const n of songExt.pianoNotes) {
      const note = midiToNote(n.midi);
      const noteHeight = h / (maxTickMiniPx / n.durationTicks);
      let x = xCenterInPiano(
        n.midi,
        octaves,
        miniLeftPx,
        miniRightPx,
        whiteWidthMini
      );
      const y =
        mapRound(n.ticks, minTickMiniPx, maxTickMiniPx, h, 0) - noteHeight; // ticks // flip y axis
      let noteWidth;

      if (isBlack(note)) {
        ctx.fillStyle = "black";
        noteWidth = blackWidthMini;
        x = x - noteWidth / 2;
      } else {
        ctx.fillStyle = "white";
        noteWidth = whiteWidthMini;
        x = x - whiteWidthMini / 2;
      }
      ctx.fillRect(pixelRound(x), y, noteWidth, noteHeight);
    }
  }
}
