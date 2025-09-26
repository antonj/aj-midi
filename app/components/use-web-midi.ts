import { useEffect, useRef } from "react";
import { create } from "zustand";
import { useEngineSnapshot } from "./engine-provider";
import type { PressedNote } from "./midi-valtio";
import { Player } from "./use-song-sounds";

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
  inputs: Array<WebMidi.MIDIInput>;
  outputs: Array<WebMidi.MIDIOutput>;
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
  inputs: [],
  outputs: [],
  pressed: new Map<number, Note>(),
  setPressed: (pressed) => set({ pressed }),
  requestMIDIAccess: () => {
    const state = get().state.kind;
    if (state !== "" && state !== "error") {
      return;
    }
    if (!("requestMIDIAccess" in navigator)) {
      set({ state: { kind: "no midi support" } });
      return;
    }
    set({ state: { kind: "requesting" } });
    navigator
      .requestMIDIAccess()
      .then((access) => {
        console.log("access", access);
        // Get lists of available MIDI controllers
        const inputs = access.inputs.values();
        const outputs = access.outputs.values();
        set({
          inputs: Array.from(inputs),
          outputs: Array.from(outputs),
          state: { kind: "fetched devices" },
        });
        access.onstatechange = (event) => {
          console.log("onstatechange", event);
          const inputs = access.inputs.values();
          set({ inputs: Array.from(inputs) });
          // Print information about the (dis)connected MIDI controller
          console.log(
            event.port.name,
            event.port.manufacturer,
            event.port.state,
          );
        };
      })
      .catch((e) => {
        console.error("failed to get midi", e);
        set({ state: { kind: "error", error: e } });
      });
  },
}));

export function useWebMidiDevices() {
  const inputs = useDevicesStore((state) => state.inputs);
  const outputs = useDevicesStore((state) => state.outputs);
  const requestMIDIAccess = useDevicesStore((state) => state.requestMIDIAccess);
  useEffect(() => {
    requestMIDIAccess();
  }, [requestMIDIAccess]);
  return { inputs, outputs };
}

export function useMidiInput() {
  const { inputs } = useWebMidiDevices();
  const volume = useEngineSnapshot().volume;
  const d = inputs[0];
  const player = useRef<Player>();
  const pressed = useDevicesStore((state) => state.pressed);
  const setPressed = useDevicesStore((state) => state.setPressed);

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
    console.log("useMidiInput");
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

export function useMidiOutput() {
  const { outputs } = useDevicesStore();
  const o = outputs[0];
  const pressed = useEngineSnapshot().pressed;
  const prevPressed = useRef(new Map<string, PressedNote>());

  useEffect(() => {
    if (!o) {
      return;
    }

    // Check for notes that were released
    for (const [k, p] of prevPressed.current) {
      if (!pressed.has(k)) {
        // Note was released - send MIDI note off
        o.send([0x80, p.midi, 0]);
      }
    }
    // Check for new notes that were just pressed
    for (const [k, p] of pressed) {
      if (!prevPressed.current.has(k)) {
        // New note pressed - send MIDI note on
        const velocity = Math.floor(p.velocity * 127);
        o.send([0x90, p.midi, velocity]);
      }
    }

    // Update previous pressed state
    prevPressed.current = new Map(pressed);
  }, [o, pressed]);
}
