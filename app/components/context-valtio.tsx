import { createContext, useContext, useEffect, useRef } from "react";
import type { ReactNode } from "react";
import type { SongCtx } from "./context-song";
import { createMidiEngine, MidiEngine } from "./midi-valtio";

const EngineContext = createContext<MidiEngine | null>(null);

export function EngineProvider({
  children,
  ctx,
}: {
  children: ReactNode;
  ctx: SongCtx;
}) {
  const storeRef = useRef<MidiEngine>();
  if (!storeRef.current) {
    storeRef.current = createMidiEngine(ctx);
  }

  useEffect(() => {
    storeRef.current?.start();
    return () => {
      storeRef.current?.stop();
    };
  }, [ctx]);
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
