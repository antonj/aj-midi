import { useEffect, useRef } from "react";

export function useSound(src: string, ctx?: AudioContext) {
  const audioBuffer = useRef<AudioBuffer>();
  useEffect(() => {
    if (!ctx) {
      return;
    }
    fetch(src)
      .then((r) => r.arrayBuffer())
      .then((ab) => ctx.decodeAudioData(ab))
      .then((ad) => {
        audioBuffer.current = ad;
      });
  }, [ctx, src]);

  const play = () => {
    if (!audioBuffer.current || !ctx) {
      return;
    }
    const source = ctx.createBufferSource();
    source.buffer = audioBuffer.current;
    source.connect(ctx.destination);
    source.start();
  };
  return play;
}
