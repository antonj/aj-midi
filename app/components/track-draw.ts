import { map } from "../util/map";
import {
  isBlack,
  isWhite,
  midiToNote,
  midiToOctave,
  numWhiteInOctate,
  whiteIndexInOctave,
} from "../util/music";

import { SongSettingsExtended } from "./use-song-ticker";

export const miniMapWidthRatio = 0.1;
export const blackWidthRatio = 0.6;

export function pixelRound(x: number) {
  return Math.floor(x);
}
export function mapRound(
  n: number,
  start1: number,
  stop1: number,
  start2: number,
  stop2: number,
  withinBounds = false
) {
  return pixelRound(map(n, start1, stop1, start2, stop2, withinBounds));
}

export function xCenterInPiano(
  midi: number,
  octaves: Array<number>,
  minXpx: number,
  maxXpx: number,
  whiteWidth: number
) {
  // | |x| | |x| |  |  |
  // | 2-- | 5-- |  |  |
  // |  |  |  |  |  |  |
  // 1- 3- 4- 6- 7- 8-

  // white left = index
  // white left = index + w
  // black left = index - w/2
  // black right = index + w/2
  const oct = midiToOctave(midi);
  const whiteIndex =
    (oct.octave - octaves[0]) * numWhiteInOctate + // white to left of octave
    whiteIndexInOctave(oct.index); // white index in octave
  const minWhite = 0;
  const maxWhite = octaves.length * numWhiteInOctate;
  let x = map(whiteIndex, minWhite, maxWhite, minXpx, maxXpx); // midi tone
  const note = midiToNote(midi);
  if (isWhite(note)) {
    x = x + whiteWidth / 2;
  }
  return x;
}

function leftAndWidth(
  midi: number,
  octaves: Array<number>,
  minX: number,
  maxX: number,
  whiteWidthPx: number,
  blackWidthPx: number
): [x: number, width: number] {
  let x = xCenterInPiano(midi, octaves, minX, maxX, whiteWidthPx);
  let noteWidth: number;
  const note = midiToNote(midi);
  // blacks are always on top and will have same height and left
  if (isBlack(note)) {
    noteWidth = blackWidthPx;
    x = x - noteWidth / 2;
    return [x, noteWidth];
  }
  // white
  if ("sameWidth" in window) {
    // same width all the time
    noteWidth = whiteWidthPx;
    x = x - whiteWidthPx / 2;
  } else {
    switch (note) {
      case "c":
      case "f":
        {
          noteWidth = whiteWidthPx - blackWidthPx / 2;
          x = x - whiteWidthPx / 2;
        }
        break;
      case "e":
      case "h":
        {
          noteWidth = whiteWidthPx - blackWidthPx / 2;
          x = x - whiteWidthPx / 2 + blackWidthPx / 2;
        }
        break;
      default: {
        noteWidth = whiteWidthPx - blackWidthPx;
        x = x - noteWidth / 2;
      }
    }
  }
  return [x, noteWidth];
}

export function trackDraw(
  ctx: CanvasRenderingContext2D,
  tick: number,
  songExt: SongSettingsExtended,
  pressed: Map<number, Set<number>>
) {
  const { width: w, height: h } = ctx.canvas;
  ctx.clearRect(0, 0, w, h);
  const { octaves } = songExt.songCtx.octaves;

  const numWhites = octaves.length * numWhiteInOctate;

  const tickWindow = songExt.tickWindow; // ticks shown in height
  const minTick = songExt.detect ? tick - tickWindow / 2 : tick; // - tickWindow / 4;
  const maxTick = tick + tickWindow;
  const whiteWidthPx = w / numWhites;
  const blackWidthPx = blackWidthRatio * whiteWidthPx;

  ctx.font = "18px helvetica";

  // bar lines
  for (
    let barTick = 0;
    barTick < maxTick;
    barTick = barTick + songExt.songCtx.ticksPerBar
  ) {
    if (barTick < minTick) {
      continue;
    }
    if (barTick > maxTick) {
      break;
    }

    ctx.lineWidth = 2;
    ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    // at bar
    let y = mapRound(barTick, minTick, maxTick, h, 0);
    ctx.fillRect(-1, y, w, 2);
    // half bar previous
    ctx.fillStyle = "rgba(0, 0, 0, 0.1)";
    y = mapRound(
      barTick - songExt.songCtx.ticksPerBar / 2,
      minTick,
      maxTick,
      h,
      0
    );

    ctx.fillRect(-1, y, w, 2);
    // half bar next
    ctx.fillStyle = "rgba(0, 0, 0, 0.1)";
    y = mapRound(
      barTick + songExt.songCtx.ticksPerBar / 2,
      minTick,
      maxTick,
      h,
      0
    );
    ctx.fillRect(-1, y, w, 2);
  }

  // draw moving mini stuff
  {
    const miniLeftPx = 0;
    const miniRightPx = pixelRound(miniLeftPx + w * miniMapWidthRatio);
    const miniWidthPx = miniRightPx - miniLeftPx;
    const minTickMiniPx = 0;
    const maxTickMiniPx = songExt.songCtx.song.durationTicks;

    // current tick line
    ctx.fillStyle = "gold";
    let y = mapRound(tick, minTickMiniPx, maxTickMiniPx, h, 0);
    ctx.fillRect(miniLeftPx, y - 1, miniWidthPx, 2);

    // fill repeat bars in mini bg
    if (songExt.repeatBars > 0) {
      const top = mapRound(songExt.tickEnd, minTickMiniPx, maxTickMiniPx, h, 0);
      const bottom = mapRound(
        songExt.tickRepeatStart,
        minTickMiniPx,
        maxTickMiniPx,
        h,
        0
      );
      ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
      ctx.fillRect(miniLeftPx, 0, miniWidthPx, top);
      ctx.fillRect(miniLeftPx, bottom, miniWidthPx, h);
    }
    // fill repeat bars in regular bg
    if (songExt.repeatBars > 0) {
      const top = mapRound(songExt.tickEnd, minTick, maxTick, h, 0, true);
      const bottom = mapRound(
        songExt.tickRepeatStart,
        minTick,
        maxTick,
        h,
        0,
        true
      );

      ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
      ctx.fillRect(miniRightPx, 0, w, top);
      ctx.fillRect(miniRightPx, bottom, w, h);
    }
  }

  // draw notes
  for (const n of songExt.songCtx.pianoNotes) {
    const yTop = mapRound(n.ticks + n.durationTicks, minTick, maxTick, h, 0);
    const yBottom = mapRound(n.ticks, minTick, maxTick, h, 0);
    let [x, noteWidth] = leftAndWidth(
      n.midi,
      octaves,
      0,
      w,
      whiteWidthPx,
      blackWidthPx
    );
    if (yTop > h || yBottom < 0) {
      // out of bounds
      continue;
    }

    const note = midiToNote(n.midi);
    ctx.fillStyle = isBlack(note) ? "black" : "white";
    ctx.strokeStyle = "rgba(0,0,0, 1)";
    ctx.lineWidth = 1;

    const isOn = tick >= n.ticks && tick <= n.ticks + n.durationTicks;
    if (isOn) {
      ctx.fillStyle = "gold";
    }
    const noteHeight = Math.abs(yTop - yBottom);
    x = pixelRound(x);
    ctx.fillRect(x, yTop, noteWidth, noteHeight);
    ctx.strokeRect(x, yTop, noteWidth, noteHeight);

    // midi text
    // ctx.fillText("" + n.midi, x, y, 100);
  }

  // draw connections
  ctx.strokeStyle = "red";
  ctx.lineWidth = 1;
  for (const [, notes] of songExt.songCtx.tickConnections) {
    for (let i = 0; i < notes.length - 1; i++) {
      const t1 = notes[i];
      const t2 = notes[i + 1];
      const y1 = mapRound(t1.ticks, minTick, maxTick, h, 0); // ticks // flip y axis
      const y2 = mapRound(t2.ticks, minTick, maxTick, h, 0); // ticks // flip y axis
      if (y1 < 0 || y1 > h || y2 < 0 || y2 > h) {
        // out of bounds
        continue;
      }
      let [x1, w1] = leftAndWidth(
        t1.midi,
        octaves,
        0,
        w,
        whiteWidthPx,
        blackWidthPx
      );
      let [x2] = leftAndWidth(
        t2.midi,
        octaves,
        0,
        w,
        whiteWidthPx,
        blackWidthPx
      );

      ctx.beginPath();
      ctx.moveTo(pixelRound(x1 + w1), y1);
      ctx.lineTo(pixelRound(x2), y2);
      ctx.closePath();
      ctx.stroke();
    }
  }

  for (const [t, ns] of pressed) {
    const noteHeight = h / tickWindow;
    for (const n of ns) {
      const note = midiToNote(n);
      let x = xCenterInPiano(n, octaves, 0, w, whiteWidthPx);
      const y = mapRound(t, minTick, maxTick, h, 0);
      let noteWidth;
      if (isBlack(note)) {
        ctx.fillStyle = "blue";
        noteWidth = blackWidthPx;
        x = x - noteWidth / 2;
      } else {
        ctx.fillStyle = "green";
        noteWidth = whiteWidthPx;
        x = x - whiteWidthPx / 2;
      }
      ctx.fillRect(pixelRound(x), y, noteWidth, noteHeight);
    }
  }
}
