import { createContext, ReactNode, useContext, useRef } from "react";
import { Midi } from "@tonejs/midi";
import { useRequestAnimationFrame } from "./use-request-animation-frame";

export type SongSettings = {
  speed: number;
  start: number;
  tickWindow: number;
};

type SongSettingsExtended = SongSettings & { msPerTick: number };

const SongContext = createContext<SongSettings>({
  speed: 1,
  start: 0,
  tickWindow: 400,
});

export function SongProvider(props: {
  children: ReactNode;
  settings: SongSettings;
}) {
  return (
    <SongContext.Provider value={props.settings}>
      {props.children}
    </SongContext.Provider>
  );
}

export function useSongContext() {
  const ctx = useContext(SongContext);
  return ctx;
}

export function useSongTicker(song: Midi, cb: TickerCallback) {
  const ctx = useContext(SongContext);
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
  });
  songRef.current = {
    ...ctx,
    msPerTick,
  };

  useRequestAnimationFrame(() => {
    const now = performance.now();
    const elapsed = now - ctx.start;
    const tick = Math.floor(elapsed / songRef.current.msPerTick);
    onTick(tick, songRef.current);
  });
}
