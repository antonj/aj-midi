import React, {
  createContext,
  ReactNode,
  useContext,
  useMemo,
  useRef,
} from "react";
import { Midi } from "@tonejs/midi";
import create from "zustand";
import { persist } from "zustand/middleware";
import { useRequestAnimationFrame } from "./use-request-animation-frame";
import { midiToOctave, toMidiTone } from "../util/music";
import { roundTo } from "../util/map";
import { usePrevious } from "./usePrevious";

type SongCtx = {
  song: Midi;
  bpm: number;
  msPerTick: number;
  ticksPerBar: number;
  octaves: Array<number>;
  tickConnections: Map<
    { tick: number; midi: number },
    { tick: number; midi: number }
  >;
};

const SongContext = createContext<SongCtx | null>(null);

export function SongProvider({
  song,
  children,
}: {
  song: Midi;
  children: ReactNode;
}) {
  const speed = useSettings((s) => s.speed);
  const octaves = useOctaves(song);
  const ctx = useMemo<SongCtx>(() => {
    let bpm = song.header.tempos[0]?.bpm || 120;
    const ppq = song.header.ppq;
    let msPerTick = (bpm * ppq) / (60 * 1000);
    msPerTick /= speed;
    const ticksPerBar = song.header.timeSignatures[0].timeSignature[0] * ppq;

    console.log(song);
    const tickConnections = new Map<
      { tick: number; midi: number },
      { tick: number; midi: number }
    >();
    // calculate parallell notes
    const notes = song.tracks[0].notes;
    const length = notes.length;
    for (let i = 0; i < length; i++) {
      const n = notes[i];
      const time = n.ticks;
      // look 12 notes ahead
      for (let y = i + 1; y < i + 24 && y < length; y++) {
        const next = notes[y];
        const nextTime = next.ticks;
        const diff = nextTime - time;
        const timeDiff = next.time - n.time;
        if (timeDiff < 0.01) {
          tickConnections.set(
            { tick: n.ticks, midi: n.midi },
            { tick: next.ticks, midi: next.midi }
          );
          // console.log("========");
          // console.log("timediff", timeDiff);
          // console.log("diff", diff);
          console.log(n.midi, n.ticks);
          console.log(next.midi, next.ticks);
        }
      }
    }

    return {
      song,
      bpm,
      msPerTick,
      ticksPerBar,
      tickConnections,
      octaves: octaves.octaves,
    };
  }, [song, speed, octaves]);

  return <SongContext.Provider value={ctx}>{children}</SongContext.Provider>;
}

export function useSongCtx() {
  const ctx = useContext(SongContext);
  if (!ctx) {
    throw new Error("context must be defined");
  }
  return ctx;
}

export type SongSettings = {
  speed: number;
  tickStart: number;
  repeatBars: number;
  repeatBarsWarmup: number;
  tickWindow: number;
  volume: number;
  detect: boolean;
  song: Midi | null;
  setSong(song: Midi): void;
  setStart(tickStart: number): void;
  setRepeatBars(bars: number): void;
  setRepeatBarsWarmup(bars: number): void;
  setTickWindow(tickWindow: number): void;
  setSpeed(start: number): void;
  setVolume(volume: number): void;
  setDetect(detect: boolean): void;
};

export const useSettings = create(
  persist(
    (set) => ({
      speed: 1,
      tickStart: 0,
      repeatBars: 0,
      repeatBarsWarmup: 1,
      tickWindow: 600,
      volume: 0,
      detect: false as boolean,
      song: null,
      setSong: (song: Midi) => set((s) => ({ ...s, song })),
      setSpeed: (speed: number) => set((s) => ({ ...s, speed })),
      setVolume: (volume: number) => set((s) => ({ ...s, volume })),
      setTickWindow: (tickWindow: number) => set((s) => ({ ...s, tickWindow })),
      setStart: (tickStart: number) =>
        set((s) => ({ ...s, tickStart: Math.floor(tickStart) })),
      setRepeatBars: (repeatBars: number) => set((s) => ({ ...s, repeatBars })),
      setRepeatBarsWarmup: (repeatBarsWarmup: number) =>
        set((s) => ({ ...s, repeatBarsWarmup })),
      setDetect: (detect: boolean) => set((s) => ({ ...s, detect })),
    }),
    {
      name: "song-settings",
      partialize: (state) =>
        // omit volume from persist
        Object.fromEntries(
          Object.entries(state).filter(
            ([key]) => !["volume", "detect"].includes(key)
          )
        ),
    }
  )
);

export type SongSettingsExtended = SongSettings & {
  songCtx: SongCtx;
  tickEnd: number;
  tickRepeatStart: number;
};

type TickerCallback = (tick: number, songCtx: SongSettingsExtended) => void;

export function useOctaves(song: Midi) {
  return useMemo(() => {
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
    const min = toMidiTone(lowOctave, 0);
    const max = toMidiTone(highOctave, 11);
    return { octaves, low, high, min, max };
  }, [song]);
}

export function useSongTicker(onTick: TickerCallback) {
  const songCtx = useSongCtx();
  const ctx = useSettings();
  const {
    msPerTick,
    ticksPerBar,
    song: { durationTicks },
  } = songCtx;

  const tickRef = useRef(ctx.tickStart);

  const tickEnd =
    ctx.repeatBars === 0
      ? durationTicks
      : roundTo(
          Math.max(0, ctx.tickStart) + ctx.repeatBars * ticksPerBar,
          ticksPerBar
        );

  const ctxExtended: SongSettingsExtended = {
    ...ctx,
    songCtx,
    tickEnd,
    tickRepeatStart: !ctx.repeatBars
      ? 0
      : tickEnd - ctx.repeatBars * ticksPerBar,
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
      if (ctxExtended.repeatBars > 0) {
        tick = ctxExtended.tickRepeatStart - ctx.repeatBarsWarmup * ticksPerBar;
      } else {
        tick = roundTo(ctx.tickStart, ticksPerBar) - ticksPerBar;
      }
    }
    tickRef.current = tick;
    onTick(tickRef.current, ctxExtended);
  });
}
