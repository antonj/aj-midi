import type { Note } from "@tonejs/midi/dist/Note";
import { floorTo } from "../util/map";

type ParallelKey = number;
export class ParallelNotes {
  notes: Map<
    ParallelKey, // time roundDown
    Note[] // <midi, note>
  >;
  constructor(notes: Note[]) {
    this.notes = new Map();
    for (const n of notes) {
      this.add(n);
    }
  }
  [Symbol.iterator]() {
    return this.notes[Symbol.iterator]();
  }
  getParallelKey(n: Note): ParallelKey {
    return floorTo(n.time, 0.01);
  }
  get(n: Note) {
    return this.notes.get(this.getParallelKey(n));
  }
  add(n: Note) {
    const arr = this.get(n) || [];
    arr.push(n);
    arr.sort((a, b) => a.midi - b.midi);
    this.notes.set(this.getParallelKey(n), arr);
    return arr;
  }
}
