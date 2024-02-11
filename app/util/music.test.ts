import { expect, test } from "@jest/globals";
import {
  KeySignature,
  Note,
  keySignatures,
  whiteIndexInKey,
  offsetBetweenNotes,
  whiteIndex,
} from "./music";

describe("index-in-key", () => {
  const cases: Array<[Note, Note, number]> = [
    ["C", "C", 0],
    ["C", "C#", 1],
    ["C", "D", 2],
    ["C", "D#", 3],
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

describe("white-index", () => {
  const cases: Array<[number, number, string]> = [
    [12, 0, "C in octave 0"],
    [24, 7, "C in octave 1"],
    [25, 7.5, "C# in octave 1"],
    [26, 8, "D in octave 1"],
  ];
  test.each(cases)("white-index %p is %p: %p", (from, expectedResult, desc) => {
    expect(whiteIndex(from)).toEqual(expectedResult);
  });
});

describe("note-index", () => {
  const cases: Array<[number, KeySignature, number]> = [
    [12, keySignatures["C-major"], 0], // C in octave 0
    [24, keySignatures["C-major"], 7], // C in octave 1
    [25, keySignatures["C-major"], 7.5], // C# in octave 1
    [26, keySignatures["C-major"], 8], // D in octave 1

    [12, keySignatures["E-major"], -0.5], // C in octave 0 is -0.5 since #C is in E-major so C is half a tone below the key signature note
    [13, keySignatures["E-major"], 0], // C# in octave 0 is 0
  ];
  test.each(cases)(
    "noteindex %p in key %p is %p",
    (from, ks, expectedResult) => {
      expect(whiteIndexInKey(from, ks)).toEqual(expectedResult);
    }
  );
});
