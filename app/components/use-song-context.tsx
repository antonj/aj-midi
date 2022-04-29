import { useRef } from "react";
import { Midi } from "@tonejs/midi";
import create from "zustand";
import { persist } from "zustand/middleware";
import { useRequestAnimationFrame } from "./use-request-animation-frame";

export type SongSettings = {
  speed: number;
  start: number;
  tickWindow: number;
  setStart(start: number): void;
  setTickWindow(tickWindow: number): void;
  setSpeed(start: number): void;
};

export const useSettings = create<SongSettings>(
  persist(
    (set) => ({
      speed: 1,
      start: 0,
      tickWindow: 600,
      setSpeed: (speed: number) => set((s) => ({ ...s, speed })),
      setTickWindow: (tickWindow: number) => set((s) => ({ ...s, tickWindow })),
      setStart: (start: number) => set((s) => ({ ...s, start })),
    }),
    {
      name: "song-settings",
    }
  )
);

type SongSettingsExtended = SongSettings & {
  msPerTick: number;
  tick: number;
  currentTimeMs: number;
  lastTickAt: number;
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

  const songRef = useRef<SongSettingsExtended>({
    ...ctx,
    msPerTick,
    tick: -1000,
    currentTimeMs: -1000,
    lastTickAt: 0,
  });
  if (ctx.start !== songRef.current.start) {
    // seek
    songRef.current.tick = ctx.start;
  }
  songRef.current = {
    ...songRef.current,
    ...ctx,
    msPerTick,
  };

  useRequestAnimationFrame(() => {
    const now = performance.now();
    const elapsedSinceLastTick = now - songRef.current.lastTickAt;
    const tick =
      songRef.current.tick + elapsedSinceLastTick / songRef.current.msPerTick;
    onTick(tick, songRef.current);
    songRef.current.tick = tick;
    songRef.current.lastTickAt = now;
  });
}
