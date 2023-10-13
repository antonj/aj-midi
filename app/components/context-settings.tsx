import type { Midi } from "@tonejs/midi";
import { createContext, useContext, useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { createStore, useStore } from "zustand";
import { debounce } from "~/util/debounce";
import type { SongCtx } from "./context-song";
import { getTicksPerBar } from "~/util/music";
import { MidiEngine } from "./midi-engine";

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
  movingTimestamp: number;
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
  sheetNotation: boolean;
};

function createSettingsStore(song: Midi) {
  const ticksPerBar = getTicksPerBar(song);
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
  const sheetNotation = searchParams.get("sheet") === "true";

  const settings: SettingsInitial = {
    repeatBar: repeatBar ? parseInt(repeatBar) : 0,
    startTick: startBar ? parseInt(startBar) : -1,
    tickWindow: tickWindow ? parseInt(tickWindow) : ticksPerBar * 4,
    speed: speed ? parseFloat(speed) : 1,
    warmupBar: warmup ? parseInt(warmup) : 0,
    sheetNotation,
  };

  return createStore<SongSettings>()((set, get) => {
    console.log("create store yo");
    function updateQuery() {
      const url = new URL(window.location.href);
      url.searchParams.set("speed", get().speed.toString());
      url.searchParams.set("window", Math.floor(get().tickWindow).toString());
      url.searchParams.set("start", get().tickStart.toString());
      url.searchParams.set("repeat", Math.floor(get().repeatBars).toString());
      if (get().sheetNotation) {
        url.searchParams.set("sheet", "true");
      } else {
        url.searchParams.delete("sheet");
      }
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
      sheetNotation: settings.sheetNotation,
      song: song,
      movingTimestamp: 0,
      setSong: (song: Midi) => set(() => ({ song })),
      setSpeed: (speed: number) =>
        set((s) => {
          updateQueryDebounced();
          return { speed };
        }),
      setVolume: (volume: number) => set(() => ({ volume })),
      setTickWindow: (tickWindow: number) =>
        set(() => {
          updateQueryDebounced();
          return { tickWindow };
        }),
      setStart: (tickStart: number) =>
        set(() => {
          updateQueryDebounced();
          return {
            movingTimestamp: Date.now(),
            tickStart: tickStart,
          };
        }),
      setRepeatBars: (repeatBars: number) =>
        set(() => {
          updateQueryDebounced();
          return { repeatBars };
        }),
      setRepeatBarsWarmup: (repeatBarsWarmup: number) =>
        set(() => {
          updateQueryDebounced();
          return { repeatBarsWarmup };
        }),
      setDetect: (detect: boolean) => set(() => ({ detect })),
      setSheetNotation: (sheetNotation: boolean) =>
        set(() => {
          updateQueryDebounced();
          return { sheetNotation };
        }),
    };
  });
}
