import { useRef } from "react";

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
  // fade in
  gainNode.gain.setTargetAtTime(
    volume,
    ctx.currentTime,
    Math.min(0.1, (durationMs / 1000) * 0.1)
  );
  // fade out
  gainNode.gain.setTargetAtTime(0, ctx.currentTime + durationMs / 1000, 0.1);

  oscillator.frequency.value = frequency;

  if (type) {
    oscillator.type = type;
  }

  oscillator.start(ctx.currentTime);
  oscillator.stop(ctx.currentTime + durationMs / 1000);
}

function noteToFreq(midi: number, tuning = 440) {
  return Math.pow(2, (midi - 69) / 12) * tuning;
}

export function useBeep() {
  const ctxRef = useRef(
    typeof window !== "undefined" ? new AudioContext() : null
  );

  return (durationMs: number, frequency: number) => {
    const ctx = ctxRef.current;
    if (!ctx) {
      return () => null;
    }
    beep(ctx, durationMs, noteToFreq(frequency), 0.01, "sawtooth");
  };
}
