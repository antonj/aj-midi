import midi from "@tonejs/midi";
import type { Note } from "./key-signature";
import {
  keySignatures,
  noteIndex,
  scaleMajorHalfsteps,
  scaleMinorHalfsteps,
} from "./key-signature";
const { Midi, Header } = midi;

export function createScalesMidi() {
  const m = new Midi();

  m.header = new Header();
  m.header.keySignatures = [];

  const track = m.addTrack();

  function midiFromNote(n: Note): number {
    return 60 + noteIndex[n];
  }

  let i = 0;
  for (const ks of Object.values(keySignatures)) {
    // if (!new Set<Key>(["C-major", "C#-major", "E-major"]).has(ks.key)) {
    //   continue;
    // }
    let note = midiFromNote(ks.notes[0]);
    const key = ks.notes[0] || "C";
    const scale = ks.scale || "major";
    console.log("key", key, ks);
    m.header.keySignatures.push({
      key,
      scale,
      ticks: track.notes[track.notes.length - 1]?.ticks ?? 0,
    });
    // key signature notes
    for (const halfSteps of scale === "major"
      ? scaleMajorHalfsteps.concat(
          [...scaleMajorHalfsteps].map((s) => -s).reverse()
        )
      : scaleMinorHalfsteps.concat(
          [...scaleMinorHalfsteps].map((s) => -s).reverse()
        )) {
      track.addNote({
        midi: note,
        time: i,
        duration: 0.5,
      });
      i++;
      note = note + halfSteps;
    }
    // chromatic scale
    for (
      let note = midiFromNote(ks.notes[0]) - 2 * 24, y = 0;
      y < 24 * 4;
      y++, note++
    ) {
      track.addNote({
        midi: note,
        time: i,
        duration: 0.5,
      });
      i++;
    }
    i = i + 10;
  }

  m.header.timeSignatures = [{ ticks: 0, timeSignature: [4, 4] }];
  return m;
}
