import { Midi } from "@tonejs/midi";
import { createContext, ReactNode, useContext, useRef } from "react";
import { createStore, useStore } from "zustand";
import { debounce } from "../util/debounce";
import { clamp, roundTo } from "../util/map";
import { SongCtx } from "./context-song";

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

type SettingsStore = ReturnType<typeof createSettingsStore>;
export const SettingsContext = createContext<SettingsStore | null>(null);

export function SettingsProvider({
  children,
  ctx,
  initalSettings,
}: {
  children: ReactNode;
  ctx: SongCtx;
  initalSettings: SettingsInitial;
}) {
  const storeRef = useRef<SettingsStore>();
  if (!storeRef.current) {
    storeRef.current = createSettingsStore(ctx.song, initalSettings);
  }
  return (
    <SettingsContext.Provider value={storeRef.current}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings<T>(
  selector: (state: SongSettings) => T,
  equalityFn?: (left: T, right: T) => boolean
): T {
  const store = useContext(SettingsContext);
  if (!store) throw new Error("Missing SongSettings.Provider in the tree");
  return useStore(store, selector, equalityFn);
}

export type SettingsInitial = {
  speed: number;
  startBar: number;
  repeatBar: number;
  warmupBar: number;
  tickWindow: number;
};

function createSettingsStore(song: Midi, settings: SettingsInitial) {
  console.log(window.location.href);
  const ticksPerBar =
    song.header.timeSignatures[0].timeSignature[0] * song.header.ppq;
  function tickToBar(tick: number) {
    return Math.floor(tick / ticksPerBar);
  }
  function barToTick(bar: number) {
    return clamp(
      roundTo(bar * ticksPerBar, ticksPerBar),
      -1 * ticksPerBar,
      song.durationTicks
    );
  }

  return createStore<SongSettings>()((set, get) => {
    function updateQuery() {
      const url = new URL(window.location.href);
      url.searchParams.set("speed", get().speed.toString());
      url.searchParams.set("window", Math.floor(get().tickWindow).toString());
      url.searchParams.set("start", tickToBar(get().tickStart).toString());
      url.searchParams.set("repeat", Math.floor(get().repeatBars).toString());
      url.searchParams.set(
        "warmup",
        Math.floor(get().repeatBarsWarmup).toString()
      );
      window.history.replaceState(null, "", url.toString());
    }
    const updateQueryDebounced = debounce(updateQuery, 300);

    return {
      speed: settings.speed,
      tickStart: barToTick(settings.startBar),
      repeatBars: settings.repeatBar,
      repeatBarsWarmup: settings.warmupBar,
      tickWindow: settings.tickWindow || ticksPerBar * 4,
      volume: 0,
      detect: false as boolean,
      song: song,
      setSong: (song: Midi) => set((s) => ({ ...s, song })),
      setSpeed: (speed: number) =>
        set((s) => {
          updateQueryDebounced();
          return { ...s, speed };
        }),
      setVolume: (volume: number) => set((s) => ({ ...s, volume })),
      setTickWindow: (tickWindow: number) =>
        set((s) => {
          updateQueryDebounced();
          return { ...s, tickWindow };
        }),
      setStart: (tickStart: number) =>
        set((s) => {
          updateQueryDebounced();
          return { ...s, tickStart: Math.floor(tickStart) };
        }),
      setRepeatBars: (repeatBars: number) =>
        set((s) => {
          updateQueryDebounced();
          return { ...s, repeatBars };
        }),
      setRepeatBarsWarmup: (repeatBarsWarmup: number) =>
        set((s) => {
          updateQueryDebounced();
          return { ...s, repeatBarsWarmup };
        }),
      setDetect: (detect: boolean) => set((s) => ({ ...s, detect })),
    };
  });
}
