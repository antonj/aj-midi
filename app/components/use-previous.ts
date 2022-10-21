import { useRef } from "react";

export function usePrevious<T>(val: T) {
  const ref = useRef(val);
  let prev = ref.current;
  if (ref.current != val) {
    ref.current = val;
    return prev;
  }
  return prev;
}
