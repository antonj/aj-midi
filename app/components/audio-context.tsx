import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useReducer,
} from "react";
import create from "zustand";
import { persist } from "zustand/middleware";
import { playDataURL } from "../util/useSound";
import { useChanged } from "./hooks";

const AudioContext = createContext<[State, React.Dispatch<Action>]>([
  {},
  () => {},
]);

export function AudioProvider(props: { children: ReactNode }) {
  const r = useReducer(reducer, {});
  return (
    <AudioContext.Provider value={r}>{props.children}</AudioContext.Provider>
  );
}

export function useAudioContext2() {
  return useContext(AudioContext);
}

type Action =
  | { kind: "ADD"; char: string; src: string }
  | { kind: "DEL"; char: string };

type State = Record<string, string>;

function reducer(state: State, action: Action) {
  switch (action.kind) {
    case "ADD": {
      return { ...state, [action.char]: action.src };
    }
    case "DEL": {
      const res = { ...state };
      delete res[action.char];
      return res;
    }
  }
}

export const useAudioContext = create<{
  state: State;
  dispatch: (action: Action) => void;
}>(
  persist(
    (set) => ({
      state: {},
      dispatch: (action: Action) =>
        set((s) => {
          return { state: reducer(s.state, action) };
        }),
    }),
    {
      name: "audio-store",
    }
  )
);

export function dataURItoBlob(dataURI: string) {
  // convert base64 to raw binary data held in a string
  // doesn't handle URLEncoded DataURIs - see SO answer #6850276 for code that does this
  var byteString = atob(dataURI.split(",")[1]);

  // separate out the mime component
  var mimeString = dataURI.split(",")[0].split(":")[1].split(";")[0];

  // write the bytes of the string to an ArrayBuffer
  var ab = new ArrayBuffer(byteString.length);

  // create a view into the buffer
  var ia = new Uint8Array(ab);

  // set the bytes of the buffer to the correct values
  for (var i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }

  // write the ArrayBuffer to a blob, and you're done
  var blob = new Blob([ab], { type: mimeString });
  return blob;
}

export function usePlaySavedSound(
  char: string,
  delay: number,
  ctx?: AudioContext
) {
  const charAudio = useAudioContext((s) => s.state);
  const charChanged = useChanged(char);
  useEffect(() => {
    if (!charChanged) {
      return;
    }
    let t: ReturnType<typeof setTimeout>;
    if (charAudio[char.toUpperCase()]) {
      t = setTimeout(() => {
        if (!ctx) {
          return;
        }
        playDataURL(charAudio[char.toUpperCase()], ctx);
      }, delay);
    }
    return () => {
      clearTimeout(t);
    };
  }, [charChanged, charAudio, char, ctx, delay]);
}
