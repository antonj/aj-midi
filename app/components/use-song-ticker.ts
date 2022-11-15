import { useRef } from "react";
import { roundTo } from "../util/map";
import { SongSettings, useSettings } from "./context-settings";
import { SongCtx, useSongCtx } from "./context-song";
import { usePrevious } from "./use-previous";
import { useRequestAnimationFrame } from "./use-request-animation-frame";

export type SongSettingsExtended = SongSettings & {
  songCtx: SongCtx;
  tickEnd: number;
  tickRepeatStart: number;
};

type TickerCallback = (tick: number, songCtx: SongSettingsExtended) => void;

export function useSongTicker(
  onTick: TickerCallback,
  onStateChange?: (state: "started" | "stopped") => void
) {
  const songCtx = useSongCtx();
  const ctx = useSettings((s) => s);
  const {
    ticksPerBar,
    bpm,
    song: {
      durationTicks,
      header: { ppq },
    },
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

  useRequestAnimationFrame(function songTicker(deltaMs) {
    let msPerTick = (60 * 1000) / (bpm * ppq);
    msPerTick /= ctx.speed;
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
  }, onStateChange);
}
