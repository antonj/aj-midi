export type Note = typeof notes[number];

export const notes = [
  "c",
  "c#",
  "d",
  "d#",
  "e",
  "f",
  "f#",
  "g",
  "g#",
  "a",
  "a#",
  "h",
] as const;

export const numNotesInOctave = notes.length;
export const numWhiteInOctate = notes.filter(isWhite).length;
export const numBlackInOctate = notes.filter(isBlack).length;

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

export function whiteIndexInOctave(index: number) {
  /*
   |   |x|  |x|   |   |x|  |x|  |x|   |
   |   1--  3-    |   6--  7-   10-   | <= index black keys
   |    |    |    |    |    |    |    |
   0-   2-   4-   5-   7-   9-  11-  | <= index white keys
   |====|====|====|====|====|====|====|
   0    1    2    3    4    5    6    | <= whiteIndex in octavae, black keys has same index as their right white key
   */
  switch (index) {
    case 0:
    case 1:
      return index;
    case 2:
    case 3:
      return index - 1;
    case 4:
    case 5:
    case 6:
      return index - 2;
    case 7:
    case 8:
      return index - 3;
    case 9:
    case 10:
      return index - 4;
    case 11:
      return index - 5;
    default:
      throw new Error("index out of bounds");
  }
}
