import { useEffect, useRef, useState } from "react";
import { AjScroller } from "../util/aj-scroller";
import { map } from "../util/map";
import {
  isBlack,
  isWhite,
  midiToNote,
  midiToOctave,
  numNotesInOctave,
  numWhiteInOctate,
  toMidiTone,
  whiteIndexInOctave,
} from "../util/music";
import { Scroller } from "../util/scroller";
import { useBoundingClientRect } from "./use-bounding-client-rect";
import { useGestureDetector } from "./use-gesture-detector";
import { useSongCtx } from "./context-song";
import { useToneDetector } from "./use-tone-detector";
import { useSettings } from "./context-settings";
import { SongSettingsExtended, useSongTicker } from "./use-song-ticker";

const miniMapWidthRatio = 0.1;
const blackWidthRatio = 0.6;

function pixelRound(x: number) {
  return Math.floor(x);
}
function mapRound(
  n: number,
  start1: number,
  stop1: number,
  start2: number,
  stop2: number,
  withinBounds = false
) {
  return pixelRound(map(n, start1, stop1, start2, stop2, withinBounds));
}

export function Track() {
  const { song } = useSongCtx();
  const [canvasEl, setCanvasEl] = useState<HTMLCanvasElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  canvasRef.current = canvasEl;
  const [{ width, height }, wrapperRef] =
    useBoundingClientRect<HTMLDivElement>();
  const detect = useSettings((s) => s.detect);
  const tickWindow = useSettings((s) => s.tickWindow);
  const setStart = useSettings((s) => s.setStart);

  const tones = useToneDetector(detect);
  const sDetected = new Set(tones);
  const tickToneRef = useRef(new Map<number, Set<number>>());
  const tickRef = useRef(0);
  const scrollerRef = useRef(Scroller());

  useSongTicker(function trackTicker(tick, songCtx) {
    const ctx = canvasRef.current?.getContext("2d", { alpha: false });
    if (!ctx) {
      return;
    }

    tickRef.current = tick;
    tickToneRef.current.set(tick, sDetected);
    draw(ctx, tick, songCtx, tickToneRef.current);
  });

  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) {
      return;
    }
    const dpr = window.devicePixelRatio || 1;
    ctx.canvas.height = height * dpr;
    ctx.canvas.width = width * dpr;
  }, [width, height]);

  useGestureDetector(canvasEl, (ev) => {
    scrollerRef.current.forceFinished(true);
    let x = map(ev.data.x, 0, ev.data.width, 0, 1);
    switch (ev.kind) {
      case "down":
        ev.data.event.preventDefault();
        if (x < miniMapWidthRatio) {
          let y = map(ev.data.y, 0, ev.data.height, 0, 1);
          let yy = map(y, 1, 0, 0, song.durationTicks, true);
          setStart(yy);
        }
        break;
      case "drag":
        ev.data.event.preventDefault();
        //let x = map(ev.data.x, 0, ev.data.width, 0, 1);
        if (x < miniMapWidthRatio) {
          let y = map(ev.data.y, 0, ev.data.height, 0, 1);
          let yy = map(y, 1, 0, 0, song.durationTicks, true);
          setStart(yy);
        } else {
          let dt = map(ev.data.dy, 0, height, 0, tickWindow);
          setStart(tickRef.current + dt);
        }
        break;
      case "fling":
        {
          let prevY = 0;
          const simpleScroller = false;
          if (!simpleScroller) {
            console.log("fling", ev.data.vy * 1000);
            scrollerRef.current.fling(0, prevY, 0, ev.data.vy * 1000);
            console.log("fling final", scrollerRef.current.getFinalY());
            function anim() {
              const scrolling = scrollerRef.current.computeScrollOffset();
              console.log("fling first offset", scrollerRef.current.getCurrY());
              if (scrolling) {
                const y = scrollerRef.current.getCurrY();
                let dy = y - prevY;
                prevY = y;
                let dt = map(dy, 0, height, 0, tickWindow);

                const start = tickRef.current + dt;
                setStart(start);
                requestAnimationFrame(anim);
              }
            }
            requestAnimationFrame(anim);
          } else {
            const ajScroller = new AjScroller();
            console.log("fling", ev.data.vy);
            ajScroller.fling(ev.data.vy);
            console.log("fling final", ajScroller.yFinal);
            function anim() {
              const info = ajScroller.computeOffset();
              console.log("fling first offset", info.y);
              if (!info.done) {
                const y = info.y;
                let dy = y - prevY;
                prevY = y;
                let dt = map(dy, 0, height, 0, tickWindow);
                const start = tickRef.current + dt;
                setStart(start);
                requestAnimationFrame(anim);
              }
            }
            requestAnimationFrame(anim);
          }
        }
        break;
    }
  });

  return (
    <div className="w-full h-full touch-none" ref={wrapperRef}>
      <canvas
        className="w-full h-full touch-none select-none"
        ref={setCanvasEl}
      />
    </div>
  );
}

function xCenterInPiano(
  midi: number,
  octaves: Array<number>,
  minX: number,
  maxX: number,
  whiteWidth: number
) {
  const oct = midiToOctave(midi);
  const whiteIndex =
    (oct.octave - octaves[0]) * numWhiteInOctate + // white to left of octave
    whiteIndexInOctave(oct.index); // white index in octave
  const minWhite = 0;
  const maxWhite = octaves.length * numWhiteInOctate;
  let x = map(whiteIndex, minWhite, maxWhite, minX, maxX); // midi tone
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

function draw(
  ctx: CanvasRenderingContext2D,
  tick: number,
  songExt: SongSettingsExtended,
  pressed: Map<number, Set<number>>
) {
  const { width: w, height: h } = ctx.canvas;
  ctx.clearRect(0, 0, w, h);
  const { octaves } = songExt.songCtx.octaves;

  // | |x| | |x| |  |  |
  // | 2-- | 5-- |  |  |
  // |  |  |  |  |  |  |
  // 1- 3- 4- 6- 7- 8-

  // white left = index
  // white left = index + w
  // black left = index - w/2
  // black right = index + w/2

  const minMidi = toMidiTone(octaves[0], 0);
  const maxMidi = toMidiTone(octaves[octaves.length - 1], numNotesInOctave - 1);
  const numWhites = octaves.length * numWhiteInOctate;

  const tickWindow = songExt.tickWindow; // ticks shown in height
  const minTick = songExt.detect ? tick - tickWindow / 2 : tick; // - tickWindow / 4;
  const maxTick = tick + tickWindow;
  const whiteWidthPx = pixelRound(w / numWhites);
  const blackWidthPx = pixelRound(blackWidthRatio * whiteWidthPx);

  ctx.font = "18px helvetica";

  // background
  {
    // draw bg whites
    for (let midi = minMidi; midi <= maxMidi; midi++) {
      const note = midiToNote(midi);
      if (isBlack(note)) {
        continue;
      }

      let x = xCenterInPiano(midi, octaves, 0, w, whiteWidthPx);
      x = x - whiteWidthPx / 2;

      const oct = midiToOctave(midi);
      if (oct.octave % 2 == 0) {
        ctx.fillStyle = "rgba(150, 140, 100, 0.3)";
      } else {
        ctx.fillStyle = "rgba(150, 140, 100, 0.5)";
      }
      ctx.fillRect(pixelRound(x), 0, whiteWidthPx, h);
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
        case "c": {
          ctx.lineWidth = 2;
          ctx.strokeStyle = "rgba(0, 0, 0, 0.08)";
          x = x - whiteWidthPx / 2;
          break;
        }
        case "f": {
          ctx.lineWidth = 1;
          ctx.strokeStyle = "rgba(0, 0, 0, 0.08)";
          x = x - whiteWidthPx / 2;
          break;
        }
        default:
          continue;
      }
      x = pixelRound(x);
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.closePath();
      ctx.stroke();
    }

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
  }

  const miniLeftPx = 0;
  const miniRightPx = pixelRound(miniLeftPx + w * miniMapWidthRatio);
  const miniWidthPx = miniRightPx - miniLeftPx;
  const whiteWidthMini = miniWidthPx / numWhites;
  const blackWidthMini = blackWidthRatio * whiteWidthMini;
  const minTickMiniPx = 0;
  const maxTickMiniPx = songExt.songCtx.song.durationTicks;

  // minimap
  if (true) {
    // overlay non repeating parts of song
    if (songExt.repeatBars > 0) {
      //const startBar = roundTo(songCtx.tickStart, songCtx.ticksPerBar);
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

    // draw minimap
    // bars
    for (
      let barTick = 0;
      barTick < maxTickMiniPx;
      barTick = barTick + songExt.songCtx.ticksPerBar
    ) {
      ctx.lineWidth = 2;
      ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
      const y = mapRound(barTick, minTickMiniPx, maxTickMiniPx, h, 0);
      ctx.fillRect(miniLeftPx, y, miniWidthPx, 1);
    }

    // fill repeat bars
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

    // draw notes
    for (const n of songExt.songCtx.pianoNotes) {
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

    // draw progress line
    ctx.fillStyle = "gold";
    let y = mapRound(tick, minTickMiniPx, maxTickMiniPx, h, 0);
    ctx.fillRect(miniLeftPx, y - 1, miniWidthPx, 2);
  }

  // draw notes
  for (const n of songExt.songCtx.pianoNotes) {
    /* let noteWidth;
     * let x = xCenterInPiano(n.midi, octaves, 0, w, whiteWidthPx); */
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
  for (const [_, notes] of songExt.songCtx.tickConnections) {
    for (let i = 0; i < notes.length - 1; i++) {
      const t1 = notes[i];
      const t2 = notes[i + 1];
      const y1 = mapRound(t1.ticks, minTick, maxTick, h, 0); // ticks // flip y axis
      const y2 = mapRound(t2.ticks, minTick, maxTick, h, 0); // ticks // flip y axis
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

  // draw current tick line
  ctx.fillStyle = "gold";
  ctx.fillRect(miniWidthPx, mapRound(tick, minTick, maxTick, h, 0), w, 4);

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
