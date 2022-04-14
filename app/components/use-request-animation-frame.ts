import { useEffect, useRef } from "react";

export const useRequestAnimationFrame = (callback: FrameRequestCallback) => {
  const requestRef = useRef<number>();
  const previousTimeRef = useRef<number>();

  const animate: FrameRequestCallback = (time) => {
    if (previousTimeRef.current) {
      callback(time - previousTimeRef.current);
    }
    previousTimeRef.current = time;
    requestRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => {
      if (requestRef.current != null) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, []);
};
