import { useRef } from "react";

function beep(
  ctx: AudioContext,
  durationMs: number,
  frequency: number,
  volume: number,
  type: "sine"
) {
  var oscillator = ctx.createOscillator();
  var gainNode = ctx.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);

  if (volume) {
    gainNode.gain.value = volume;
  }
  if (frequency) {
    oscillator.frequency.value = frequency;
  }
  if (type) {
    oscillator.type = type;
  }

  oscillator.start(ctx.currentTime);
  oscillator.stop(ctx.currentTime + (durationMs || 500) / 1000);
}

function noteToFreq(midi: number, tuning = 440) {
  return Math.pow(2, (midi - 69) / 12) * tuning;
}

export function useBeep() {
  const ctxRef = useRef(
    typeof window !== "undefined" ? new AudioContext() : null
  );

  return (durationMs: number, frequency: number) => {
    if (!ctxRef.current) {
      return () => null;
    }
    beep(ctxRef.current, durationMs, noteToFreq(frequency), 1, "sine");
  };
}
