import { useEffect } from "react";
import { useSettings } from "./context-settings";
import { useSongCtx } from "./context-song";
import { useMidiInput } from "./use-web-midi";

export function usePlayContext() {
  // const repeatBars = useSettings((state) => state.repeatBars);
  // const tickStart = useSettings((state) => state.tickStart);
  // const ctx = useSongCtx();
  // const pressed = useMidiInput();
  // const startBar = Math.floor(tickStart / ctx.ticksPerBar);
  // useEffect(() => {
  //   // store what we should play
  //   // from start to repeatBars
  //   console.log("pressed change detected");
  // }, [repeatBars, ctx.pianoNotes, startBar, pressed]);
  // // pressed, playnotes
  // useEffect(() => {
  //   // check if we played the things we should play
  // }, [pressed]);
}
