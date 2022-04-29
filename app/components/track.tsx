import { Midi } from "@tonejs/midi";
import { useEffect, useMemo, useRef } from "react";
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
import { SongSettings, useSongTicker } from "./use-song-context";

export function Track({ song }: { song: Midi }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const info = useMemo(() => {
    let low = Number.MAX_VALUE;
    let high = Number.MIN_VALUE;
    for (const n of song.tracks[0].notes ?? []) {
      if (n.midi < low) {
        low = n.midi;
      }
      if (n.midi > high) {
        high = n.midi;
      }
    }
    return { low: midiToOctave(low), high: midiToOctave(high) };
  }, [song]);

  const numOctaves = info.high.octave - info.low.octave + 1;
  const octaves = Array.from({ length: numOctaves }).map(
    (_, i) => info.low.octave + i
  );

  useSongTicker(song, (tick, songCtx) => {
    const canv = canvasRef.current;
    if (!canv) {
      return;
    }
    const ctx = canv.getContext("2d");
    if (!ctx) {
      return;
    }
    draw(ctx, tick, songCtx, song, octaves);
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
  }, [song, octaves]);

  return (
    <div className="w-full h-full" ref={wrapperRef}>
      <canvas ref={canvasRef} />
    </div>
  );
}

function draw(
  ctx: CanvasRenderingContext2D,
  tick: number,
  songCtx: SongSettings,
  song: Midi,
  octaves: number[]
) {
  const canvas = ctx.canvas;
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "#ddd";
  ctx.fillRect(0, 0, w, h);

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
  //const maxTick = song.durationTicks;
  const maxTick = tick + tickWindow;
  const whiteWidth = w / numWhites;
  const blackWidth = 0.6 * whiteWidth;

  function xInPiano(
    midi: number,
    octaves: Array<number>,
    minX: number,
    maxX: number
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
    let x = xInPiano(midi, octaves, 0, w);
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
    let x = xInPiano(midi, octaves, 0, w);
    x = x - blackWidth / 2;
    ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
    ctx.fillRect(x, 0, blackWidth, h);
  }

  // lines
  for (let midi = minMidi; midi <= maxMidi; midi++) {
    const note = midiToNote(midi);
    let x = xInPiano(midi, octaves, 0, w);
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
  for (const n of song.tracks[0].notes) {
    const note = midiToNote(n.midi);
    let noteWidth;
    const noteHeight = h / (tickWindow / n.durationTicks);
    let x = xInPiano(n.midi, octaves, 0, w);
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
}
