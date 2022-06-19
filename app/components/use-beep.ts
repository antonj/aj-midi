import { useEffect, useRef } from "react";

function isValidNumber(x: number) {
  if (x === 0) {
    return false;
  }
  if (!isFinite(x)) {
    return false;
  }
  return true;
}

function beep(
  ctx: AudioContext,
  durationMs: number,
  frequency: number,
  volume: number,
  type: OscillatorType = "sine"
) {
  if (
    !isValidNumber(durationMs) ||
    !isValidNumber(durationMs) ||
    !isValidNumber(frequency)
  ) {
    return;
  }

  var oscillator = ctx.createOscillator();
  var gainNode = ctx.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);

  gainNode.gain.value = 0;
  if (!volume) {
    volume = 0.8;
  }
  if (!durationMs) {
    durationMs = 500;
  }

  const fadeTimeSeconds = 0.05;
  const startSeconds = ctx.currentTime;
  const endSeconds = ctx.currentTime + durationMs / 1000;
  // fade in
  gainNode.gain.setTargetAtTime(volume, startSeconds, fadeTimeSeconds);
  // fade out
  gainNode.gain.setTargetAtTime(
    0,
    endSeconds - fadeTimeSeconds,
    fadeTimeSeconds
  );

  oscillator.frequency.value = frequency;

  if (type) {
    oscillator.type = type;
  }

  oscillator.start(ctx.currentTime);
  oscillator.stop(endSeconds);
  oscillator.onended = () => {
    gainNode.disconnect();
  };
  return gainNode;
}

export function noteToFreq(midi: number, tuning = 440) {
  return Math.pow(2, (midi - 69) / 12) * tuning;
}

export function useBeep() {
  const ctxRef = useRef<AudioContext>();
  if (!ctxRef.current) {
    ctxRef.current =
      typeof window !== "undefined" ? new AudioContext() : undefined;
  }
  return (durationMs: number, midiNote: number) => {
    const ctx = ctxRef.current;
    if (!ctx) {
      return () => null;
    }
    beep(ctx, durationMs, noteToFreq(midiNote), 0.01, "sawtooth");
  };
}
