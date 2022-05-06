import { Midi } from "@tonejs/midi";
import { PointerEventHandler, useCallback, useEffect, useRef } from "react";
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
import {
  SongSettingsExtended,
  useSettings,
  useSongTicker,
} from "./use-song-context";

const miniMapWidthRatio = 0.1;
const blackWidthRatio = 0.6;

export function Track({ song }: { song: Midi }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const settings = useSettings();

  useSongTicker(song, (tick, songCtx) => {
    const canv = canvasRef.current;
    if (!canv) {
      return;
    }
    const ctx = canv.getContext("2d");
    if (!ctx) {
      return;
    }
    draw(ctx, tick, songCtx);
  });

  useEffect(() => {
    const canv = canvasRef.current;
    if (!canv) {
      return;
    }
    const ctx = canv.getContext("2d");
    if (!ctx) {
      return;
    }

    const handleResize = () => {
      const rect = wrapperRef.current?.getBoundingClientRect();
      if (!rect) {
        return;
      }
      ctx.canvas.height = rect.height;
      ctx.canvas.width = rect.width;
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, []);

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

function draw(
  ctx: CanvasRenderingContext2D,
  tick: number,
  songCtx: SongSettingsExtended
) {
  const canvas = ctx.canvas;
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "#ddd";
  ctx.fillRect(0, 0, w, h);
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
  const minTick = tick;
  const maxTick = tick + tickWindow;
  const whiteWidth = w / numWhites;
  const blackWidth = blackWidthRatio * whiteWidth;

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

  ctx.font = "18px helvetica";
  // draw whites
  for (let midi = minMidi; midi <= maxMidi; midi++) {
    const note = midiToNote(midi);
    if (isBlack(note)) {
      continue;
    }
    let x = xInPiano(midi, octaves, 0, w, whiteWidth);
    x = x - whiteWidth / 2;
    ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
    ctx.fillRect(x, 0, whiteWidth, h);
  }
  // draw blacks
  for (let midi = minMidi; midi <= maxMidi; midi++) {
    const note = midiToNote(midi);
    if (isWhite(note)) {
      continue;
    }
    let x = xInPiano(midi, octaves, 0, w, whiteWidth);
    x = x - blackWidth / 2;
    ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
    ctx.fillRect(x, 0, blackWidth, h);
  }

  // lines
  for (let midi = minMidi; midi <= maxMidi; midi++) {
    const note = midiToNote(midi);
    let x = xInPiano(midi, octaves, 0, w, whiteWidth);
    switch (note) {
      case "c": {
        ctx.lineWidth = 2;
        ctx.strokeStyle = "rgba(0, 0, 0, 0.1)";
        x = x - whiteWidth / 2;
        break;
      }
      case "f": {
        ctx.lineWidth = 1;
        ctx.strokeStyle = "rgba(0, 0, 0, 0.1)";
        x = x - whiteWidth / 2;
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

  // draw notes
  for (const n of songCtx.song.tracks[0].notes) {
    const note = midiToNote(n.midi);
    let noteWidth;
    const noteHeight = h / (tickWindow / n.durationTicks);
    let x = xInPiano(n.midi, octaves, 0, w, whiteWidth);
    const y = map(n.ticks, minTick, maxTick, h, 0) - noteHeight; // ticks // flip y axis
    if (isBlack(note)) {
      ctx.fillStyle = "black";
      noteWidth = blackWidth;
      x = x - noteWidth / 2;
    } else {
      ctx.fillStyle = "white";
      noteWidth = whiteWidth;
      x = x - whiteWidth / 2;
    }
    ctx.fillRect(x, y, noteWidth, noteHeight);
    //ctx.fillText("" + n.midi, x, y, 100);
  }

  // ticks per bar

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
    ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
    const y = map(barTick, minTick, maxTick, h, 0);
    ctx.fillRect(-1, y, w, 2);
  }

  // draw minimap
  const miniLeft = 0;
  const miniRight = miniLeft + w * miniMapWidthRatio;
  const miniWidth = miniRight - miniLeft;
  const whiteWidthMini = miniWidth / numWhites;
  const blackWidthMini = blackWidthRatio * whiteWidthMini;
  const minTickMini = 0;
  const maxTickMini = songCtx.song.durationTicks;
  for (const n of songCtx.song.tracks[0].notes) {
    const note = midiToNote(n.midi);
    const noteHeight = h / (maxTickMini / n.durationTicks);
    let x = xInPiano(n.midi, octaves, miniLeft, miniRight, whiteWidthMini);
    const y = map(n.ticks, minTickMini, maxTickMini, h, 0) - noteHeight; // ticks // flip y axis
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
  let y = map(tick, minTickMini, maxTickMini, h, 0);
  ctx.fillRect(miniLeft, y - 1, miniWidth, 2);
}
