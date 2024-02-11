import type { Midi } from "@tonejs/midi";
import type { KeySignatureEvent } from "@tonejs/midi/dist/Header";
import { floorTo } from "./map";

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

export function getOctaves(notes: { midi: number }[]) {
  let low = Number.MAX_VALUE;
  let high = Number.MIN_VALUE;
  for (const n of notes) {
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

export function mergeNotes(
  song: Midi,
  filter = "piano",
  tracks: Set<number> = new Set()
) {
  const pianoTracks = song.tracks
    .filter((_, i) => (tracks.size === 0 ? true : tracks.has(i)))
    .filter((t) => t.instrument.family === filter);
  // song.tracks = pianoTracks;
  // const blob = new Blob([song.toArray()], {
  //   type: "audio/midi",
  // });
  // var url = window.URL.createObjectURL(blob);
  // window.location.assign(url);

  if (pianoTracks.length === 0) {
    // ignore instrument just use the first available track
    return song.tracks[0].notes;
  }
  let merged = pianoTracks[0].notes;
  for (let i = 1; i < pianoTracks.length; i++) {
    merged = merged.concat(pianoTracks[i].notes);
  }
  return merged.sort((a, b) => a.ticks - b.ticks);
}

/**
 * Return index relative to key signature.
 * Index is position relative to key signature.
 * Ex 12 in C-major would be index 0
 * Ex 13 in C-major would be index 0.5
 * Ex 14 in C-major would be index 1
 * Ex 24 in C-major would be index 7
 *
 * Ex 12 in E-major would be index -0.5
 * Ex 13 in E-major would be index 0
 *
 * +--------+----+----+----+----+----+----+----+----+----+----+----+----+
 * | Octave | C  | C# | D  | D# | E  | F  | F# | G  | G# | A  | A# | B  |
 * +--------+----+----+----+----+----+----+----+----+----+----+----+----+
 * | -1     |  0 |  1 |  2 |  3 |  4 |  5 |  6 |  7 |  8 |  9 | 10 | 11 |
 * |  0     | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 | 21 | 22 | 23 |
 * |  1     | 24 | 25 | 26 | 27 | 28 | 29 | 30 | 31 | 32 | 33 | 34 | 35 |
 * |  2     | 36 | 37 | 38 | 39 | 40 | 41 | 42 | 43 | 44 | 45 | 46 | 47 |
 * |  3     | 48 | 49 | 50 | 51 | 52 | 53 | 54 | 55 | 56 | 57 | 58 | 59 |
 * |  4     | 60 | 61 | 62 | 63 | 64 | 65 | 66 | 67 | 68 | 69 | 70 | 71 |
 * |  5     | 72 | 73 | 74 | 75 | 76 | 77 | 78 | 79 | 80 | 81 | 82 | 83 |
 * |  6     | 84 | 85 | 86 | 87 | 88 | 89 | 90 | 91 | 92 | 93 | 94 | 95 |
 * |  7     | 96 | 97 | 98 | 99 |100 |101 |102 |103 |104 |105 |106 |107 |
 * |  8     |108 |109 |110 |111 |112 |113 |114 |115 |116 |117 |118 |119 |
 * |  9     |120 |121 |122 |123 |124 |125 |126 |127 | -  | -  | -  | -  |
 * +--------+----+----+----+----+----+----+----+----+----+----+----+----+
 */
export function whiteIndexInKey(midi: number, ks: KeySignature) {
  if (ks.key === "C-major") {
    return whiteIndex(midi);
  }
  const cOffMidi = offsetBetweenNotes("C", ks.startNote);
  const wi = Math.floor(whiteIndexInOctave(cOffMidi)); // from C to n

  const n = midiToNote(midi);
  const ksOffMidi = offsetBetweenNotes(ks.startNote, n);
  const ksI = whiteIndexInOctave(ksOffMidi); // from key start to n

  // where is the previous C
  const midiC = floorTo(midi - (ksOffMidi + cOffMidi), 12);
  let midiCOct = midiToOctave(midiC).octave;

  const res = midiCOct * 7 + wi + ksI;
  return res;
}

/** White index in key C-major */
export function whiteIndex(midi: number) {
  const oct = midiToOctave(midi);
  return oct.octave * 7 + whiteIndexInOctave(oct.index);
}
