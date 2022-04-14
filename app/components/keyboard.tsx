import { Midi } from "@tonejs/midi";
import { useMemo, useState } from "react";
import { isBlack, midiToOctave, notes, toMidiTone } from "../util/music";

import styles from "./keyboard.css";
import { useBeep } from "./use-beep";
import { useTicker } from "./use-ticker";

export function links() {
  return [{ rel: "stylesheet", href: styles }];
}

function eqSet<T>(as: Set<T>, bs: Set<T>) {
  if (as.size !== bs.size) return false;
  for (var a of as) if (!bs.has(a)) return false;
  return true;
}

export function Keyboard({ song }: { song: Midi }) {
  const { low, high } = useMemo(() => {
    let low = Number.MAX_VALUE;
    let high = Number.MIN_VALUE;
    for (const n of song.tracks[0].notes ?? []) {
      if (n.midi < low) {
        low = n.midi;
      }
      if (n.midi > high) {
        high = n.midi;
      }
    }
    return { low: midiToOctave(low), high: midiToOctave(high) };
  }, [song]);

  const numOctaves = high.octave - low.octave + 1;
  const ovtaves = Array.from({ length: numOctaves }).map(
    (_, i) => low.octave + i
  );

  const [pressed, setPressed] = useState(new Set<number>());
  const beep = useBeep();

  useTicker(song, (tick, msPerTick) => {
    const changes = new Set<{
      midi: number;
      duration: number;
      durationTicks: number;
    }>();
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
        beep(t.durationTicks * msPerTick, t.midi);
      }
    }
  });

  return (
    <div className="relative w-full h-full flex" data-keyboard>
      {ovtaves.map((octave) => (
        <Octave
          key={octave}
          octaveIndex={octave}
          pressedMidiTone={
            pressed
            //new Set([50])
          }
        />
      ))}
    </div>
  );
}

function Octave({
  octaveIndex,
  pressedMidiTone,
}: {
  octaveIndex: number;
  pressedMidiTone: Set<number>;
}) {
  return (
    <>
      {notes.map((t, i) => {
        if (isBlack(t)) {
          return null;
        }
        return (
          <div key={i} className="key-wrapper">
            <button
              className={
                "key-white " +
                (pressedMidiTone.has(toMidiTone(octaveIndex, i))
                  ? "key-pressed"
                  : "")
              }
            >
              {t}
              {octaveIndex}
              <br />
              {toMidiTone(octaveIndex, i)}
            </button>
            {isBlack(notes[i + 1]) ? (
              <button
                className={
                  "key-black " +
                  (pressedMidiTone.has(toMidiTone(octaveIndex, i + 1))
                    ? "key-pressed"
                    : "")
                }
              >
                {notes[i + 1]}
                <br />
                {toMidiTone(octaveIndex, i + 1)}
              </button>
            ) : null}
          </div>
        );
      })}
    </>
  );
}
