import { useEffect, useRef } from "react";
import { map } from "~/util/map";
import { noteToFreq } from "../util/music";
import { useEngineSnapshot } from "./engine-provider";
import { useVisibilityChange } from "./use-visibility-change";

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
  const visible = useVisibilityChange();
  const state = useEngineSnapshot();

  const volume = state.volume;
  const speed = state.speed;
  const lastMove = state.movingTimestamp;
  const pressed = state.pressed;

  const player = useRef<Player>() as React.MutableRefObject<Player>;
  if (!player.current) {
    player.current = new Player();
  }

  useEffect(() => {
    // safari AudioContext permissions
    function fixAudioCtxState() {
      if (player.current.ctx.state === "suspended") {
        player.current.ctx.resume();
      }
    }
    window.addEventListener("touchstart", fixAudioCtxState);
    window.addEventListener("click", fixAudioCtxState);
  }, []);

  useEffect(() => {
    if (speed === 0) {
      player.current.setVolume(0);
    } else {
      player.current.setVolume(volume);
    }
  }, [speed, volume]);

  useEffect(() => {
    player.current.setVolume(volume);
    const stop = setTimeout(() => {
      if (speed === 0) {
        player.current.setVolume(0);
      }
    }, 400);
    return () => {
      clearTimeout(stop);
    };
  }, [lastMove, volume, speed]);

  useEffect(() => {
    player.current.setTones(pressed);
  }, [pressed]);

  useEffect(() => {
    if (visible) {
      player.current.ctx.resume();
    } else {
      player.current.ctx.suspend();
    }
  }, [visible]);
}

export class Player {
  ctx: AudioContext;
  playing: Map<number, [GainNode, OscillatorNode]>;
  gain: GainNode;
  compressor: DynamicsCompressorNode;
  constructor() {
    this.ctx = new AudioContext();
    this.playing = new Map();
    this.gain = this.ctx.createGain();
    this.gain.gain.value = 0.0;

    this.compressor = new DynamicsCompressorNode(this.ctx);
    this.compressor.connect(this.gain);
    this.gain.connect(this.ctx.destination);
  }

  setVolume(volume: number) {
    const fadeSeconds = 0.25;
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
    gainNode.connect(this.compressor);

    gainNode.gain.value = 0;
    let volume = midiNote.velocity * map(midiNote.midi, 22, 80, 1, 0.1, true);

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
