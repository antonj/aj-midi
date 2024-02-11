import midi from "@tonejs/midi";
const { Midi, Header } = midi;
import {
  keySignatures,
  midiToNote,
  scaleMajorHalfsteps,
  scaleMinorHalfsteps,
  Note,
} from "./music";

export function createScalesMidi() {
  const m = new Midi();

  m.header = new Header();
  m.header.keySignatures = [];

  const track = m.addTrack();

  function midiFromNote(n: Note): number {
    for (let midi = 60; midi < 60 + 12; midi++) {
      if (n === midiToNote(midi)) {
        return midi;
      }
    }
    return 0;
  }

  let i = 0;
  for (const ks of Object.values(keySignatures)) {
    // if (!new Set<Key>(["C-major", "C#-major", "E-major"]).has(ks.key)) {
    //   continue;
    // }
    let note = midiFromNote(ks.startNote);
    const key = ks.startNote || "C";
    const scale = ks.scale || "major";
    m.header.keySignatures.push({
      key,
      scale,
      ticks: track.notes[track.notes.length - 1]?.ticks ?? 0,
    });
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
    for (
      let note = midiFromNote(ks.startNote) - 2 * 24, y = 0;
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
