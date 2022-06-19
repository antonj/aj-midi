import { useEffect, useRef, useState } from "react";

export function useBoundingClientRect<T extends HTMLElement>() {
  const wrapperRef = useRef<T | null>(null);
  const [rect, setRect] = useState({
    width: 0,
    height: 0,
    x: 0,
    y: 0,
  });
  useEffect(() => {
    const handleResize = () => {
      const r = wrapperRef.current?.getBoundingClientRect();
      if (!r) {
        return;
      }
      setRect((rect) => {
        if (!rect) {
          return r;
        }
        if (
          r.width != rect.width ||
          r.height != rect.height ||
          r.x != rect.x ||
          r.y != rect.y
        ) {
          return r;
        }
        return rect;
      });
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  return [rect, wrapperRef] as const;
}
