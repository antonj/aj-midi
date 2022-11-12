import { Midi } from "@tonejs/midi";
import { createContext, ReactNode, useContext, useRef } from "react";
import { createStore, useStore } from "zustand";
import { debounce } from "../util/debounce";
import { SongCtx } from "./context-song";

export type SongSettings = {
  speed: number;
  tickStart: number;
  repeatBars: number;
  repeatBarsWarmup: number;
  tickWindow: number;
  volume: number;
  detect: boolean;
  sheetNotation: boolean;
  song: Midi | null;
  setSong(song: Midi): void;
  setStart(tickStart: number): void;
  setRepeatBars(bars: number): void;
  setRepeatBarsWarmup(bars: number): void;
  setTickWindow(tickWindow: number): void;
  setSpeed(start: number): void;
  setVolume(volume: number): void;
  setDetect(detect: boolean): void;
  setSheetNotation(sheetNotation: boolean): void;
};

type SettingsStore = ReturnType<typeof createSettingsStore>;
export const SettingsContext = createContext<SettingsStore | null>(null);

export function SettingsProvider({
  children,
  ctx,
}: {
  children: ReactNode;
  ctx: SongCtx;
}) {
  const storeRef = useRef<SettingsStore>();
  if (!storeRef.current) {
    storeRef.current = createSettingsStore(ctx.song);
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

type SettingsInitial = {
  speed: number;
  startTick: number;
  repeatBar: number;
  warmupBar: number;
  tickWindow: number;
};

function createSettingsStore(song: Midi) {
  const ticksPerBar =
    song.header.timeSignatures[0].timeSignature[0] * song.header.ppq;
  /* function tickToBar(tick: number) {
   *   return Math.floor(tick / ticksPerBar);
   * }
   * function barToTick(bar: number) {
   *   return clamp(
   *     roundTo(bar * ticksPerBar, ticksPerBar),
   *     -1 * ticksPerBar,
   *     song.durationTicks
   *   );
   * } */

  // intial settings from  query params
  const url = new URL(window.location.href);
  const searchParams = url.searchParams;
  const startBar = searchParams.get("start");
  const repeatBar = searchParams.get("repeat");
  const warmup = searchParams.get("warmup");
  const tickWindow = searchParams.get("window");
  const speed = searchParams.get("speed");

  const settings: SettingsInitial = {
    repeatBar: repeatBar ? parseInt(repeatBar) : 0,
    startTick: startBar ? parseInt(startBar) : -1,
    tickWindow: tickWindow ? parseInt(tickWindow) : ticksPerBar * 4,
    speed: speed ? parseFloat(speed) : 1,
    warmupBar: warmup ? parseInt(warmup) : 0,
  };

  return createStore<SongSettings>()((set, get) => {
    function updateQuery() {
      const url = new URL(window.location.href);
      url.searchParams.set("speed", get().speed.toString());
      url.searchParams.set("window", Math.floor(get().tickWindow).toString());
      url.searchParams.set("start", get().tickStart.toString());
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
      tickStart: settings.startTick,
      repeatBars: settings.repeatBar,
      repeatBarsWarmup: settings.warmupBar,
      tickWindow: settings.tickWindow,
      volume: 0,
      detect: false as boolean,
      sheetNotation: false as boolean,
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
      setSheetNotation: (sheetNotation: boolean) =>
        set((s) => ({ ...s, sheetNotation })),
    };
  });
}
