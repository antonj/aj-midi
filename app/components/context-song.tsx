import { createContext, ReactNode, useContext, useMemo } from "react";
import { Midi } from "@tonejs/midi";
import { Note } from "@tonejs/midi/dist/Note";
import { SettingsProvider } from "./context-settings";
import { midiToOctave, toMidiTone } from "~/util/music";
import { floorTo } from "~/util/map";

export type SongCtx = {
  song: Midi;
  bpm: number;
  pianoNotes: Array<Note>;
  ticksPerBar: number;
  octaves: ReturnType<typeof getOctaves>;
  tickConnections: Map<
    number, // time roundDown
    Note[] // <midi, note>
  >;
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

function getParallelKey(n: Note) {
  return floorTo(n.time, 0.01);
}
function calcParallelNotes(notes: Note[]): Map<
  number, // time roundDown
  Note[] // <midi, note>
> {
  const result = new Map<
    number, // time roundDown
    Note[] // <midi, note>
  >();
  const parallel = new Map<
    number, // time roundDown
    Note[] // <midi, note>
  >();

  // Note -> [Note, Note, Note]
  for (const n of notes) {
    const t1 = getParallelKey(n);
    let r = result.get(t1);
    if (!r) {
      r = new Array<Note>();
      result.set(t1, r);
    }
    r.push(n);
    // sort to have lower midi tones first
    if (r.length > 1) {
      r.sort((a, b) => a.midi - b.midi);
    }
    if (r.length === 2) {
      parallel.set(t1, r);
    }
  }
  return parallel;
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
      console.log("provider memo");
      let bpm = song.header.tempos[0]?.bpm || 120;
      const ticksPerBar =
        song.header.timeSignatures[0].timeSignature[0] * song.header.ppq;
      const pianoNotes = getMergedPianoNotes(song);
      const octaves = getOctaves(pianoNotes);
      const tickConnections = calcParallelNotes(pianoNotes);

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
      <SettingsProvider ctx={ctx}>{children}</SettingsProvider>
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
