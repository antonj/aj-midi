import { useEffect, useRef } from "react";
import { Player } from "./use-song-sounds";
import type { Note } from "./use-song-sounds";
import { create } from "zustand";

export const useDevicesStore = create<{
  devices: Array<WebMidi.MIDIInput>;
  setDevices: (devices: Array<WebMidi.MIDIInput>) => void;
  state: "" | "requesting" | "fetched devices" | "no midi support";
  requestMIDIAccess: () => void;
  pressed: Map<number, Note>;
  setPressed: (pressed: Map<number, Note>) => void;
}>((set, get) => ({
  state: "",
  devices: [],
  setDevices: (devices) => set(() => ({ devices })),
  pressed: new Map<number, Note>(),
  setPressed: (pressed) => set(() => ({ pressed })),
  requestMIDIAccess: () => {
    const store = get();
    if (store.state !== "") {
      return;
    }
    if ("requestMIDIAccess" in navigator) {
      set(() => ({ state: "requesting" }));
      navigator
        .requestMIDIAccess()
        .then((access) => {
          console.log("access", access);
          // Get lists of available MIDI controllers
          const inputs = access.inputs.values();
          set(() => ({
            devices: Array.from(inputs),
            state: "fetched devices",
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
        });
    } else {
      set(() => ({ state: "no midi support" }));
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
  const d = devices[0];
  const player = useRef<Player>();
  const { pressed, setPressed } = useDevicesStore((state) => ({
    pressed: state.pressed,
    setPressed: state.setPressed,
  }));
  useEffect(() => {
    player.current = new Player();
    player.current.setVolume(1);
  }, []);

  useEffect(() => {
    if (!d) {
      return;
    }

    const notes = new Map<number, Note>();
    d.onmidimessage = (evt) => {
      console.log(evt.data);
      const [command, note, velocity] = evt.data;
      switch (command) {
        case 0x90:
          const velo = velocity / 0x7f;
          console.log("down", note, velo);
          notes.set(note, { midi: note, velocity: velo });
          player.current?.setTones(notes);
          break;
        case 0x80:
          console.log("up", note);
          notes.delete(note);
          player.current?.setTones(notes);
          break;
      }
      setPressed(new Map(notes));
    };
  }, [d, setPressed]);
  return pressed;
}
