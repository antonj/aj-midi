import { createContext, ReactNode, useContext, useMemo } from "react";
import { Midi } from "@tonejs/midi";
import { Note } from "@tonejs/midi/dist/Note";
import { SettingsInitial, SettingsProvider } from "./context-settings";
import { midiToOctave, toMidiTone } from "~/util/music";

export type SongCtx = {
  song: Midi;
  bpm: number;
  pianoNotes: Array<Note>;
  ticksPerBar: number;
  octaves: ReturnType<typeof getOctaves>;
  tickConnections: Map<
    { tick: number; midi: number },
    { tick: number; midi: number }
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
  merged = merged.filter(Boolean);
  console.log("merged", merged);

  merged.sort((a, b) => a.ticks - b.ticks);
  return merged;
}

function calcParallelNotes(notes: Note[]) {
  const result = new Map<
    { tick: number; midi: number },
    { tick: number; midi: number }
  >();
  const length = notes.length;
  for (let i = 0; i < length; i++) {
    const n = notes[i];
    // look 12 notes ahead
    for (let y = i + 1; y < i + 24 && y < length; y++) {
      const next = notes[y];
      const timeDiff = next.time - n.time;
      if (timeDiff < 0.01) {
        result.set(
          { tick: n.ticks, midi: n.midi },
          { tick: next.ticks, midi: next.midi }
        );
      }
    }
  }

  return result;
}

export function SongProvider({
  song,
  initialSettings,
  children,
}: {
  song: Midi;
  initialSettings: SettingsInitial;
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
      <SettingsProvider ctx={ctx} initalSettings={initialSettings}>
        {children}
      </SettingsProvider>
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
