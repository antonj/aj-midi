import { useEffect, useRef, useState } from "react";
import { useMidiInput } from "./use-web-midi";
import { useEnginge } from "./context-valtio";
import { useSnapshot } from "valtio";
import { eqSet } from "./keyboard";

function usePlayContext() {
  const ctx = useEnginge();
  const snap = useSnapshot(ctx);
  const pressed = snap.pressed;
  const tickStart = snap.tickStart;
  const [d, input] = useMidiInput();
  const [ok, setOk] = useState(new Set<number>());
  const [missing, setMissing] = useState(new Set<number>());

  useEffect(() => {
    setOk((ok) => (ok.size === 0 ? ok : new Set()));
    setMissing((m) => (m.size === 0 ? m : new Set()));
  }, [tickStart]);

  useEffect(() => {
    // remove old pressed from ok
    const newOk = new Set(ok);
    const newMissing = new Set(missing);

    for (const o of ok) {
      if (!pressed.has(o)) {
        newOk.delete(o);
      }
    }

    // find new mathes
    for (const n of input.keys()) {
      if (pressed.has(n) && !newOk.has(n)) {
        newOk.add(n);
        newMissing.delete(n);
      }
    }

    // find missing
    for (const p of pressed.keys()) {
      if (!newOk.has(p)) {
        newMissing.add(p);
      }
    }

    setMissing((m) => (eqSet(m, newMissing) ? m : newMissing));
    setOk((o) => (eqSet(o, newOk) ? o : newOk));
  }, [pressed, input]);
  return [d, missing] as const;
}

function okKey(n: { midi: number; ticks: number }) {
  return `${n.midi}:${n.ticks}`;
}

export function usePlayController() {
  const ctx = useEnginge();
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
