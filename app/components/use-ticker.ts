import { Midi } from "@tonejs/midi";
import { useRef, useState } from "react";
import { eqSet } from "../util/set";
import { useBeep } from "./use-beep";
import { useRequestAnimationFrame } from "./use-request-animation-frame";

export function useTicker(
  song: Midi,
  onTick: (tick: number, msPerTick: number) => void
) {
  const refStart = useRef(performance.now());
  const ppq = song.header.ppq;
  let bpm = song.header.tempos[0].bpm;
  const msPerTick = (bpm * ppq) / (60 * 1000);

  useRequestAnimationFrame(() => {
    const now = performance.now();
    const elapsed = now - refStart.current;
    const tick = Math.floor(elapsed / msPerTick);
    onTick(tick, msPerTick);
  });
}
