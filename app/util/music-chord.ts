import type { Note } from "./key-signature";
import { type MidiNumber, midiToNote, offsetBetweenNotes } from "./music";

// Seminote interval patterns based on the root note
const patterns = [
  { pattern: [4, 7], name: { short: "", long: "maj" } },
  { pattern: [3, 7], name: { short: "m", long: "min" } },
  { pattern: [4, 7, 11], name: { short: "M7", long: "maj7" } },
  { pattern: [3, 7, 10], name: { short: "m7", long: "min7" } },
  { pattern: [4, 7, 10], name: { short: "7", long: "majm7" } },
];

/**
 * Ex for chord C, in clean root position form midi notes:
 * [60, 64, 67] = [C,E,G]
 * would generate distances in semitones to each of the other notes
 * for each of the possible root notes [C,E,G]:
 * C = [4,7]
 * E = [5,8]
 * G = [5,9]
 * Result is always sorted lowest -> highest.
 * Combinations of the same notes [C,E,G] ex:
 * [67, 72, 76, 36, 28, 96]
 * would generate the same intervals
 */
function generateIntervals(
  notes: MidiNumber[],
): Array<{ root: Note; interval: number[] }> {
  // convert to normalized note strings and remove duplicates
  const norm = Array.from(new Set<Note>(notes.map((n) => midiToNote(n))));

  let result = [];
  for (const root of norm) {
    let interval = [];
    for (const other of norm) {
      if (root === other) continue;
      interval.push(offsetBetweenNotes(root, other));
    }
    interval.sort((a, b) => a - b);
    result.push({ root, interval });
  }

  return result;
}

// Check if intervals match
function isMatchingChord(intervals: number[], chordPattern: number[]): boolean {
  if (intervals.length !== chordPattern.length) return false;
  for (let i = 0; i < chordPattern.length; i++) {
    if (intervals[i] !== chordPattern[i]) {
      return false;
    }
  }
  return true;
}

// Detect chord based on intervals from the root notes
export function detectChord(midiNotes: MidiNumber[]) {
  if (midiNotes.length < 3) return null;

  const chordIntervalCombinations = generateIntervals(midiNotes);
  for (const interval of chordIntervalCombinations) {
    if (interval.interval[0] !== 3 && interval.interval[0] !== 4) continue; // first interval must be either 3 or 4 to match a pattern
    for (const p of patterns) {
      if (isMatchingChord(interval.interval, p.pattern)) {
        const root = interval.root;
        const chord = p.name.short;
        return { chord: root + chord, root, pattern: p };
      }
    }
  }
  return null;
}
