import { expect, test } from "@jest/globals";
import { Note, offsetBetweenNotes } from "./music";

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
