import type { Midi } from "@tonejs/midi";
import type { KeySignatureEvent } from "@tonejs/midi/dist/Header";

export type Note = (typeof notes)[number];

export const notes = [
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "A#",
  "B",
] as const;

export const noteToMidi: { [key in Note]: number } = {
  C: 60,
  "C#": 61,
  D: 62,
  "D#": 63,
  E: 64,
  F: 65,
  "F#": 66,
  G: 67,
  "G#": 68,
  A: 69,
  "A#": 70,
  B: 71,
};

export const notesWithFlats = [
  "C",
  "D",
  "Db",
  "D",
  "Eb",
  "E",
  "F",
  "Gb",
  "G",
  "Ab",
  "A",
  "Bb",
  "B",
] as const;
type NoteWithFlat = Note | (typeof notesWithFlats)[number];

type Accidental = "sharp" | "flat";

export const numNotesInOctave = notes.length;
export const numWhiteInOctate = notes.filter(isWhite).length;
export const numBlackInOctate = notes.filter(isBlack).length;

export type KeyScale = "major" | "minor";

export type Key = `${NoteWithFlat}-${KeyScale}`;

export const scaleMajorHalfsteps = [2, 2, 1, 2, 2, 2, 1];
export const scaleMinorHalfsteps = [2, 1, 2, 2, 1, 2, 2];
const cMidi = 36;

export type KeySignature = {
  key: Key;
  startNote: Note;
  accidental: Accidental;
  scale: KeyScale;
  notes: Array<Note>;
};

// how many halfsteps from to
export function offsetBetweenNotes(from: Note, to: Note): number {
  const f = notes.indexOf(from); // 0
  const t = notes.indexOf(to); // 2
  const diff = t - f;
  if (diff >= 0) {
    return diff;
  }
  return notes.length + diff;
}

export function findKeySignature(kse?: KeySignatureEvent) {
  if (!kse) {
    return null;
  }
  return keySignatures[`${kse.key}-${kse.scale}` as Key] || null;
}

export const keySignatures: {
  [k in Key]: KeySignature;
} = (function createKeySignatures() {
  let keySignatures: { [k: string]: KeySignature & { startMidi: number } } = {};
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
      startMidi: startNote,
      scale: "major",
      accidental: "sharp",
      notes: [],
    };
    keySignatures[keyMinor] = {
      key: keyMinor as Key,
      startNote: nMinor,
      startMidi: startNote - 3,
      scale: "minor",
      accidental: "sharp",
      notes: [],
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

  // Create flats from sharps
  for (const signature of Object.values(keySignatures)) {
    if (isBlack(signature.startNote)) {
      const startNote = midiToNote(signature.startMidi + 1);
      const keyMajor = (startNote + "b-" + signature.scale) as Key;
      keySignatures[keyMajor] = {
        ...signature,
        key: keyMajor,
        accidental: "flat",
      };
    }
  }

  //console.log(keySignatures);
  return keySignatures as unknown as { [k in Key]: KeySignature };
})();

export function isWhite(note?: Note): boolean {
  if (typeof note !== "string") {
    return false;
  }
  return note.length === 1;
}
export function isBlack(note?: Note): boolean {
  if (typeof note !== "string") {
    return false;
  }
  return note.length === 2;
}

export function toMidiTone(octave: number, index: number): number {
  return (octave + 1) * 12 + index;
}

export function midiToNote(midi: number): Note {
  const { index } = midiToOctave(midi);
  return notes[index];
}

export function midiToOctave(midiTone: number): {
  /** octave number */
  octave: number;
  /** index of midi in octave */
  index: number;
} {
  const octave = Math.floor(midiTone / numNotesInOctave) - 1;
  const index = midiTone % numNotesInOctave;
  return { octave, index };
}

export function noteToFreq(midi: number, tuning = 440) {
  return Math.pow(2, (midi - 69) / 12) * tuning;
}

// this is the same as index in key signature C-major
// based on index being the number of halfsteps from the start key C
export function whiteIndexInOctave(index: number) {
  /*
   |    0    1    2    3     4        5    6    7    8    9    10   11
   |       =====     =====       |       =====     =====     ======       |
   |         |         |         |         |         |         |          |
   |=========|=========|=========|=========|========|==========|==========|
   |    0   0.5   1   1.5   2         3   3.5   4   4.5   5   5.5   6
   */
  switch (index) {
    case 0:
      return 0;
    case 1:
      return 0.5;
    case 2:
      return 1;
    case 3:
      return 1.5;
    case 4:
      return 2;
    case 5:
      return 3;
    case 6:
      return 3.5;
    case 7:
      return 4;
    case 8:
      return 4.5;
    case 9:
      return 5;
    case 10:
      return 5.5;
    case 11:
      return 6;
    default:
      throw new Error("index out of bounds");
  }
}

export function getTicksPerBar(song: Midi): number {
  let [x, y] = song.header.timeSignatures[0].timeSignature; // TODO handle all timeSignatures
  let equivalentQuarterNotes = x * (4 / y);
  return song.header.ppq * equivalentQuarterNotes; /* ticks per quarter note */
}
