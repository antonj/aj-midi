import { useEffect, useRef, useState } from "react";
import { useMidiInput } from "./use-web-midi";
import { useEngine, useEngineSnapshot } from "./engine-provider";
import { eqSet } from "./keyboard";
import type { NoteId } from "~/components/midi-valtio";
import { noteId } from "~/components/midi-valtio";

/** Control midi input, to pause if current song has pressed notes but the midi input has not yet pressed those notes */

function usePlayContext() {
  const snap = useEngineSnapshot();
  const pressed = snap.pressed;
  const presedMidis = snap.pressedMidi;
  const tickStart = snap.tickStart;

  const [d, input] = useMidiInput();
  const [missing, setMissing] = useState(new Set<NoteId>());

  const ok = useRef(new Map<NoteId, { midi: number; ticks: number }>());
  const inputUsed = useRef(new Set<string>());

  // Clear when start changes
  useEffect(() => {
    setMissing((m) => (m.size === 0 ? m : new Set()));
    ok.current.clear();
    inputUsed.current.clear();
  }, [tickStart]);

  // pressed midi:ticks
  // input midi:time
  // ok => midi:ticks:time // this note is taken care of

  useEffect(() => {
    const newMissing = new Set(missing);

    // clean inputUsed every time on keys are pressed
    if (input.size === 0) {
      inputUsed.current.clear();
    }

    // clean old pressed from ok if they are not pressed anymore
    for (const [k] of ok.current) {
      const p = pressed.get(k);
      if (!p) {
        // not pressed anymore remove from ok
        ok.current.delete(k);
      } else if (noteId(p) !== k) {
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
      const p = presedMidis.get(k);
      if (p && !ok.current.has(noteId(p))) {
        // consume this input
        inputUsed.current.add(`${i.midi}:${i.time}`);
        // this note is ok, matched with input
        ok.current.set(noteId(p), p);
        newMissing.delete(noteId(p));
      }
    }

    // find missing
    for (const [k, p] of pressed) {
      if (!ok.current.has(noteId(p))) {
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
  }, [pressed, presedMidis, input, missing]);
  return [d, missing] as const;
}

export function usePlayController() {
  const ctx = useEngine();

  const [d, missing] = usePlayContext();
  const prevSpeed = useRef(ctx.speed);
  useEffect(() => {
    if (!d) {
      return;
    }
    if (!ctx.pauseForMidi) {
      return;
    }
    // pause if missing notes are detected
    if (missing.size > 0 && ctx.speed !== 0) {
      prevSpeed.current = ctx.speed;
      ctx.speed = 0;
    } else if (missing.size === 0 && ctx.speed !== prevSpeed.current) {
      // resume no more missing notes
      ctx.speed = prevSpeed.current;
    }
  }, [d, missing, ctx]);
}
