export function fontSizeVw(str: string) {
  return Math.min(10, 60 / (str || "").length);
}
