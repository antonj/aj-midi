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
  const storeRef = useRef<MidiEngine>();
  if (!storeRef.current) {
    storeRef.current = createMidiEngine(song);
  }

  const snap = useSnapshot(storeRef.current);
  const trackIndexs = snap.trackIndexs;
  useMemo<SongCtx>(
    function ctxMemo() {
      console.log("provider", song);
      let bpm = song.header.tempos[0]?.bpm || 120;

      const ticksPerBar = getTicksPerBar(song);
      const allPianoNotes = mergeNotes(song, "piano");
      const pianoNotes = mergeNotes(song, "piano", trackIndexs);
      const octaves = getOctaves(allPianoNotes);
      const tickConnections = new ParallelNotes(pianoNotes);

      storeRef.current!.bpm = bpm;
      storeRef.current!.ticksPerBar = ticksPerBar;
      storeRef.current!.pianoNotes = pianoNotes;
      storeRef.current!.octaves = octaves;
      storeRef.current!.tickConnections = tickConnections;

      return {
        song,
        bpm,
        ticksPerBar,
        tickConnections,
        pianoNotes,
        octaves,
      };
    },
    [song, trackIndexs]
  );

  useEffect(() => {
    storeRef.current?.start();
    return () => {
      storeRef.current?.stop();
    };
  }, [song]);

  return (
    <EngineContext.Provider value={storeRef.current}>
      {children}
    </EngineContext.Provider>
  );
}

export function useEnginge(): MidiEngine {
  const store = useContext(EngineContext);
  if (!store) throw new Error("Missing EngineProvider.Provider in the tree");
  return store;
}
