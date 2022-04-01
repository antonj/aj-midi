import { useEffect, useRef } from "react";
import { dataURItoBlob } from "../components/audio-context";

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

export async function playDataURL(dataURL: string, ctx: AudioContext) {
  console.log("playDataURL", dataURL);
  const source = ctx.createBufferSource();
  const blob = dataURItoBlob(dataURL);
  source.buffer = await ctx.decodeAudioData(await blob.arrayBuffer());
  source.connect(ctx.destination);
  source.start();
}
