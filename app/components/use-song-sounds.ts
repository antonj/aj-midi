import { useEffect, useRef } from "react";
import { noteToFreq } from "../util/music";
import { useSettings, useSongTicker } from "./use-song-context";

export type Note = {
  /**
   * The notes MIDI value.
   */
  midi: number;
  /**
   * The normalized velocity (0-1).
   */
  velocity: number;
};

export function useSongSound() {
  const player = useRef(new Player());
  const volume = useSettings((s) => s.volume);
  const speed = useSettings((s) => s.speed);

  useEffect(() => {
    if (speed === 0) {
      player.current.setVolume(0);
    } else {
      player.current.setVolume(volume);
    }
  }, [speed, volume]);

  useSongTicker((tick, ctx) => {
    const pressed = new Map<number, Note>();
    for (const n of ctx.song.tracks[0].notes ?? []) {
      // current
      if (tick > n.ticks && tick < n.ticks + n.durationTicks) {
        pressed.set(n.midi, n);
      }
    }
    player.current.setTones(pressed);
  });
}

export class Player {
  ctx: AudioContext;
  playing: Map<number, [GainNode, OscillatorNode]>;
  gain: GainNode;
  constructor() {
    this.ctx = new AudioContext();
    this.playing = new Map();
    this.gain = this.ctx.createGain();
    this.gain.gain.value = 0.8;
    this.gain.connect(this.ctx.destination);
  }

  setVolume(volume: number) {
    const fadeSeconds = 0.5;
    this.gain.gain.setTargetAtTime(volume, this.ctx.currentTime, fadeSeconds);
  }

  setTones(midiNotes: Map<number, Note>) {
    // diff, start stop current notes
    for (const [key, note] of midiNotes) {
      if (!this.playing.has(key)) {
        this.start(note);
      }
    }
    for (const [note, [gain, osc]] of this.playing.entries()) {
      if (!midiNotes.has(note)) {
        this.stop(note, gain, osc);
      }
    }
  }

  private start(midiNote: Note) {
    if (this.playing.has(midiNote.midi)) {
      return;
    }
    var oscillator = this.ctx.createOscillator();
    var gainNode = this.ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(this.gain);

    gainNode.gain.value = 0;
    let volume = midiNote.velocity;

    const fadeTimeSeconds = 0.05;
    const startSeconds = this.ctx.currentTime;
    // fade in
    gainNode.gain.setTargetAtTime(volume, startSeconds, fadeTimeSeconds);
    oscillator.frequency.value = noteToFreq(midiNote.midi);
    // oscillator.type = "sine";
    // oscillator.type = "square";
    // oscillator.type = "sawtooth";
    oscillator.type = "triangle";
    oscillator.start();
    this.playing.set(midiNote.midi, [gainNode, oscillator]);
  }
  private stop(midiNote: number, node: GainNode, osc: OscillatorNode) {
    this.playing.delete(midiNote);
    // fade out
    const fadeSeconds = 0.05;
    node.gain.setTargetAtTime(0, this.ctx.currentTime, fadeSeconds);
    // stop oscillator
    osc.stop(this.ctx.currentTime + fadeSeconds);
    osc.onended = () => {
      node.disconnect();
    };
  }
}
