export function debounce<F extends Function>(fn: F, time: number): F {
  let timeout: number;
  return function (...args: any[]) {
    const functionCall = () => fn(...args);
    clearTimeout(timeout);
    timeout = window.setTimeout(functionCall, time);
  } as any;
}
