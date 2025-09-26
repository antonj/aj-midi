import { useCallback, useEffect, useRef } from "react";

export const useRequestAnimationFrame = (
  callback: FrameRequestCallback,
  onStateChange?: (state: "started" | "stopped") => void,
) => {
  const stopTimeout = 120;
  const stateRef = useRef<"started" | "stopped">("stopped");

  const requestRef = useRef<number>();
  const previousTimeRef = useRef<number>();
  const stateChangeRef = useRef(onStateChange);
  const stopTimeoutRef = useRef<number>();

  const callbackRef = useRef(callback);
  if (callback != callbackRef.current) {
    callbackRef.current = callback;
  }
  if (onStateChange != stateChangeRef.current) {
    stateChangeRef.current = onStateChange;
  }

  const stopRef = useRef(function stopRef() {
    if (stateRef.current === "started") {
      stateRef.current = "stopped";
      stateChangeRef.current?.("stopped");
    }
  });

  const animate: FrameRequestCallback = useCallback((time) => {
    if (stateRef.current === "stopped") {
      stateRef.current = "started";
      stateChangeRef.current?.("started");
    }
    window.clearTimeout(stopTimeoutRef.current);
    stopTimeoutRef.current = window.setTimeout(stopRef.current, stopTimeout);

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
