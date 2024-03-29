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

export function roundTo(x: number, roundTo: number): number {
  return parseFloat(
    (Math.round(x / roundTo) * roundTo).toFixed(numDecimals(roundTo))
  );
}

export function floorTo(x: number, floorTo: number) {
  return Math.floor(x / floorTo) * floorTo;
}
export function ceilTo(x: number, ceilTo: number) {
  return Math.ceil(x / ceilTo) * ceilTo;
}

export function signum(num: number) {
  return num ? (num < 0 ? -1 : 1) : 0;
}

function numDecimals(x: number): number {
  if (Math.floor(x.valueOf()) === x.valueOf()) return 0;
  return x.toString().split(".")[1].length || 0;
}
