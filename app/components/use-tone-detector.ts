import { Midi } from "@tonejs/midi";
import { useEffect, useRef, useState } from "react";
import { PianoMessageData } from "../../public/audio-worklet";
import { useOctaves } from "./use-song-context";

export function useToneDetector(song: Midi) {
  const detector = useRef<SoundDetector>();
  const o = useOctaves(song);
  const [connected, setConnected] = useState(false);
  const [tones, setTones] = useState<Array<number>>([]);
  useEffect(() => {
    detector.current = new SoundDetector((data) => {
      let a: number[] = [];
      for (let i = 0; i < data.length; i++) {
        if (data[i] > 0.3) {
          a.push(i);
        }
      }
      a = a.sort((a, b) => data[a] - data[b]);
      setTones((prev) => {
        if (prev.length != a.length) {
          return a;
        }
        for (let i = 0; i < a.length; i++) {
          if (a[i] !== prev[i]) {
            return a;
          }
        }
        return prev;
      });
    });
    detector.current.connect().then(() => {
      setConnected(true);
    });
  }, [o]);

  useEffect(() => {
    if (!connected) {
      return;
    }

    console.log(o.min, o.max);
    console.log(o.max - o.min);
    detector.current?.sendMessage({
      kind: "tuning",
      keysNum: o.max - o.min + 1,
      pitchFork: 440,
      referenceKey: 69 - o.min, // A4 midi 69, index of 69 from 0
    });
  }, [o, connected]);
  return tones.map((i) => {
    // map index to midi tone
    return i + o.min;
  });
}

class SoundDetector {
  ctx: AudioContext;
  levels: Float32Array;
  pianolizer?: AudioWorkletNode;
  initWorklet: Promise<void>;

  constructor(listener: (d: Float32Array) => void) {
    this.ctx = new AudioContext();
    this.levels = new Float32Array(61);
    const fetchText = (url: string) =>
      fetch(url).then((response) => response.text());
    this.initWorklet = fetchText("/audio-worklet.js")
      .then((src) => {
        const blob = new Blob([src], { type: "application/javascript" });
        return this.ctx.audioWorklet.addModule(URL.createObjectURL(blob));
      })
      .then(() => {
        this.pianolizer = new AudioWorkletNode(this.ctx, "audio-worklet");
        this.pianolizer.port.onmessage = (event: { data: Float32Array }) => {
          // TODO: use SharedArrayBuffer for syncing levels
          listener(event.data);
        };
      });
  }

  sendMessage(msg: PianoMessageData) {
    this.pianolizer?.port.postMessage(msg);
  }

  async connect() {
    await this.initWorklet;

    await navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((stream) => {
        if (!this.pianolizer) {
          console.warn("not initialized");
          return;
        }
        let src = this.ctx.createMediaStreamSource(stream);
        src.connect(this.pianolizer);
      })
      .catch((error) => window.alert("Audio input access denied: " + error));
  }

  // audioSource.connect(audioContext.destination);
  // pianolizer.parameters.get("smooth").value = parseFloat(
  //   smoothingInput.value
  // );
  // pianolizer.parameters.get("threshold").value = parseFloat(
  //   thresholdInput.value
  // );
}
