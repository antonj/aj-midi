import { Midi } from "@tonejs/midi";
import { useMemo } from "react";
import { midiToOctave, toMidiTone } from "../util/music";

export function useOctaves(song: Midi) {
  return useMemo(() => getOctaves(song), [song]);
}

export function getOctaves(song: Midi) {
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
  const lowOctave = midiToOctave(low).octave;
  const highOctave = midiToOctave(high).octave;
  const numOctaves = highOctave - lowOctave + 1;
  const octaves = Array.from({ length: numOctaves }).map(
    (_, i) => lowOctave + i
  );
  const min = toMidiTone(lowOctave, 0);
  const max = toMidiTone(highOctave, 11);
  return { octaves, low, high, min, max };
}
