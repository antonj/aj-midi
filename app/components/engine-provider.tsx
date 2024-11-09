import { createContext, useContext, useEffect, useMemo, useRef } from "react";
import type { ReactNode } from "react";
import type { Midi } from "@tonejs/midi";
import type { Note } from "@tonejs/midi/dist/Note";
import { createMidiEngine, MidiEngine } from "./midi-valtio";
import { getOctaves, getTicksPerBar, mergeNotes } from "../util/music";
import { ParallelNotes } from "./parallel-notes";
import { useSnapshot } from "valtio";

export type SongCtx = {
  song: Midi;
  bpm: number;
  pianoNotes: Array<Note>;
  ticksPerBar: number;
  octaves: ReturnType<typeof getOctaves>;
  tickConnections: ParallelNotes;
};

const EngineContext = createContext<MidiEngine | null>(null);

export function EngineProvider({
  children,
  song,
}: {
  children: ReactNode;
  song: Midi;
}) {
  const store = useMemo(() => {
    console.log("createMidiEngine", song);
    return createMidiEngine(song);
  }, [song]);

  const snap = useSnapshot(store);
  const trackIndex = snap.trackIndex;
  useMemo(
    function ctxMemo() {
      console.log("provider", song);
      let bpm = song.header.tempos[0]?.bpm || 120;

      const ticksPerBar = getTicksPerBar(song);
      const allPianoNotes = mergeNotes(store.tracks);
      const pianoNotes = mergeNotes(store.tracks, trackIndex);
      const octaves = getOctaves(allPianoNotes);
      const tickConnections = new ParallelNotes(pianoNotes);

      store.bpm = bpm;
      store.ticksPerBar = ticksPerBar;
      store.pianoNotes = pianoNotes;
      store.octaves = octaves;
      store.tickConnections = tickConnections;
    },
    [store, trackIndex]
  );

  useEffect(() => {
    console.log("starts", store);
    store.start();
    return () => {
      console.log("stop", store);
      store.stop();
    };
  }, [store]);

  return (
    <EngineContext.Provider value={store}>{children}</EngineContext.Provider>
  );
}

export function useEnginge(): MidiEngine {
  const store = useContext(EngineContext);
  if (!store) throw new Error("Missing EngineProvider.Provider in the tree");
  return store;
}
