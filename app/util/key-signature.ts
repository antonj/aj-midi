import type { KeySignatureEvent } from "@tonejs/midi/dist/Header";

export const scaleMajorHalfsteps = [2, 2, 1, 2, 2, 2, 1];
export const scaleMinorHalfsteps = [2, 1, 2, 2, 1, 2, 2];

export function findKeySignature(kse?: KeySignatureEvent) {
  if (!kse) {
    return null;
  }
  return keySignatures[`${kse.key}-${kse.scale}` as Key] || null;
}

export type Key =
  | "C-major"
  | "G-major"
  | "D-major"
  | "A-major"
  | "E-major"
  | "B-major"
  | "F#-major"
  | "C#-major"
  | "F-major"
  | "Bb-major"
  | "Eb-major"
  | "Ab-major"
  | "Db-major"
  | "Gb-major"
  | "Cb-major"
  | "A-minor"
  | "E-minor"
  | "B-minor"
  | "F#-minor"
  | "C#-minor"
  | "G#-minor"
  | "D#-minor"
  | "A#-minor"
  | "D-minor"
  | "G-minor"
  | "C-minor"
  | "F-minor"
  | "Bb-minor"
  | "Eb-minor"
  | "Ab-minor";
export type Note = keyof typeof noteIndex;
export type KeySignature =
  | {
      key: Key;
      notes: Note[];
      accidental: "sharp" | "flat";
      scale: "major";
      minor: Key;
    }
  | {
      key: Key;
      notes: Note[];
      accidental: "sharp" | "flat";
      scale: "minor";
      major: Key;
    };

// prettier-ignore
// biome-ignore format: no
export const keySignatures:  {[k in Key]: KeySignature} = {
  'C-major':	{ key: 'C-major',	notes: ['C',  'D',  'E',  'F',  'G',  'A',  'B'], 	scale: 'major', accidental: 'sharp', 	minor: 'A-minor' },
  'G-major':	{ key: 'G-major',	notes: ['G',  'A',  'B',  'C',  'D',  'E',  'F#'], 	scale: 'major', accidental: 'sharp', 	minor: 'E-minor' },
  'D-major':	{ key: 'D-major',	notes: ['D',  'E',  'F#', 'G',  'A',  'B',  'C#'], 	scale: 'major', accidental: 'sharp', 	minor: 'B-minor' },
  'A-major':	{ key: 'A-major',	notes: ['A',  'B',  'C#', 'D',  'E',  'F#', 'G#'], 	scale: 'major', accidental: 'sharp', 	minor: 'F#-minor' },
  'E-major':	{ key: 'E-major',	notes: ['E',  'F#', 'G#', 'A',  'B',  'C#', 'D#'], 	scale: 'major', accidental: 'sharp', 	minor: 'C#-minor' },
  'B-major':	{ key: 'B-major',	notes: ['B',  'C#', 'D#', 'E',  'F#', 'G#', 'A#'], 	scale: 'major', accidental: 'sharp', 	minor: 'G#-minor' },
  'F#-major':	{ key: 'F#-major',	notes: ['F#', 'G#', 'A#', 'B',  'C#', 'D#', 'E#'], 	scale: 'major', accidental: 'sharp', 	minor: 'D#-minor' },
  'C#-major':	{ key: 'C#-major',	notes: ['C#', 'D#', 'E#', 'F#', 'G#', 'A#', 'B#'], 	scale: 'major', accidental: 'sharp', 	minor: 'A#-minor' },
  'F-major':	{ key: 'F-major',	notes: ['F',  'G',  'A',  'Bb', 'C',  'D',  'E'], 	scale: 'major', accidental: 'flat', 	minor: 'D-minor' },
  'Bb-major':	{ key: 'Bb-major',	notes: ['Bb', 'C',  'D',  'Eb', 'F',  'G',  'A'], 	scale: 'major', accidental: 'flat', 	minor: 'G-minor' },
  'Eb-major':	{ key: 'Eb-major',	notes: ['Eb', 'F',  'G',  'Ab', 'Bb', 'C',  'D'], 	scale: 'major', accidental: 'flat', 	minor: 'C-minor' },
  'Ab-major':	{ key: 'Ab-major',	notes: ['Ab', 'Bb', 'C',  'Db', 'Eb', 'F',  'G'], 	scale: 'major', accidental: 'flat', 	minor: 'F-minor' },
  'Db-major':	{ key: 'Db-major',	notes: ['Db', 'Eb', 'F',  'Gb', 'Ab', 'Bb', 'C'], 	scale: 'major', accidental: 'flat', 	minor: 'Bb-minor' },
  'Gb-major':	{ key: 'Gb-major',	notes: ['Gb', 'Ab', 'Bb', 'Cb', 'Db', 'Eb', 'F'], 	scale: 'major', accidental: 'flat', 	minor: 'Eb-minor' },
  'Cb-major':	{ key: 'Cb-major',	notes: ['Cb', 'Db', 'Eb', 'Fb', 'Gb', 'Ab', 'Bb'], 	scale: 'major', accidental: 'flat', 	minor: 'Ab-minor' },
  'A-minor':	{ key: 'A-minor',	notes: ['A',  'B',  'C',  'D',  'E',  'F',  'G'], 	scale: 'minor', accidental: 'sharp',	major: 'C-major' },
  'E-minor':	{ key: 'E-minor',	notes: ['E',  'F#', 'G',  'A',  'B',  'C',  'D'], 	scale: 'minor', accidental: 'sharp',	major: 'G-major' },
  'B-minor':	{ key: 'B-minor',	notes: ['B',  'C#', 'D',  'E',  'F#', 'G',  'A'], 	scale: 'minor', accidental: 'sharp',	major: 'D-major' },
  'F#-minor':	{ key: 'F#-minor',	notes: ['F#', 'G#', 'A',  'B',  'C#', 'D',  'E'], 	scale: 'minor', accidental: 'sharp',	major: 'A-major' },
  'C#-minor':	{ key: 'C#-minor',	notes: ['C#', 'D#', 'E',  'F#', 'G#', 'A',  'B'], 	scale: 'minor', accidental: 'sharp',	major: 'E-major' },
  'G#-minor':	{ key: 'G#-minor',	notes: ['G#', 'A#', 'B',  'C#', 'D#', 'E',  'F#'], 	scale: 'minor', accidental: 'sharp',	major: 'B-major' },
  'D#-minor':	{ key: 'D#-minor',	notes: ['D#', 'E#', 'F#', 'G#', 'A#', 'B',  'C#'], 	scale: 'minor', accidental: 'sharp',	major: 'F#-major' },
  'A#-minor':	{ key: 'A#-minor',	notes: ['A#', 'B#', 'C#', 'D#', 'E#', 'F#', 'G#'], 	scale: 'minor', accidental: 'sharp',	major: 'C#-major' },
  'D-minor':	{ key: 'D-minor',	notes: ['D',  'E',  'F',  'G',  'A',  'Bb', 'C'], 	scale: 'minor', accidental: 'flat',	major: 'F-major' },
  'G-minor':	{ key: 'G-minor',	notes: ['G',  'A',  'Bb', 'C',  'D',  'Eb', 'F'], 	scale: 'minor', accidental: 'flat',	major: 'Bb-major' },
  'C-minor':	{ key: 'C-minor',	notes: ['C',  'D',  'Eb', 'F',  'G',  'Ab', 'Bb'], 	scale: 'minor', accidental: 'flat',	major: 'Eb-major' },
  'F-minor':	{ key: 'F-minor',	notes: ['F',  'G',  'Ab', 'Bb', 'C',  'Db', 'Eb'], 	scale: 'minor', accidental: 'flat',	major: 'Ab-major' },
  'Bb-minor':	{ key: 'Bb-minor',	notes: ['Bb', 'C',  'Db', 'Eb', 'F',  'Gb', 'Ab'], 	scale: 'minor', accidental: 'flat',	major: 'Db-major' },
  'Eb-minor':	{ key: 'Eb-minor',	notes: ['Eb', 'F',  'Gb', 'Ab', 'Bb', 'Cb', 'Db'], 	scale: 'minor', accidental: 'flat',	major: 'Gb-major' },
  'Ab-minor':	{ key: 'Ab-minor',	notes: ['Ab', 'Bb', 'Cb', 'Db', 'Eb', 'Fb', 'Gb'], 	scale: 'minor', accidental: 'flat',	major: 'Cb-major' }
};

export const noteIndex = {
  Cb: 11,
  C: 0,
  "C#": 1,
  Db: 1,
  D: 2,
  "D#": 3,
  Eb: 3,
  E: 4,
  "E#": 5,
  Fb: 4,
  F: 5,
  "F#": 6,
  Gb: 6,
  G: 7,
  "G#": 8,
  Ab: 8,
  A: 9,
  "A#": 10,
  Bb: 10,
  B: 11,
  "B#": 0,
};

export function noteIsInKeySignature(note: Note, ks: KeySignature): boolean {
  for (const n of ks.notes) {
    if (noteIndex[note] === noteIndex[n]) {
      return true;
    }
  }
  return false;
}
