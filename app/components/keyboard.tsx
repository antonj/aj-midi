import { isBlack, notesWithSharps, toMidiTone } from "../util/music";
import { useMidiInput } from "./use-web-midi";
import { useEnginge } from "./engine-provider";
import { useSnapshot } from "valtio";
import styles from "./keyboard.css";

export function links() {
  return [{ rel: "stylesheet", href: styles }];
}

export function eqSet<T>(as: Set<T>, bs: Set<T>) {
  if (as.size !== bs.size) return false;
  for (var a of as) if (!bs.has(a)) return false;
  return true;
}

interface Has<T> {
  has(val: T): boolean;
}

export function Keyboard() {
  const eng = useEnginge();
  const state = useSnapshot(eng);

  const octaves = state.octaves.octaves;

  const [_, midiPressed] = useMidiInput();
  return (
    <div data-keyboard>
      {octaves.map((o) => (
        <Octave
          key={o}
          octaveIndex={o}
          pressedMidiTone={midiPressed}
          pressedMidiToneFacit={state.pressed}
          pressedMidiToneFuture={state.pressedFuture}
        />
      ))}
    </div>
  );
}

function Octave({
  octaveIndex,
  pressedMidiTone,
  pressedMidiToneFacit,
  pressedMidiToneFuture,
}: {
  octaveIndex: number;
  pressedMidiTone: Has<number>;
  pressedMidiToneFacit: Has<number>;
  pressedMidiToneFuture: Has<number>;
}) {
  return (
    <div className="octave flex">
      {notesWithSharps.map((t, i) => {
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
                (pressedMidiToneFacit.has(toMidiTone(octaveIndex, i))
                  ? "key-pressed-facit "
                  : "") +
                (pressedMidiToneFuture.has(toMidiTone(octaveIndex, i))
                  ? "key-pressed-future "
                  : "")
              }
            >
              <span>
                {t}
                {octaveIndex}
                <br />
                {toMidiTone(octaveIndex, i)}
              </span>
              {/* {toMidiTone(octaveIndex, i)} */}
            </button>
            {isBlack(notesWithSharps[i + 1]) ? (
              <button
                className={
                  "key-black " +
                  (pressedMidiTone.has(toMidiTone(octaveIndex, i + 1))
                    ? "key-pressed "
                    : "") +
                  (pressedMidiToneFacit.has(toMidiTone(octaveIndex, i + 1))
                    ? "key-pressed-facit "
                    : "") +
                  (pressedMidiToneFuture.has(toMidiTone(octaveIndex, i + 1))
                    ? "key-pressed-future "
                    : "")
                }
              >
                <span>{notesWithSharps[i + 1]}</span>
                {/* {toMidiTone(octaveIndex, i + 1)} */}
              </button>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
