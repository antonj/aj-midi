import { useEffect, useRef } from "react";
import { Player } from "./use-song-sounds";
import { create } from "zustand";
import { useEngineSnapshot } from "./engine-provider";

export type Note = {
  /**
   * The notes MIDI value.
   */
  midi: number;
  /**
   * The normalized velocity (0-1).
   */
  velocity: number;
  time: number;
};

export const useDevicesStore = create<{
  devices: Array<WebMidi.MIDIInput>;
  setDevices: (devices: Array<WebMidi.MIDIInput>) => void;
  state:
    | { kind: "" }
    | { kind: "requesting" }
    | { kind: "fetched devices" }
    | { kind: "no midi support" }
    | { kind: "error"; error: Error };
  requestMIDIAccess: () => void;
  pressed: Map<number, Note>;
  setPressed: (pressed: Map<number, Note>) => void;
}>((set, get) => ({
  state: { kind: "" },
  devices: [],
  setDevices: (devices) => set(() => ({ devices })),
  pressed: new Map<number, Note>(),
  setPressed: (pressed) => set(() => ({ pressed })),
  requestMIDIAccess: () => {
    const store = get();
    if (store.state.kind !== "") {
      return;
    }
    if ("requestMIDIAccess" in navigator) {
      set(() => ({ state: { kind: "requesting" } }));
      navigator
        .requestMIDIAccess()
        .then((access) => {
          console.log("access", access);
          // Get lists of available MIDI controllers
          const inputs = access.inputs.values();
          set(() => ({
            devices: Array.from(inputs),
            state: { kind: "fetched devices" },
          }));
          access.onstatechange = (event) => {
            console.log("onstatechange", event);
            const inputs = access.inputs.values();
            set(() => ({ devices: Array.from(inputs) }));
            // Print information about the (dis)connected MIDI controller
            console.log(
              event.port.name,
              event.port.manufacturer,
              event.port.state
            );
          };
        })
        .catch((e) => {
          console.error("failed to get midi", e);
          set(() => ({ state: { kind: "error", error: e } }));
        });
    } else {
      set(() => ({ state: { kind: "no midi support" } }));
    }
  },
}));

export function useWebMidiDevices() {
  const { devices, requestMIDIAccess } = useDevicesStore();
  useEffect(() => {
    requestMIDIAccess();
  }, [requestMIDIAccess]);
  return devices;
}

export function useMidiInput() {
  const devices = useWebMidiDevices();
  const volume = useEngineSnapshot().volume;
  const d = devices[0];
  const player = useRef<Player>();
  const { pressed, setPressed } = useDevicesStore((state) => ({
    pressed: state.pressed,
    setPressed: state.setPressed,
  }));
  useEffect(() => {
    player.current = new Player();
  }, []);

  useEffect(() => {
    player.current?.setVolume(volume);
  }, [volume]);

  useEffect(() => {
    if (!d) {
      return;
    }

    const notes = new Map<number, Note>();
    d.onmidimessage = (evt) => {
      const [command, note, velocity] = evt.data;
      switch (command) {
        case 0x90:
          const velo = velocity / 0x7f;
          notes.set(note, { midi: note, velocity: velo, time: Date.now() });
          player.current?.setTones(notes);
          break;
        case 0x80:
          notes.delete(note);
          player.current?.setTones(notes);
          break;
      }
      setPressed(new Map(notes));
    };
  }, [d, setPressed]);
  return [d, pressed] as const;
}
