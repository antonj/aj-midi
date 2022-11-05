import { createContext, ReactNode, useContext, useMemo } from "react";
import { Midi } from "@tonejs/midi";
import { Note } from "@tonejs/midi/dist/Note";
import { getOctaves } from "./use-octaves";
import { SettingsInitial, SettingsProvider } from "./context-settings";

export type SongCtx = {
  song: Midi;
  bpm: number;
  pianoNotes: Array<Note>;
  ticksPerBar: number;
  octaves: Array<number>;
  tickConnections: Map<
    { tick: number; midi: number },
    { tick: number; midi: number }
  >;
};

const SongContext = createContext<SongCtx | null>(null);

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

export function SongProvider({
  song,
  initialSettings,
  children,
}: {
  song: Midi;
  initialSettings: SettingsInitial;
  children: ReactNode;
}) {
  const pianoNotes = useMemo(() => getMergedPianoNotes(song), [song]);
  console.log("provider");

  const tickConnections = useMemo(
    function calcParallelNotes() {
      const result = new Map<
        { tick: number; midi: number },
        { tick: number; midi: number }
      >();
      const length = pianoNotes.length;
      for (let i = 0; i < length; i++) {
        const n = pianoNotes[i];
        // look 12 notes ahead
        for (let y = i + 1; y < i + 24 && y < length; y++) {
          const next = pianoNotes[y];
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
    },
    [pianoNotes]
  );

  const ctx = useMemo<SongCtx>(
    function ctxMemo() {
      let bpm = song.header.tempos[0]?.bpm || 120;
      const ticksPerBar =
        song.header.timeSignatures[0].timeSignature[0] * song.header.ppq;

      const octaves = getOctaves(song);

      return {
        song,
        bpm,
        ticksPerBar,
        tickConnections,
        pianoNotes,
        octaves: octaves.octaves,
      };
    },
    [song, pianoNotes, tickConnections]
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
