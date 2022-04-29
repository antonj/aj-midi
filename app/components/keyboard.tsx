import { Midi } from "@tonejs/midi";
import { useMemo, useState } from "react";
import { isBlack, midiToOctave, notes, toMidiTone } from "../util/music";

import styles from "./keyboard.css";
import { useBeep } from "./use-beep";
import { useSongTicker } from "./use-song-context";

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

  const [sPressed, setPressed] = useState(new Set<number>());
  const [sFuture, setFuture] = useState(new Set<number>());
  const beep = useBeep();

  useSongTicker(song, (tick, settings) => {
    const changes = new Set<{
      midi: number;
      duration: number;
      durationTicks: number;
    }>();
    const pressed = new Set<number>();
    const future = new Set<number>();
    for (const n of song.tracks[0].notes ?? []) {
      // current
      if (tick > n.ticks && tick < n.ticks + n.durationTicks) {
        pressed.add(n.midi);
        changes.add(n);
      }
      // future
      if (tick < n.ticks && tick > n.ticks - settings.tickWindow) {
        future.add(n.midi);
      }
    }
    if (!eqSet(pressed, sPressed)) {
      setPressed((curr) => {
        if (!eqSet(curr, pressed)) {
          return pressed;
        }
        return curr;
      });
      for (const t of changes) {
        console.log("beep, t.name", t.durationTicks * settings.msPerTick);
        beep(t.durationTicks * settings.msPerTick, t.midi);
      }
    }
    if (!eqSet(future, sFuture)) {
      setFuture((curr) => {
        if (!eqSet(curr, future)) {
          return future;
        }
        return curr;
      });
    }
  });

  return (
    <div className="relative w-full h-full" data-keyboard>
      {ovtaves.map((octave) => (
        <Octave
          key={octave}
          octaveIndex={octave}
          pressedMidiTone={sPressed}
          pressedMidiToneFuture={sFuture}
        />
      ))}
    </div>
  );
}

function Octave({
  octaveIndex,
  pressedMidiTone,
  pressedMidiToneFuture,
}: {
  octaveIndex: number;
  pressedMidiTone: Set<number>;
  pressedMidiToneFuture: Set<number>;
}) {
  return (
    <div className="octave flex">
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
                  ? "key-pressed "
                  : "") +
                (pressedMidiToneFuture.has(toMidiTone(octaveIndex, i))
                  ? "key-pressed-future "
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
                    ? "key-pressed "
                    : "") +
                  (pressedMidiToneFuture.has(toMidiTone(octaveIndex, i + 1))
                    ? "key-pressed-future "
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
    </div>
  );
}
