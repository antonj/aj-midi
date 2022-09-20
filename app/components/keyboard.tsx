import { Midi } from "@tonejs/midi";
import { useMemo, useState } from "react";
import { isBlack, midiToOctave, notes, toMidiTone } from "../util/music";

import styles from "./keyboard.css";
import { useOctaves, useSongTicker } from "./use-song-context";
import { useSongSound } from "./use-song-sounds";
import { useToneDetector } from "./use-tone-detector";

export function links() {
  return [{ rel: "stylesheet", href: styles }];
}

export function eqSet<T>(as: Set<T>, bs: Set<T>) {
  if (as.size !== bs.size) return false;
  for (var a of as) if (!bs.has(a)) return false;
  return true;
}

export function Keyboard({ song }: { song: Midi }) {
  const ovtaves = useOctaves(song);

  const [sPressed, setPressed] = useState(new Set<number>());
  const [sFuture, setFuture] = useState(new Set<number>());
  useSongSound(song);

  useSongTicker(song, (tick, settings) => {
    const pressed = new Set<number>();
    const future = new Set<number>();
    for (const n of settings.song.tracks[0].notes ?? []) {
      // current
      if (tick > n.ticks && tick < n.ticks + n.durationTicks) {
        pressed.add(n.midi);
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

  // const tones = useToneDetector(song);
  // const sDetected = new Set(tones);

  return (
    <div data-keyboard>
      {ovtaves.octaves.map((o) => (
        <Octave
          key={o}
          octaveIndex={o}
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
