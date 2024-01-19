import type { ReactNode } from "react";
import type { Midi } from "@tonejs/midi";
import type { Note } from "@tonejs/midi/dist/Note";
import { createContext, useContext, useMemo } from "react";
import { getTicksPerBar, midiToOctave, toMidiTone } from "~/util/music";
import { floorTo } from "~/util/map";
import { EngineProvider } from "./context-valtio";

export type SongCtx = {
  song: Midi;
  bpm: number;
  pianoNotes: Array<Note>;
  ticksPerBar: number;
  octaves: ReturnType<typeof getOctaves>;
  tickConnections: ParallelNotes;
};

const SongContext = createContext<SongCtx | null>(null);

function getOctaves(notes: { midi: number }[]) {
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

function getMergedPianoNotes(song: Midi) {
  const pianoTracks = song.tracks.filter(
    (t) => t.instrument.family === "piano"
  );
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

export function SongProvider({
  song,
  children,
}: {
  song: Midi;
  children: ReactNode;
}) {
  const ctx = useMemo<SongCtx>(
    function ctxMemo() {
      console.log("provider", song);
      let bpm = song.header.tempos[0]?.bpm || 120;

      const ticksPerBar = getTicksPerBar(song);
      const pianoNotes = getMergedPianoNotes(song);
      const octaves = getOctaves(pianoNotes);
      const tickConnections = new ParallelNotes(pianoNotes);

      return {
        song,
        bpm,
        ticksPerBar,
        tickConnections,
        pianoNotes,
        octaves,
      };
    },
    [song]
  );

  return (
    <SongContext.Provider value={ctx}>
      {/* <SettingsProvider ctx={ctx}>{children}</SettingsProvider> */}
      <EngineProvider ctx={ctx}>{children}</EngineProvider>
    </SongContext.Provider>
  );
}

export function useSongCtx() {
  const ctx = useContext(SongContext);
  if (!ctx) {
    throw new Error("context must be defined");
  }
  return ctx;
}
