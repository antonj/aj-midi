import { eqSet } from "../util/set";
import { useRequestAnimationFrame } from "./use-request-animation-frame";

export function useTicker() {
  useRequestAnimationFrame(() => {
    const now = performance.now();
    const elapsed = now - refStart.current;
    const tick = Math.floor(elapsed / msPerTick);

    const changes = new Set<{ midi: number; duration: number }>();
    const curr = new Set<number>();
    for (const n of song.tracks[0].notes ?? []) {
      if (tick > n.ticks && tick < n.ticks + n.durationTicks) {
        curr.add(n.midi);
        changes.add(n);
      }
    }
    if (!eqSet(curr, pressed)) {
      setPressed(curr);
      for (const t of changes) {
        beep(t.duration * 1000, t.midi);
      }
    }
  });
}
