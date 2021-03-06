import { useMemo, useRef } from "react";
import { Midi } from "@tonejs/midi";
import create from "zustand";
import { persist } from "zustand/middleware";
import { useRequestAnimationFrame } from "./use-request-animation-frame";
import { midiToOctave } from "../util/music";
import { roundTo } from "../util/map";
import { usePrevious } from "./usePrevious";

export type SongSettings = {
  speed: number;
  tickStart: number;
  repeatBars: number;
  tickWindow: number;
  setStart(tickStart: number): void;
  setRepeatBars(bars: number): void;
  setTickWindow(tickWindow: number): void;
  setSpeed(start: number): void;
};

export const useSettings = create<SongSettings>(
  persist(
    (set) => ({
      speed: 1,
      tickStart: 0,
      repeatBars: 0,
      tickWindow: 600,
      setSpeed: (speed: number) => set((s) => ({ ...s, speed })),
      setTickWindow: (tickWindow: number) => set((s) => ({ ...s, tickWindow })),
      setStart: (tickStart: number) =>
        set((s) => ({ ...s, tickStart: Math.floor(tickStart) })),
      setRepeatBars: (repeatBars: number) => set((s) => ({ ...s, repeatBars })),
    }),
    {
      name: "song-settings",
    }
  )
);

export type SongSettingsExtended = SongSettings & {
  song: Midi;
  msPerTick: number;
  octaves: Array<number>;
  ticksPerBar: number;
  tickEnd: number;
};

export function useSongTicker(song: Midi, cb: TickerCallback) {
  const ctx = useSettings();
  useTicker(song, ctx, cb);
}

type TickerCallback = (tick: number, songCtx: SongSettingsExtended) => void;

function useTicker(song: Midi, ctx: SongSettings, onTick: TickerCallback) {
  const ppq = song.header.ppq;
  let bpm = song.header.tempos[0].bpm;
  let msPerTick = (bpm * ppq) / (60 * 1000);
  msPerTick /= ctx.speed;
  const ticksPerBar = song.header.timeSignatures[0].timeSignature[0] * ppq;

  const octaves = useMemo(() => {
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
    const lowOctave = midiToOctave(low).octave;
    const highOctave = midiToOctave(high).octave;
    const numOctaves = highOctave - lowOctave + 1;
    const octaves = Array.from({ length: numOctaves }).map(
      (_, i) => lowOctave + i
    );
    return octaves;
  }, [song]);

  const tickRef = useRef(ctx.tickStart);

  const ctxExtended: SongSettingsExtended = {
    ...ctx,
    song,
    octaves,
    msPerTick,
    ticksPerBar,
    tickEnd:
      ctx.repeatBars === 0
        ? song.durationTicks
        : roundTo(
            Math.max(0, ctx.tickStart) + ctx.repeatBars * ticksPerBar,
            ticksPerBar
          ),
  };

  const prevStart = usePrevious(ctx.tickStart);
  // seek
  if (ctx.tickStart !== prevStart) {
    tickRef.current = ctx.tickStart;
  }

  useRequestAnimationFrame((deltaMs) => {
    let tick = tickRef.current + deltaMs / msPerTick;

    if (tick > ctxExtended.tickEnd && ctx.tickStart < ctxExtended.tickEnd) {
      // reset to start
      tick = roundTo(ctx.tickStart, ticksPerBar) - ticksPerBar;
    }
    tickRef.current = tick;
    onTick(tickRef.current, ctxExtended);
  });
}
