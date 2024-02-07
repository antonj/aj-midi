import { Midi } from "@tonejs/midi";
import { useEffect, useRef } from "react";
import { subscribeKey } from "valtio/utils";
import type { SongCtx } from "./context-song";
import { useEnginge } from "./engine-provider";
import { MidiEngine } from "./midi-valtio";

export type SongSettingsExtended = {
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
} & {
  songCtx: SongCtx;
  tickEnd: number;
  tickRepeatStart: number;
};

type TickerCallback = (tick: number, songCtx: MidiEngine) => void;

export function useSongTicker(onTick: TickerCallback) {
  const ctx = useEnginge();
  const callbackRef = useRef(onTick);
  if (onTick != callbackRef.current) {
    callbackRef.current = onTick;
  }

  useEffect(() => {
    callbackRef.current(ctx.tick, ctx); // always draw first then only onchanges
    return subscribeKey(ctx, "rid", () => {
      callbackRef.current(ctx.tick, ctx);
    });
  }, [ctx]);
}
