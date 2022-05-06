import { useMemo, useRef } from "react";
import { Midi } from "@tonejs/midi";
import create from "zustand";
import { persist } from "zustand/middleware";
import { useRequestAnimationFrame } from "./use-request-animation-frame";
import { midiToOctave } from "../util/music";

export type SongSettings = {
  speed: number;
  tickStart: number;
  tickEnd: number;
  tickWindow: number;
  setStart(tickStart: number): void;
  setEnd(tickEnd: number): void;
  setTickWindow(tickWindow: number): void;
  setSpeed(start: number): void;
};

export const useSettings = create<SongSettings>(
  persist(
    (set) => ({
      speed: 1,
      tickStart: 0,
      tickEnd: 0,
      tickWindow: 600,
      setSpeed: (speed: number) => set((s) => ({ ...s, speed })),
      setTickWindow: (tickWindow: number) => set((s) => ({ ...s, tickWindow })),
      setStart: (tickStart: number) => set((s) => ({ ...s, tickStart })),
      setEnd: (tickEnd: number) => set((s) => ({ ...s, tickEnd })),
    }),
    {
      name: "song-settings",
    }
  )
);

export type SongSettingsExtended = SongSettings & {
  song: Midi;
  msPerTick: number;
  tick: number;
  octaves: Array<number>;
  ticksPerBar: number;
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

  const songRef = useRef<SongSettingsExtended>({
    ...ctx,
    song,
    octaves,
    msPerTick,
    ticksPerBar,
    tick: ctx.tickStart,
  });
  if (ctx.tickStart !== songRef.current.tickStart) {
    // seek
    songRef.current.tick = ctx.tickStart;
  }
  songRef.current = {
    ...songRef.current,
    song,
    octaves,
    ticksPerBar,
    ...ctx,
    msPerTick,
  };

  // repeat bars
  songRef.current.tickEnd =
    Math.max(0, songRef.current.tickStart) + 2 * ticksPerBar;
  console.log(
    songRef.current.tickStart,
    songRef.current.tickEnd,
    songRef.current.tick
  );

  useRequestAnimationFrame((deltaMs) => {
    let tick = songRef.current.tick + deltaMs / songRef.current.msPerTick;
    if (
      tick > songRef.current.tickEnd &&
      songRef.current.tickStart < songRef.current.tickEnd
    ) {
      // reset to start
      tick = songRef.current.tickStart;
    }
    songRef.current.tick = tick;
    onTick(songRef.current.tick, songRef.current);
  });
}
