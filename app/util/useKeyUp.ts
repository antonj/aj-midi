import { useEffect } from "react";

export function useKeyUp(onKeyUp: (ev: KeyboardEvent) => void) {
  useEffect(() => {
    document.addEventListener("keyup", onKeyUp);
    return () => {
      document.removeEventListener("keyup", onKeyUp);
    };
  }, [onKeyUp]);
}
