import { useEffect, useRef } from "react";

export function useSound(src: string) {
  const audioRef = useRef<HTMLAudioElement>(null);
  useEffect(() => {
    audioRef.current = new Audio(src);
  }, [src]);

  const play = () => {
    if (audioRef.current) {
      (audioRef.current.cloneNode() as HTMLAudioElement).play();
    }
  };
  return play;
}
