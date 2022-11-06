export function map(
  n: number,
  start1: number,
  stop1: number,
  start2: number,
  stop2: number,
  withinBounds = false
) {
  const newval = ((n - start1) / (stop1 - start1)) * (stop2 - start2) + start2;
  if (!withinBounds) {
    return newval;
  }
  if (start2 < stop2) {
    return clamp(newval, start2, stop2);
  } else {
    return clamp(newval, stop2, start2);
  }
}

export function clamp(n: number, low: number, high: number) {
  return Math.max(Math.min(n, high), low);
}

export function roundTo(x: number, roundTo: number) {
  return Math.round(x / roundTo) * roundTo;
}

export function signum(num: number) {
  return num ? (num < 0 ? -1 : 1) : 0;
}
