import { useSyncExternalStore } from "react";

function getSnapshot() {
  return !document.hidden;
}

function getServerSnapshot() {
  return true;
}

function subscribe(callback: () => void) {
  window.addEventListener("visibilitychange", callback);
  return () => {
    window.removeEventListener("visibilitychange", callback);
  };
}

export function useVisibilityChange() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
