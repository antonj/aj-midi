import { useEffect, useRef } from "react";

export function useChanged<T>(val: T) {
  const prevVal = usePrevious(val);
  return prevVal !== val;
}

export function usePrevious<T>(value: T) {
  const ref = useRef<T>();
  useEffect(() => {
    ref.current = value;
  });
  return ref.current;
}
