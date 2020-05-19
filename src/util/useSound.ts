import { useEffect, useRef } from "react";

export function useSound(src: string) {
  const audioRef = useRef<HTMLAudioElement>(null);
  useEffect(() => {
    audioRef.current = new Audio();
    // prevent clone from redownload by using blob
    fetch(src)
      .then((r) => r.blob())
      .then((blob) => (audioRef.current.src = URL.createObjectURL(blob)));
  }, [src]);

  const play = () => {
    if (audioRef.current) {
      (audioRef.current.cloneNode() as HTMLAudioElement).play();
    }
  };
  return play;
}
