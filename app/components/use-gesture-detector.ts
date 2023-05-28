import { useEffect, useRef } from "react";
import { GestureDetector } from "../util/gesture-detector";
import type { GestureEvent } from "../util/gesture-detector";

export function useGestureDetector(
  el: HTMLElement | null,
  cb: (ev: GestureEvent) => void
) {
  const callbackRef = useRef(cb);
  if (cb != callbackRef.current) {
    callbackRef.current = cb;
  }
  useEffect(() => {
    if (!el) {
      return;
    }
    const prevDef = (ev: TouchEvent) => ev.preventDefault();
    el.addEventListener("touchstart", prevDef); // prevent ios doubleclick magnifier glass
    const gd = new GestureDetector(el, (ev) => {
      callbackRef.current(ev);
    }).attach();
    return () => {
      el.removeEventListener("touchstart", prevDef);
      gd.deattach();
    };
  }, [el]);
}
