import midi from "@tonejs/midi";
import type { Key, KeySignature, Note } from "./key-signature";
import {
  keySignatures,
  noteIndex,
  scaleMajorHalfsteps,
  scaleMinorHalfsteps,
} from "./key-signature";
const { Midi, Header } = midi;

export function createScalesMidi(listKs: Array<KeySignature>) {
  const m = new Midi();

  m.header = new Header();
  m.header.keySignatures = [];

  const track = m.addTrack();

  function midiFromNote(n: Note): number {
    return 60 + noteIndex[n];
  }

  let i = 0;
  for (const ks of listKs) {
    // if (!new Set<Key>(["C-major", "C#-major", "E-major"]).has(ks.key)) {
    //   continue;
    // }
    let note = midiFromNote(ks.notes[0]);
    const key = ks.notes[0] || "C";
    const scale = ks.scale || "major";
    m.header.tempos.push({
      bpm: 120,
      time: 0,
      ticks: 0,
    });
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
        time: i / 2,
        duration: 1 / 2,
      });
      i++;
      note = note + halfSteps;
    }
    i = i + 2;
    // chromatic scale
    for (
      let note = midiFromNote(ks.notes[0]) - 2 * 24, y = 0;
      y < 24 * 4;
      y++, note++
    ) {
      track.addNote({
        midi: note,
        time: i / 2,
        duration: 1 / 2,
      });
      i++;
    }
    i = i + 4;
  }

  m.header.timeSignatures = [{ ticks: 0, timeSignature: [4, 4] }];
  return m;
}
