import { map } from "./map";
import { GestureDetector } from "./gesture-detector";

const d = new Map<string, Data>();

class Data {
  vals: Array<{ x: number; y: number }> = [];
  minX = 0;
  maxX = 0;
  minY = 0;
  maxY = 0;
  maxLength = 500;
  height = 200;
  width = 200;
  minMaxAdd = 0;
  canvas: HTMLCanvasElement;
  pointer?: PointerEvent;

  constructor(key: string, options?: Options) {
    this.canvas = document.createElement("canvas");
    this.canvas.width = this.width;
    this.canvas.style.width = `${this.width}px`;
    this.canvas.height = this.height;
    this.canvas.style.height = `${this.height}px`;
    this.canvas.style.position = "absolute";
    this.canvas.style.outline = "1px solid black";
    this.canvas.style.cursor = "move";
    let top = 0;
    for (const x of d.values()) {
      top += x.height;
    }
    this.canvas.style.top = `${top}px`;
    this.canvas.style.left = "0";
    this.onOptions(options);

    document.body.append(this.canvas);

    new GestureDetector(this.canvas, (ev) => {
      switch (ev.kind) {
        case "move": {
          this.pointer = ev.data;
          break;
        }
        case "leave": {
          this.pointer = undefined;
          break;
        }
        case "drag": {
          this.canvas.style.left = `${
            ev.data.event.clientX - ev.data.event_down.offsetX
          }px`;
          this.canvas.style.top = `${
            ev.data.event.clientY - ev.data.event_down.offsetY
          }px`;
          break;
        }
      }
    }).attach();
    const ctx = this.canvas.getContext("2d", { alpha: false });
    if (!ctx) {
      return;
    }
    const animate = () => {
      const data = d.get(key);
      if (!data) {
        return;
      }
      if (!ctx) {
        return;
      }
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, this.width, this.height);
      ctx.fillStyle = "black";
      const top = 5;
      const bottom = this.height - 5;
      for (let i = 0, l = data.vals.length; i < l; i++) {
        const p = data.vals[i];
        const x = map(p.x, data.minX, data.maxX, 0, this.width);
        const y = map(p.y, data.minY, data.maxY, bottom, top);
        ctx.fillRect(x, y, 1, 1);
      }
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.fillText(key, 0, 0);

      if (this.pointer) {
        let x = this.pointer.offsetX;
        if (this.pointer.offsetX > this.width * 0.75) {
          ctx.textAlign = "right";
          x -= 20;
        } else {
          ctx.textAlign = "left";
          x += 20;
        }

        const valY = map(
          this.pointer.offsetY,
          bottom,
          top,
          data.minY,
          data.maxY
        );
        ctx.fillText(valY.toFixed(4) + "", x, this.pointer.offsetY);
      }

      {
        ctx.textAlign = "right";
        ctx.textBaseline = "top";
        ctx.fillText(this.maxY.toFixed(4) + "", this.width, 0);
        ctx.textBaseline = "bottom";
        ctx.fillText(this.minY.toFixed(4) + "", this.width, this.height);
      }
      requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }

  private onOptions(options?: Options) {
    if (options?.width != null && this.width !== options.width) {
      this.width = options.width;
      this.canvas.width = this.width;
      this.canvas.style.width = `${this.width}px`;
    }
    if (options?.height != null && this.height !== options.height) {
      this.height = options.height;
      this.canvas.height = this.height;
      this.canvas.style.height = `${this.height}px`;
    }
    if (options?.maxLength != null) {
      this.maxLength = options.maxLength;
    }
    if (options?.minMaxAdd != null) {
      this.minMaxAdd = options.minMaxAdd;
    }
  }

  add(d: { x: number; y: number }, options?: Options) {
    this.onOptions(options);
    this.vals.push(d);
    if (this.vals.length > this.maxLength) {
      this.vals.splice(0, this.vals.length - this.maxLength);
    }

    let minX = Number.MAX_VALUE;
    let maxX = -Number.MAX_VALUE;
    let minY = Number.MAX_VALUE;
    let maxY = -Number.MAX_VALUE;
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
    this.minY = minY - this.minMaxAdd;
    this.maxY = maxY + this.minMaxAdd;
  }
}

type Options = {
  maxLength?: number;
  minMaxAdd?: number;
  height?: number;
  width?: number;
};
export function logGraph(
  key: string,
  data: { x?: number; y: number },
  options?: Options
) {
  let x = d.get(key);
  if (!x) {
    x = new Data(key, options);
    d.set(key, x);
  }
  x.add({ y: data.y, x: data.x ?? performance.now() }, options);
}
