import { map } from "./map";
import { GestureDetector } from "./gesture-detector";

const d = new Map<string, Data>();

class Data {
  vals: Array<{ x: number; y: number }> = [];
  minX = 0;
  maxX = 0;
  minY = 0;
  maxY = 0;
  maxLength: number;

  constructor(maxLength = 500) {
    this.maxLength = maxLength;
  }
  add(d: { x: number; y: number }, maxLength?: number) {
    this.vals.push(d);
    maxLength = maxLength || this.maxLength;
    if (this.vals.length > maxLength) {
      this.vals.splice(0, this.vals.length - maxLength);
    }

    let minX = Number.MAX_VALUE;
    let maxX = Number.MIN_VALUE;
    let minY = Number.MAX_VALUE;
    let maxY = Number.MIN_VALUE;
    for (const p of this.vals) {
      if (p.x < minX) {
        minX = p.x;
      }
      if (p.x > maxX) {
        maxX = p.x;
      }
      if (p.y < minY) {
        minY = p.y;
      }
      if (p.y > maxY) {
        maxY = p.y;
      }
    }
    this.minX = minX;
    this.maxX = maxX;
    this.minY = minY;
    this.maxY = maxY;
  }
}

export function logGraph(
  key: string,
  data: { x?: number; y: number },
  maxLength?: number
) {
  let x = d.get(key);
  if (!x) {
    x = new Data();
    d.set(key, x);
    init(key);
  }
  x.add({ y: data.y, x: data.x ?? performance.now() }, maxLength);
}

function init(key: string) {
  const c = document.createElement("canvas");
  const width = 2000;
  const height = 100;
  c.width = width;
  c.height = height;
  c.style.width = `${width}px`;
  c.style.height = `${height}px`;
  c.style.position = "absolute";
  c.style.top = `${(d.size - 1) * height}px`;
  c.style.left = "0";
  c.style.outline = "1px solid black";
  c.style.cursor = "move";

  document.body.append(c);
  new GestureDetector(c, (ev) => {
    switch (ev.kind) {
      case "drag": {
        c.style.left = `${
          ev.data.event.clientX - ev.data.event_down.offsetX
        }px`;
        c.style.top = `${ev.data.event.clientY - ev.data.event_down.offsetY}px`;
      }
    }
  }).attach();
  const ctx = c.getContext("2d", { alpha: false });
  if (!ctx) {
    return;
  }
  function animate() {
    const data = d.get(key);
    if (!data) {
      return;
    }
    if (!ctx) {
      return;
    }
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = "black";
    for (let i = 0, l = data.vals.length; i < l; i++) {
      const p = data.vals[i];
      const x = map(p.x, data.minX, data.maxX, 0, width);
      const y = map(p.y, data.minY, data.maxY, height - 5, 5);
      ctx.fillRect(x, y, 1, 1);
    }
    ctx.textBaseline = "top";
    ctx.fillText(key, 0, 0);
    requestAnimationFrame(animate);
  }
  requestAnimationFrame(animate);
}
