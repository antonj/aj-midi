import { useEffect, useRef, useState } from "react";
import { PianoMessageData } from "../../public/audio-worklet";
import { useEngineSnapshot } from "./engine-provider";

export function useToneDetector(on: boolean) {
  const detector = useRef<SoundDetector>();
  const octaves = useEngineSnapshot().octaves;
  const [connected, setConnected] = useState(false);
  const [tones, setTones] = useState<Array<number>>([]);
  useEffect(() => {
    if (!on) {
      return;
    }
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
    return () => {
      detector.current?.disconnect();
      detector.current = undefined;
    };
  }, [octaves, on]);

  useEffect(() => {
    if (!connected) {
      return;
    }

    detector.current?.sendMessage({
      kind: "tuning",
      keysNum: octaves.max - octaves.min + 1,
      pitchFork: 440,
      referenceKey: 69 - octaves.min, // A4 midi 69, index of 69 from 0
    });
  }, [octaves.max, octaves.min, connected]);
  return tones.map((i) => {
    // map index to midi tone
    return i + octaves.min;
  });
}

class SoundDetector {
  ctx: AudioContext;
  pianolizer?: AudioWorkletNode;
  initWorklet: Promise<void>;
  src?: MediaStreamAudioSourceNode;
  micStream?: MediaStream;
  stopped: boolean;

  constructor(listener: (d: Float32Array) => void) {
    this.ctx = new AudioContext();
    this.stopped = false;
    this.initWorklet = fetch("/audio-worklet.js")
      .then((r) => r.text())
      .then((src) => {
        const blob = new Blob([src], { type: "application/javascript" });
        return this.ctx.audioWorklet.addModule(URL.createObjectURL(blob));
      })
      .then(() => {
        this.pianolizer = new AudioWorkletNode(this.ctx, "audio-worklet");
        console.log("hello worklet");
        this.pianolizer.port.onmessage = (event: { data: Float32Array }) => {
          // TODO: use SharedArrayBuffer for syncing levels
          console.log("hello");
          listener(event.data);
        };
      });
  }

  sendMessage(msg: PianoMessageData) {
    this.pianolizer?.port.postMessage(msg);
  }

  disconnect() {
    console.log("disconnect");
    this.stopped = true;
    this.micStream?.getTracks().forEach((t) => {
      t.stop();
      console.log("stop track", t);
    });
    this.src?.disconnect();
    this.pianolizer?.disconnect();
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
        if (this.stopped) {
          this.disconnect();
        }
        this.micStream = stream;
        this.src = this.ctx.createMediaStreamSource(stream);
        this.src.connect(this.pianolizer);
      })
      .catch((error) => window.alert("Audio input access denied: " + error));
  }

  // pianolizer.parameters.get("smooth").value = parseFloat(
  //   smoothingInput.value
  // );
  // pianolizer.parameters.get("threshold").value = parseFloat(
  //   thresholdInput.value
  // );
}
