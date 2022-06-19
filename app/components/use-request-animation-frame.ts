import { useCallback, useEffect, useRef } from "react";

export const useRequestAnimationFrame = (callback: FrameRequestCallback) => {
  const requestRef = useRef<number>();
  const previousTimeRef = useRef<number>();
  const callbackRef = useRef(callback);

  if (callback != callbackRef.current) {
    callbackRef.current = callback;
  }
  const animate: FrameRequestCallback = useCallback((time) => {
    if (previousTimeRef.current) {
      callbackRef.current(time - previousTimeRef.current);
    }
    previousTimeRef.current = time;
    requestRef.current = requestAnimationFrame(animate);
  }, []);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => {
      if (requestRef.current != null) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [animate]);
};
