import { useEffect, useRef, useState } from "react";
import { Note, Player } from "./use-song-sounds";

export function useWebMidiDevices() {
  const [devices, setDevices] = useState<Array<WebMidi.MIDIInput>>([]);
  useEffect(() => {
    console.log(navigator);
    if ("requestMIDIAccess" in navigator) {
      navigator
        .requestMIDIAccess()
        .then((access) => {
          console.log("access", access);
          // Get lists of available MIDI controllers
          const inputs = access.inputs.values();
          setDevices(Array.from(inputs));

          access.onstatechange = (event) => {
            const inputs = access.inputs.values();
            setDevices(Array.from(inputs));
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
    }
  }, []);
  return devices;
}

export function useMidiInput() {
  const devices = useWebMidiDevices();
  const d = devices[0];
  const player = useRef<Player>();
  const [pressed, setPressed] = useState(new Map<number, Note>());
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
  }, [d]);
  return pressed;
}
