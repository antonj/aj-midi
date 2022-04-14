import { Midi } from "@tonejs/midi";
import { useMemo, useRef, useState } from "react";

import styles from "./keyboard.css";
import { useBeep } from "./use-beep";
import { useRequestAnimationFrame } from "./use-request-animation-frame";

const octave = [
  "c",
  "c#",
  "d",
  "d#",
  "e",
  "f",
  "f#",
  "g",
  "g#",
  "a",
  "a#",
  "h",
];

function isBlack(key?: string) {
  if (typeof key === "string") {
    return key.length === 2;
  }
  return false;
}

export function links() {
  return [{ rel: "stylesheet", href: styles }];
}

function midiToOctave(midiTone: number) {
  const octaveLenght = 12;
  const octave = Math.floor(midiTone / octaveLenght) - 1;
  const index = midiTone % octaveLenght;
  return { octave, index };
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

  const refStart = useRef(performance.now());
  const ppq = song.header.ppq;
  let bpm = song.header.tempos[0].bpm;
  const msPerTick = (bpm * ppq) / (60 * 1000);
  const [pressed, setPressed] = useState(new Set<number>());
  const beep = useBeep();

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
        beep(100, t.midi);
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

function toMidiTone(octave: number, index: number): number {
  return (octave + 1) * 12 + index;
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
      {octave.map((t, i) => {
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
            {isBlack(octave[i + 1]) ? (
              <button
                className={
                  "key-black " +
                  (pressedMidiTone.has(toMidiTone(octaveIndex, i + 1))
                    ? "key-pressed"
                    : "")
                }
              >
                {octave[i + 1]}
              </button>
            ) : null}
          </div>
        );
      })}
    </>
  );
}
