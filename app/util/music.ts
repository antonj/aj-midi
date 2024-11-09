import type { Midi, Track } from "@tonejs/midi";
import { floorTo } from "./map";
import type { Note, KeySignature } from "./key-signature";
import { noteIndex } from "./key-signature";

export type MidiNumber = number;
export type WhiteIndex = number;

export const notes = ["C", "D", "E", "F", "G", "A", "B"];

export const notesWithSharps = [
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
export type NoteWithSharps = (typeof notesWithSharps)[number];

export const notesWithFlats = [
  "C",
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
export type NoteWithFlatAndSharps =
  | NoteWithSharps
  | (typeof notesWithFlats)[number];

export const numNotesInOctave = notesWithSharps.length;
export const numWhiteInOctate = notesWithSharps.filter(isWhite).length;
export const numBlackInOctate = notesWithSharps.filter(isBlack).length;

export const cMidi = 36;

// how many halfsteps from to
export function offsetBetweenNotes(from: Note, to: Note): number {
  const f = noteIndex[from]; // 0
  const t = noteIndex[to]; // 2
  const diff = t - f;
  if (diff >= 0) {
    return diff;
  }
  return notesWithSharps.length + diff;
}

export function isWhite(note?: NoteWithFlatAndSharps): boolean {
  if (typeof note !== "string") {
    return false;
  }
  return note.length === 1;
}
export function isBlack(note?: NoteWithFlatAndSharps): boolean {
  if (typeof note !== "string") {
    return false;
  }
  return note.length === 2;
}

export function toMidiTone(octave: number, index: number): number {
  return (octave + 1) * 12 + index;
}

export function midiToNote(
  midi: number,
  accidental: "flat" | "sharp" = "sharp"
): NoteWithFlatAndSharps {
  const { index } = midiToOctave(midi);
  if (accidental === "sharp") {
    return notesWithSharps[index];
  } else {
    return notesWithFlats[index];
  }
}

export function noteInKeySignature(note: Note, ks: KeySignature): boolean {
  for (const ksn of ks.notes) {
    if (noteIndex[ksn] === noteIndex[note]) {
      return true;
    }
  }
  return false;
}

export function midiToOctave(midiTone: number): {
  /** octave number */
  octave: number;
  /** index of midi in octave */
  index: number;
} {
  const octave = Math.floor(midiTone / numNotesInOctave) - 1;
  const index = Math.abs(midiTone % numNotesInOctave);
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
      throw new Error("index out of bounds. Index: " + index);
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
  tracks: Track[],
  tracksIndexesSelected: Set<number> = new Set()
) {
  const pianoTracks = tracks.filter((_, i) =>
    tracksIndexesSelected.size === 0 ? true : tracksIndexesSelected.has(i)
  );

  // song.tracks = pianoTracks;
  // const blob = new Blob([song.toArray()], {
  //   type: "audio/midi",
  // });
  // var url = window.URL.createObjectURL(blob);
  // window.location.assign(url);

  if (pianoTracks.length === 0) {
    // ignore instrument just use the first available track
    return tracks[0].notes;
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
  let startNote = ks.notes[0];
  if (ks.scale === "minor") {
    // use major scale startnote since whiteIndexInOctave depends on that major scale halfstep order:
    // [2, 2, 1, 2, 2, 2, 1] instead of the minor [2, 1, 2, 2, 1, 2, 2]
    startNote =
      notesWithSharps[(noteIndex[ks.notes[0]] + 3) % notesWithSharps.length];
  }

  const cOffMidi = offsetBetweenNotes("C", startNote);
  const wi = Math.floor(whiteIndexInOctave(cOffMidi)); // from C to n

  const n = midiToNote(midi);
  const ksOffMidi = offsetBetweenNotes(startNote, n);
  const ksI = whiteIndexInOctave(ksOffMidi); // from key start to n

  // where is the previous C
  const midiC = floorTo(midi - (ksOffMidi + cOffMidi), 12);
  let midiCOct = midiToOctave(midiC).octave;

  let res = midiCOct * 7 + wi + ksI;
  if (
    ks.accidental === "flat" &&
    ks.notes[0].length === 2 &&
    !(ks.key === "F-major" || ks.key === "D-minor")
    // (ks.accidental === "flat" &&
    //   ks.scale === "minor" &&
    //   keySignatures[ks.parallell].startNote.length === 2)
  ) {
    res = res + 1;
  }
  return res;
}

/** White index in key C-major */
export function whiteIndex(midi: number): WhiteIndex {
  const oct = midiToOctave(midi);
  return oct.octave * 7 + whiteIndexInOctave(oct.index);
}
