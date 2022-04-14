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
import { useTicker } from "./use-ticker";

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
  console.log(info);

  useTicker(song, (tick, msPerTick) => {
    const canv = canvasRef.current;
    if (!canv) {
      return;
    }
    const ctx = canv.getContext("2d");
    if (!ctx) {
      return;
    }
    draw(ctx, tick, msPerTick, song, octaves);
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
  msPerTick: number,
  song: Midi,
  octaves: number[]
) {
  const canvas = ctx.canvas;
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "salmon";
  ctx.fillRect(0, 0, w, h);

  // | |x| | |x| |  |  |
  // | 2-- | 5-- |  |  |
  // |  |  |  |  |  |  |
  // 1- 3- 4- 6- 7- 7-

  // white left = index
  // white left = index + w
  // black left = index - w/2
  // black right = index + w/2

  const minMidi = toMidiTone(octaves[0], 0);
  const maxMidi = toMidiTone(octaves[octaves.length - 1], numNotesInOctave - 1);
  console.log(minMidi, maxMidi);
  const numWhites = octaves.length * numWhiteInOctate;

  const tickWindow = 400; // ticks shown in height
  const minTick = tick;
  //const maxTick = song.durationTicks;
  const maxTick = tick + tickWindow;
  const whiteWidth = w / numWhites;

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
  for (let midi = minMidi; midi <= maxMidi; midi++) {
    let x = xInPiano(midi, octaves, 0, w);

    const note = midiToNote(midi);
    ctx.lineWidth = 1;
    if (isBlack(note)) {
      ctx.strokeStyle = "black";
    } else {
      ctx.strokeStyle = "white";
    }
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.closePath();
    ctx.stroke();
  }

  for (const n of song.tracks[0].notes) {
    let nw = w / numWhites;
    const note = midiToNote(n.midi);
    const nh = h / (tickWindow / n.durationTicks);
    let x = xInPiano(n.midi, octaves, 0, w);
    const y = map(n.ticks, minTick, maxTick, h, 0) - nh; // ticks // flip y axis
    if (isBlack(note)) {
      ctx.fillStyle = "black";
      nw = 0.6 * whiteWidth;
      x = x - nw / 2;
    } else {
      ctx.fillStyle = "white";
      x = x - whiteWidth / 2;
    }
    ctx.fillRect(x, y, nw, nh);
    ctx.fillText("" + n.midi, x, y, 100);
  }
}
