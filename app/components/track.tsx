import { Midi } from "@tonejs/midi";
import { PointerEventHandler, useCallback, useEffect, useRef } from "react";
import { map, roundTo } from "../util/map";
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
import { useBoundingClientRect } from "./use-bounding-client-rect";
import {
  SongSettingsExtended,
  useSettings,
  useSongTicker,
} from "./use-song-context";
import { useToneDetector } from "./use-tone-detector";

const miniMapWidthRatio = 0.1;
const blackWidthRatio = 0.6;

export function Track({ song }: { song: Midi }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [{ width, height }, wrapperRef] =
    useBoundingClientRect<HTMLDivElement>();
  const settings = useSettings();

  const tones = useToneDetector(settings.detect, song);
  const sDetected = new Set(tones);
  const tickToneRef = useRef(new Map<number, Set<number>>());

  useSongTicker(song, (tick, songCtx) => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) {
      return;
    }
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
    ctx.canvas.style.width = width + "px";
    ctx.canvas.style.height = height + "px";
  }, [width, height]);

  const dragRef = useRef(false);

  const seek: PointerEventHandler<HTMLCanvasElement> = useCallback(
    (ev) => {
      let rect = ev.currentTarget.getBoundingClientRect();
      let y = map(ev.clientY, rect.top, rect.bottom, 0, 1);
      let yy = map(y, 1, 0, 0, song.durationTicks);
      settings.setStart(yy);
    },
    [settings, song.durationTicks]
  );

  const down: PointerEventHandler<HTMLCanvasElement> = useCallback(
    (ev) => {
      let rect = ev.currentTarget.getBoundingClientRect();
      let x = map(ev.clientX, rect.left, rect.right, 0, 1);
      if (x > miniMapWidthRatio) {
        return;
      }
      dragRef.current = true;
      ev.currentTarget.setPointerCapture(ev.pointerId);
      seek(ev);
    },
    [seek]
  );
  const up: PointerEventHandler<HTMLCanvasElement> = useCallback((ev) => {
    ev.currentTarget.releasePointerCapture(ev.pointerId);
    dragRef.current = false;
  }, []);
  const move: PointerEventHandler<HTMLCanvasElement> = useCallback(
    (ev) => {
      if (dragRef.current) {
        seek(ev);
      }
    },
    [seek]
  );

  return (
    <div className="w-full h-full" ref={wrapperRef}>
      <canvas
        ref={canvasRef}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
      />
    </div>
  );
}

function xInPiano(
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

function draw(
  ctx: CanvasRenderingContext2D,
  tick: number,
  songCtx: SongSettingsExtended,
  pressed: Map<number, Set<number>>
) {
  const canvas = ctx.canvas;
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  const octaves = songCtx.octaves;

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

  const tickWindow = songCtx.tickWindow; // ticks shown in height
  const minTick = songCtx.detect ? tick - tickWindow / 2 : tick;
  const maxTick = tick + tickWindow;
  const whiteWidthPx = w / numWhites;
  const blackWidthPx = blackWidthRatio * whiteWidthPx;

  ctx.font = "18px helvetica";

  // draw bg whites
  for (let midi = minMidi; midi <= maxMidi; midi++) {
    const note = midiToNote(midi);
    if (isBlack(note)) {
      continue;
    }

    let x = xInPiano(midi, octaves, 0, w, whiteWidthPx);
    x = x - whiteWidthPx / 2;

    const oct = midiToOctave(midi);
    if (oct.octave % 2 == 0) {
      ctx.fillStyle = "rgba(150, 140, 100, 0.15)";
    } else {
      ctx.fillStyle = "rgba(150, 140, 100, 0.3)";
    }
    ctx.fillRect(x, 0, whiteWidthPx, h);
  }
  // draw bg blacks
  for (let midi = minMidi; midi <= maxMidi; midi++) {
    const note = midiToNote(midi);
    if (isWhite(note)) {
      continue;
    }
    let x = xInPiano(midi, octaves, 0, w, whiteWidthPx);
    x = x - blackWidthPx / 2;
    ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
    ctx.fillRect(x, 0, blackWidthPx, h);
  }

  // lines
  for (let midi = minMidi; midi <= maxMidi; midi++) {
    const note = midiToNote(midi);
    let x = xInPiano(midi, octaves, 0, w, whiteWidthPx);
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
    barTick = barTick + songCtx.ticksPerBar
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
    let y = map(barTick, minTick, maxTick, h, 0);
    ctx.fillRect(-1, y, w, 2);
    // half bar previous
    ctx.fillStyle = "rgba(0, 0, 0, 0.1)";
    y = map(barTick - songCtx.ticksPerBar / 2, minTick, maxTick, h, 0);
    ctx.fillRect(-1, y, w, 2);
    // half bar next
    ctx.fillStyle = "rgba(0, 0, 0, 0.1)";
    y = map(barTick + songCtx.ticksPerBar / 2, minTick, maxTick, h, 0);
    ctx.fillRect(-1, y, w, 2);
  }

  const miniLeftPx = 0;
  const miniRightPx = miniLeftPx + w * miniMapWidthRatio;
  const miniWidthPx = miniRightPx - miniLeftPx;
  const whiteWidthMini = miniWidthPx / numWhites;
  const blackWidthMini = blackWidthRatio * whiteWidthMini;
  const minTickMiniPx = 0;
  const maxTickMiniPx = songCtx.song.durationTicks;

  if (songCtx.repeatBars > 0) {
    const startBar = roundTo(songCtx.tickStart, songCtx.ticksPerBar);
    const top = map(songCtx.tickEnd, minTick, maxTick, h, 0);
    const bottom = map(startBar, minTick, maxTick, h, 0);
    ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
    ctx.fillRect(miniRightPx, 0, w, top);
    ctx.fillRect(miniRightPx, bottom, w, h);
  }

  // draw minimap
  {
    // bars
    for (
      let barTick = 0;
      barTick < maxTickMiniPx;
      barTick = barTick + songCtx.ticksPerBar
    ) {
      ctx.lineWidth = 2;
      ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
      const y = map(barTick, minTickMiniPx, maxTickMiniPx, h, 0);
      ctx.fillRect(miniLeftPx, y, miniWidthPx, 1);
    }

    // fill repeat bars
    if (songCtx.repeatBars > 0) {
      const startBar = roundTo(songCtx.tickStart, songCtx.ticksPerBar);
      const top = map(songCtx.tickEnd, minTickMiniPx, maxTickMiniPx, h, 0);
      const bottom = map(startBar, minTickMiniPx, maxTickMiniPx, h, 0);
      ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
      ctx.fillRect(miniLeftPx, 0, miniWidthPx, top);
      ctx.fillRect(miniLeftPx, bottom, miniWidthPx, h);
    }

    // draw notes
    for (const n of songCtx.song.tracks[0].notes) {
      const note = midiToNote(n.midi);
      const noteHeight = h / (maxTickMiniPx / n.durationTicks);
      let x = xInPiano(
        n.midi,
        octaves,
        miniLeftPx,
        miniRightPx,
        whiteWidthMini
      );
      const y = map(n.ticks, minTickMiniPx, maxTickMiniPx, h, 0) - noteHeight; // ticks // flip y axis
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
      ctx.fillRect(x, y, noteWidth, noteHeight);
    }

    // draw progress line
    ctx.fillStyle = "gold";
    let y = map(tick, minTickMiniPx, maxTickMiniPx, h, 0);
    ctx.fillRect(miniLeftPx, y - 1, miniWidthPx, 2);
  }

  // draw notes
  for (const n of songCtx.song.tracks[0].notes) {
    const note = midiToNote(n.midi);
    let noteWidth;
    const noteHeight = h / (tickWindow / n.durationTicks);
    let x = xInPiano(n.midi, octaves, 0, w, whiteWidthPx);
    const y = map(n.ticks, minTick, maxTick, h, 0) - noteHeight; // ticks // flip y axis
    if (isBlack(note)) {
      ctx.fillStyle = "black";
      noteWidth = blackWidthPx;
      x = x - noteWidth / 2;
    } else {
      ctx.strokeStyle = "rgba(0,0,0, 0.4)";
      ctx.lineWidth = 1;
      ctx.fillStyle = "white";
      noteWidth = whiteWidthPx;
      x = x - whiteWidthPx / 2;
    }
    ctx.fillRect(x, y, noteWidth, noteHeight);
    ctx.strokeRect(x, y, noteWidth, noteHeight);
    //ctx.fillText("" + n.midi, x, y, 100);

    // draw current tick line
    ctx.fillStyle = "gold";
    ctx.fillRect(miniWidthPx, map(tick, minTick, maxTick, h, 0), w, 2);
  }

  for (const [t, ns] of pressed) {
    const noteHeight = h / tickWindow;
    for (const n of ns) {
      const note = midiToNote(n);
      let x = xInPiano(n, octaves, 0, w, whiteWidthPx);
      const y = map(t, minTick, maxTick, h, 0);
      let noteWidth;
      if (isBlack(note)) {
        ctx.fillStyle = "red";
        noteWidth = blackWidthPx;
        x = x - noteWidth / 2;
      } else {
        ctx.fillStyle = "red";
        noteWidth = whiteWidthPx;
        x = x - whiteWidthPx / 2;
      }
      ctx.fillRect(x, y, noteWidth, noteHeight);
    }
  }
}
