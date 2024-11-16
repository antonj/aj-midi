import { useEffect, useRef, useState } from "react";
import { useMidiInput } from "./use-web-midi";
import { getEngine, useEngineSnapshot } from "./engine-provider";
import { eqSet } from "./keyboard";

function usePlayContext() {
  const snap = useEngineSnapshot();
  const pressed = snap.pressed;
  const tickStart = snap.tickStart;

  const [d, input] = useMidiInput();
  const [missing, setMissing] = useState(new Set<number>());

  const ok = useRef(new Map<string, { midi: number; ticks: number }>());
  const inputUsed = useRef(new Set<string>());

  // Clear when start changes
  useEffect(() => {
    setMissing((m) => (m.size === 0 ? m : new Set()));
    ok.current.clear();
    inputUsed.current.clear();
  }, [tickStart]);

  // pressed midi:ticks
  // input midi:time
  // ok => midi:ticks:time // this note is take care of

  useEffect(() => {
    const newMissing = new Set(missing);

    // clean inputUsed every time on keys are pressed
    if (input.size === 0) {
      inputUsed.current.clear();
    }

    // clean old pressed from ok if they are not pressed anymore
    for (const [k, o] of ok.current) {
      const p = pressed.get(o.midi);
      if (!p) {
        // not pressed anymore remove from ok
        ok.current.delete(k);
      } else if (okKey(p) !== k) {
        // could be pressed but with different input key
        ok.current.delete(k);
      }
    }

    // find new mathes
    for (const [k, i] of input) {
      if (inputUsed.current.has(`${i.midi}:${i.time}`)) {
        // ignore this input has already been matched with note
        continue;
      }
      const p = pressed.get(k);
      if (p && !ok.current.has(okKey(p))) {
        // consume this input
        inputUsed.current.add(`${i.midi}:${i.time}`);
        // this note is ok, matched with input
        ok.current.set(okKey(p), p);
        newMissing.delete(p.midi);
      }
    }

    // find missing
    for (const [k, p] of pressed) {
      if (!ok.current.has(okKey(p))) {
        newMissing.add(k);
      }
    }
    /* console.log("============");
     * console.log(
     *   "pressed",
     *   Array.from(pressed.entries()).map(([k, v]) => `${k}:${v.ticks}`)
     * );
     * console.log(
     *   "input",
     *   Array.from(input.entries()).map(([k, v]) => `${k}:${v.time}`)
     * );
     * console.log(
     *   "ok",
     *   Array.from(ok.current.entries()).map(([k, v]) => `${k}:${v.ticks}`)
     * );
     * console.log("inputUsed", Array.from(inputUsed.current));
     * console.log("missed", Array.from(newMissing)); */
    setMissing((m) => (eqSet(m, newMissing) ? m : newMissing));
  }, [pressed, input]);
  return [d, missing] as const;
}

function okKey(n: { midi: number; ticks: number }) {
  return `${n.midi}:${n.ticks}`;
}

export function usePlayController() {
  const ctx = getEngine();
  const [d, missing] = usePlayContext();
  const prevSpeed = useRef(ctx.speed);
  useEffect(() => {
    if (!d) {
      return;
    }
    if (missing.size > 0 && ctx.speed !== 0) {
      prevSpeed.current = ctx.speed;
      ctx.speed = 0;
    } else if (missing.size === 0 && ctx.speed !== prevSpeed.current) {
      ctx.speed = prevSpeed.current;
    }
  }, [d, missing]);
}
