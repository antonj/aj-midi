import {
  cMidi,
  midiToNote,
  noteIndex,
  numWhiteInOctate,
  isBlack,
  notesWithFlats,
} from "./music";
import { NoteWithFlat, Accidental, KeyScale } from "./music";
import { Key } from "./music";
import { KeySignatureEvent } from "@tonejs/midi/dist/Header";

export type KeySignature = {
  key: Key;
  startNote: NoteWithFlat;
  accidental: Accidental;
  scale: KeyScale;
  notes: Array<NoteWithFlat>;
};

export const scaleMajorHalfsteps = [2, 2, 1, 2, 2, 2, 1];
export const scaleMinorHalfsteps = [2, 1, 2, 2, 1, 2, 2];

export function findKeySignature(kse?: KeySignatureEvent) {
  if (!kse) {
    return null;
  }
  return keySignatures[`${kse.key}-${kse.scale}` as Key] || null;
}
export const keySignatures: {
  [k in Key]: KeySignature;
} = (function createKeySignatures() {
  let keySignatures: {
    [k: string]: KeySignature & { startMidi: number; index: number };
  } = {};
  // sharp keys signatures
  for (
    let startNote = cMidi, i = 0;
    i < 7 + 5; // all the way around the weel, efter 7 steps we are looking at flat keys
    i++, startNote = startNote + 7 // seven halfsteps forward is the next major key start https://en.wikipedia.org/wiki/Perfect_fifth
  ) {
    const nMajor = midiToNote(startNote);
    const nMinor = midiToNote(startNote - 3); // minor scales starts 3 steps minor to the major key
    const keyMajor = nMajor + "-major";
    const keyMinor = nMinor + "-minor";
    keySignatures[keyMajor] = {
      key: keyMajor as Key,
      startNote: nMajor,
      startMidi: cMidi + noteIndex[nMajor],
      scale: "major",
      accidental: "sharp",
      notes: [],
      index: i,
    };
    keySignatures[keyMinor] = {
      key: keyMinor as Key,
      startNote: nMinor,
      startMidi: cMidi + noteIndex[nMinor],
      scale: "minor",
      accidental: "sharp",
      notes: [],
      index: i,
    };
    for (let j = 0, note = startNote; j < numWhiteInOctate; j++) {
      const n = midiToNote(note);
      // sharps
      keySignatures[keyMajor].notes.push(n);
      keySignatures[keyMinor].notes.push(n);
      note = note + scaleMajorHalfsteps[j];
    }
    // reorder notes of minor scale ot have them in order
    let a = keySignatures[keyMinor].notes;
    keySignatures[keyMinor].notes = a
      .slice(a.indexOf(nMinor))
      .concat(a.slice(0, a.indexOf(nMinor)));
  }

  for (const k of Object.keys(keySignatures)) {
    const signature = keySignatures[k];
    if (signature.index > 5) {
      if (signature.index !== 6) {
        delete keySignatures[k]; // Gb and F#
      }
      const startNote = midiToNote(signature.startMidi, "flat");
      const key = (startNote + "-" + signature.scale) as Key;
      keySignatures[key] = {
        ...signature,
        key: key,
        startNote: startNote,
        notes: signature.notes.map((n) => notesWithFlats[noteIndex[n]]),
        accidental: "flat",
      };
    }
  }

  console.log(keySignatures);
  return keySignatures as unknown as {
    [k in Key]: KeySignature;
  };
})();
