import { expect, test } from "@jest/globals";
import { KeySignature, Note, keySignatures } from "./key-signature";
import {
  noteInKeySignature,
  offsetBetweenNotes,
  whiteIndex,
  whiteIndexInKey,
} from "./music";

describe("offsetBetweenNotes", () => {
  const cases: Array<[Note, Note, number]> = [
    ["C", "C", 0],
    ["C", "C#", 1],
    ["C", "D", 2],
    ["C", "D#", 3],
    ["C", "E", 4],
    ["C", "B", 11],
    ["A", "C", 3],
    ["C#", "A#", 9],
    ["C#", "B", 10],
    ["C#", "C", 11],
  ];
  test.each(cases)("offset from %p to %p is %p", (from, to, expectedResult) => {
    expect(offsetBetweenNotes(from, to)).toEqual(expectedResult);
  });
});

describe("whiteIndex", () => {
  const cases: Array<[number, number, string]> = [
    [12, 0, "C in octave 0"],
    [24, 7, "C in octave 1"],
    [25, 7.5, "C# in octave 1"],
    [26, 8, "D in octave 1"],
  ];
  test.each(cases)("whiteIndex %p is %p: %p", (from, expectedResult, desc) => {
    expect(whiteIndex(from)).toEqual(expectedResult);
  });
});

describe("whiteIndexInKey", () => {
  const cases: Array<[number, KeySignature, number]> = [
    [12, keySignatures["C-major"], 0], // C in octave 0
    [24, keySignatures["C-major"], 7], // C in octave 1
    [25, keySignatures["C-major"], 7.5], // C# in octave 1
    [26, keySignatures["C-major"], 8], // D in octave 1

    [12, keySignatures["E-major"], -0.5], // C in octave 0 is -0.5 since #C is in E-major so C is half a tone below the key signature note
    [13, keySignatures["E-major"], 0], // C# in octave 0 is 0

    // G, A, B, C, D, E, F♯
    [12, keySignatures["G-major"], 0], // C in octave 0 is 0
    [14, keySignatures["G-major"], 1], // D in octave 0 is 1
    [16, keySignatures["G-major"], 2], // E in octave 0 is 2
    [17, keySignatures["G-major"], 2.5], // F in octave 0 is 2.5
    [18, keySignatures["G-major"], 3], // F# in octave 0 is 3
    [19, keySignatures["G-major"], 4], // G in octave 0 is 4
    [20, keySignatures["G-major"], 4.5], // G# in octave 0 is 4.5
    [21, keySignatures["G-major"], 5], // A in octave 0 is 5
    [22, keySignatures["G-major"], 5.5], // A# in octave 0 is 5.5
    [23, keySignatures["G-major"], 6], // B in octave 0 is 6

    // E, F♯,G, A, B, C, D
    [12, keySignatures["E-minor"], 0], // C in octave 0 is 0
    [14, keySignatures["E-minor"], 1], // D in octave 0 is 1
    [16, keySignatures["E-minor"], 2], // E in octave 0 is 2
    [17, keySignatures["E-minor"], 2.5], // F in octave 0 is 2.5
    [18, keySignatures["E-minor"], 3], // F# in octave 0 is 3
    [19, keySignatures["E-minor"], 4], // G in octave 0 is 4
    [20, keySignatures["E-minor"], 4.5], // G# in octave 0 is 4.5
    [21, keySignatures["E-minor"], 5], // A in octave 0 is 5
    [22, keySignatures["E-minor"], 5.5], // A# in octave 0 is 5.5
    [23, keySignatures["E-minor"], 6], // B in octave 0 is 6

    // B♭, C, D, E♭, F, G, A
    [12, keySignatures["Bb-major"], 0], // C in octave 0 is 0
    [13, keySignatures["Bb-major"], 0.5], // C♯ in octave 0 is 0.5
    [14, keySignatures["Bb-major"], 1], // D in octave 0 is 1
    [15, keySignatures["Bb-major"], 2], // E♭ or D♯ in octave 0 is 2
    [16, keySignatures["Bb-major"], 2.5], // E in octave 0
    [17, keySignatures["Bb-major"], 3], // F in octave 0
    [18, keySignatures["Bb-major"], 3.5], // F# in octave 0
    [19, keySignatures["Bb-major"], 4], // G in octave 0
    [20, keySignatures["Bb-major"], 4.5], // G# in octave 0
    [21, keySignatures["Bb-major"], 5], // A in octave 0
    [22, keySignatures["Bb-major"], 6], // A#,Bb in octave 0
    [23, keySignatures["Bb-major"], 6.5], // B in octave 0

    //F, G, A, B♭, C, D, E
    [12, keySignatures["F-major"], 0], // C in octave 0
    [14, keySignatures["F-major"], 1], // D in octave 0
    [16, keySignatures["F-major"], 2], // E in octave 0
    [17, keySignatures["F-major"], 3], // F in octave 0
    [18, keySignatures["F-major"], 3.5], // F# in octave 0
    [19, keySignatures["F-major"], 4], // G in octave 0
    [20, keySignatures["F-major"], 4.5], // G# in octave 0
    [21, keySignatures["F-major"], 5], // A in octave 0
    [22, keySignatures["F-major"], 6], // A#,Bb in octave 0
    [23, keySignatures["F-major"], 6.5], // B in octave 0

    // D, E,F, G, A, B♭, C,
    [12, keySignatures["D-minor"], 0], // C in octave 0
    [14, keySignatures["D-minor"], 1], // D in octave 0
    [16, keySignatures["D-minor"], 2], // E in octave 0
    [17, keySignatures["D-minor"], 3], // F in octave 0
    [18, keySignatures["D-minor"], 3.5], // F# in octave 0
    [19, keySignatures["D-minor"], 4], // G in octave 0
    [20, keySignatures["D-minor"], 4.5], // G# in octave 0
    [21, keySignatures["D-minor"], 5], // A in octave 0
    [22, keySignatures["D-minor"], 6], // A#,Bb in octave 0
    [23, keySignatures["D-minor"], 6.5], // B in octave 0
    [24, keySignatures["D-minor"], 7], // C in octave 1
  ];
  test.each(cases)(
    "whiteIndexInKey %p in key %o is %p",
    (from, ks, expectedResult) => {
      expect(whiteIndexInKey(from, ks)).toEqual(expectedResult);
    }
  );
});

describe("noteInKeySignature", () => {
  const cases: Array<[Note, KeySignature, boolean]> = [
    ["Bb", keySignatures["Bb-major"], true],
    ["A#", keySignatures["Bb-major"], true],
    ["C", keySignatures["C-major"], true],
    ["C#", keySignatures["C-major"], false],
  ];
  test.each(cases)(
    "noteInKeySignature %p in key %p is %p",
    (n, ks, expectedResult) => {
      expect(noteInKeySignature(n, ks)).toEqual(expectedResult);
    }
  );
});
