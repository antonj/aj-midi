import { expect, test } from "@jest/globals";
import type { MidiNumber } from "./music";
import { detectChord } from "./music-chord";

describe("detectChord", () => {
  const cases: Array<[MidiNumber[], string | undefined]> = [
    // Major Chords (C Major in various inversions)
    [[60, 64, 67], "C"], // Root position (C - E - G)
    [[64, 67, 72], "C"], // First inversion (E - G - C)
    [[67, 72, 76], "C"], // Second inversion (G - C - E)
    [[67, 72, 76, 36, 28, 96], "C"], // Second inversion (G - C - E) With extra high and low octaves

    // Minor Chords (A Minor in various inversions)
    [[57, 60, 64], "Am"], // Root position (A - C - E)
    [[60, 64, 69], "Am"], // First inversion (C - E - A)
    [[64, 69, 72], "Am"], // Second inversion (E - A - C)

    // Major 7th Chords (C Major 7th in various inversions)
    [[60, 64, 67, 71], "CM7"], // Root position (C - E - G - B)
    [[64, 67, 71, 72], "CM7"], // First inversion (E - G - B - C)
    [[67, 71, 72, 76], "CM7"], // Second inversion (G - B - C - E)
    [[71, 72, 76, 79], "CM7"], // Third inversion (B - C - E - G)

    // Minor 7th Chords (A Minor 7th in various inversions)
    [[57, 60, 64, 67], "Am7"], // Root position (A - C - E - G)
    [[60, 64, 67, 69], "Am7"], // First inversion (C - E - G - A)
    [[64, 67, 69, 72], "Am7"], // Second inversion (E - G - A - C)
    [[67, 69, 72, 76], "Am7"], // Third inversion (G - A - C - E)

    // Dominant 7th Chords (G7 in various inversions)
    [[55, 59, 62, 65], "G7"], // Root position (G - B - D - F)
    [[59, 62, 65, 67], "G7"], // First inversion (B - D - F - G)
    [[62, 65, 67, 71], "G7"], // Second inversion (D - F - G - B)
    [[65, 67, 71, 74], "G7"], // Third inversion (F - G - B - D)

    [[], undefined], // too few notes
    [[65], undefined], // too few notes
    [[65, 67], undefined], // too few notes
  ];
  test.each(cases)("offset from %p is %p", (notes, expectedResult) => {
    expect(detectChord(notes)?.chord).toEqual(expectedResult);
  });
});
