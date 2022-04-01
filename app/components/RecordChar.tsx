import { css } from "@emotion/css";
import { useRecording } from "./use-recording";
import { useEffect } from "react";
import { useAudioContext } from "./audio-context";

export function RecordChar({ char }: { char: string }) {
  const recorder = useRecording({ variant: "filereader" });
  const { state, dispatch } = useAudioContext();
  useEffect(() => {
    switch (recorder.state.state) {
      case "done": {
        dispatch({
          kind: "ADD",
          char: char.toUpperCase(),
          src: recorder.state.src,
        });
        break;
      }
    }
  }, [recorder.state, char, dispatch]);
  console.log("state", state);

  return (
    <span
      className={css`
        font-size: 1rem;
      `}
    >
      {recorder.state.state === "recording" ? (
        <button onClick={recorder.stop}>⏹</button>
      ) : recorder.state.state === "stop_requested" ? (
        <>stopping</>
      ) : state[char.toUpperCase()] != null ? (
        <>
          <audio src={state[char.toUpperCase()]} controls />
          <button
            onClick={() => {
              recorder.reset();
              dispatch({ kind: "DEL", char: char.toUpperCase() });
            }}
          >
            🔄
          </button>
        </>
      ) : recorder.state.state === "" ? (
        <button onClick={recorder.start}>⏺</button>
      ) : recorder.state.state === "done" ? (
        <>
          <audio src={recorder.state.src} controls />
          <button onClick={recorder.reset}>🔄</button>
        </>
      ) : null}
    </span>
  );
}
