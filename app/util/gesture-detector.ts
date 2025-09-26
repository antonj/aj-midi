/**
 * onFling function
 * @name GestureDetector~onFling
 * @function
 * @param {String} p - Information about the error.
 * @param {Number} velocity - An integer of joy.
 * @return undefined
 */
type XY = { x: number; y: number };
type XYT = { x: number; y: number; timeStamp: number };

type GestuerEvent = XY & {
  event: Event;
  width: number;
  height: number;
};
type GestureDragWheel = GestuerEvent & {
  dx: number;
  dy: number;
};
type GestureBase = GestuerEvent & {
  event_down: XYT;
};
type GestureDrag = GestureBase & {
  event_prev: XYT;
  dx: number;
  dy: number;
  vx: number;
  vy: number;
};

export type GestureEvent =
  | {
      kind: "down";
      data: GestureBase;
    }
  | {
      kind: "move";
      data: PointerEvent;
    }
  | {
      kind: "leave";
      data: PointerEvent;
    }
  | {
      kind: "drag";
      data: GestureDrag;
    }
  | {
      kind: "wheel drag";
      data: GestureDragWheel;
    }
  | {
      kind: "pinch";
      data: { still: { x: number; y: number }; moving: GestureDrag };
    }
  | {
      kind: "zoom";
      data: { x: number; y: number; dy: number; height: number; width: number };
    }
  | {
      kind: "up";
      data: GestureDrag;
    }
  | {
      kind: "fling";
      data: GestureDrag;
    };

class VelocityTracker {
  private size = 2;
  private index = 0;
  events: Array<PointerEvent> = [];
  clear() {
    this.events = [];
    this.index = 0;
  }
  add(p: PointerEvent): VelocityTracker {
    this.index = (this.index + 1) % this.size;
    this.events[this.index] = p;
    return this;
  }
  velo() {
    const curr = this.events[this.index];
    const prev = this.events[Math.abs(this.index - 1) % this.size];
    if (!prev) {
      return {
        vx: 0,
        vy: 0,
      };
    }
    const dt = curr.timeStamp - prev.timeStamp;
    return {
      vx: dt ? (curr.x - prev.x) / dt : 0,
      vy: dt ? (curr.y - prev.y) / dt : 0,
    };
  }
}

function distance(p1: { x: number; y: number }, p2: { x: number; y: number }) {
  return Math.abs(Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2));
}

class Pointer {
  ev_down: PointerEvent;
  ev_prev: PointerEvent;
  velo: VelocityTracker;
  elem: HTMLElement;
  clickBeforePointer?: Pointer; // there was a click on a another pointer close to this pointer down in time and distance

  constructor(ev: PointerEvent, elem: HTMLElement) {
    this.elem = elem;
    this.ev_down = ev;
    this.ev_prev = ev;
    this.velo = new VelocityTracker().add(ev);
  }

  getGestureBase(ev: PointerEvent): GestureBase {
    const bounds = this.elem.getBoundingClientRect();
    return {
      x: ev.clientX - bounds.left,
      y: ev.clientY - bounds.top,
      event_down: this.ev_down,
      event: ev,
      width: bounds.width,
      height: bounds.height,
    };
  }
  private getGestureDrag(ev: PointerEvent): GestureDrag {
    return {
      ...this.getGestureBase(ev),
      dx: ev.x - this.ev_prev.x,
      dy: ev.y - this.ev_prev.y,
      event_prev: this.ev_prev,
      ...this.velo.velo(),
    };
  }

  add(ev: PointerEvent): GestureDrag {
    if (ev.type !== "pointerup") {
      this.velo.add(ev);
    }
    const r = this.getGestureDrag(ev);
    this.ev_prev = ev;
    return r;
  }
}

export class GestureDetector {
  elem: HTMLElement;
  callback: (ev: GestureEvent, self: GestureDetector) => void;
  pointers: Map<number, Pointer>;
  clicks: Map<number, Pointer>;
  options: { wheel?: boolean };

  constructor(
    elem: HTMLElement,
    callback: (ev: GestureEvent, self: GestureDetector) => void,
    options: { wheel?: boolean } = {},
  ) {
    this.elem = elem;
    this.callback = callback;
    this.pointers = new Map();
    this.clicks = new Map();
    this.options = options;
  }

  attach() {
    this.elem.addEventListener("pointerdown", this);
    this.elem.addEventListener("pointermove", this);
    this.elem.addEventListener("pointerleave", this);
    this.elem.addEventListener("pointerup", this);
    this.elem.addEventListener("pointercancel", this);
    this.elem.addEventListener("lostpointercapture", this);
    this.elem.addEventListener("wheel", this);
    this.elem.addEventListener("touchstart", this.preventDefault);
    this.elem.addEventListener("dragstart", this.preventDefault);
    return this;
  }

  deattach() {
    this.elem.removeEventListener("pointerdown", this);
    this.elem.removeEventListener("pointermove", this);
    this.elem.removeEventListener("pointerleave", this);
    this.elem.removeEventListener("pointerup", this);
    this.elem.removeEventListener("pointercancel", this);
    this.elem.removeEventListener("lostpointercapture", this);
    this.elem.removeEventListener("wheel", this);
    this.elem.removeEventListener("touchstart", this.preventDefault);
    this.elem.removeEventListener("dragstart", this.preventDefault);
    return this;
  }

  preventDefault(ev: Event) {
    ev.preventDefault();
  }

  down(ev: PointerEvent) {
    const p = new Pointer(ev, this.elem);
    this.pointers.set(ev.pointerId, p);
    this.elem.setPointerCapture(ev.pointerId);
    this.callback(
      {
        kind: "down",
        data: p.getGestureBase(ev),
      },
      this,
    );

    for (const [_, cp] of this.clicks.entries()) {
      if (
        ev.timeStamp - cp.ev_prev.timeStamp < 250 &&
        distance(ev, cp.ev_prev) < 50
      ) {
        p.clickBeforePointer = cp;
        break;
      }
    }
  }

  move(ev: PointerEvent) {
    this.callback({ kind: "move", data: ev }, this);
    const p = this.pointers.get(ev.pointerId);
    if (!p) return;
    const drag = p.add(ev);

    switch (this.pointers.size) {
      case 1:
        {
          if (p.clickBeforePointer) {
            this.callback(
              {
                kind: "zoom",
                data: {
                  x: p.clickBeforePointer.ev_prev.x,
                  y: p.clickBeforePointer.ev_prev.y,
                  dy: drag.dy,
                  height: drag.height,
                  width: drag.width,
                },
              },
              this,
            );
          } else {
            this.callback(
              {
                kind: "drag",
                data: drag,
              },
              this,
            );
          }
        }
        break;
      case 2:
        {
          let op: Pointer | undefined;
          for (const [id, p] of this.pointers.entries()) {
            if (id !== ev.pointerId) {
              op = p;
              break;
            }
          }
          if (!op) return;
          this.callback(
            {
              kind: "pinch",
              data: {
                still: { x: op.ev_prev.x, y: op.ev_prev.y },
                moving: drag,
              },
            },
            this,
          );
        }
        break;
    }
  }

  leave(ev: PointerEvent) {
    this.callback({ kind: "leave", data: ev }, this);
  }

  up(ev: PointerEvent) {
    const p = this.pointers.get(ev.pointerId);
    if (!p) return;
    this.pointers.delete(ev.pointerId);
    this.elem.releasePointerCapture(ev.pointerId);
    const data = p.add(ev);

    // setup click
    if (
      ev.timeStamp - p.ev_down.timeStamp < 2000 && // up after down in 2 second
      distance(ev, p.ev_down) < 50 // up is max 50 px from down
    ) {
      this.clicks.set(ev.pointerId, p);
      setTimeout(() => {
        this.clicks.delete(ev.pointerId);
      }, 1000);
    }

    this.callback(
      {
        kind: "up",
        data,
      },
      this,
    );
    if (this.pointers.size === 0) {
      this.callback(
        {
          kind: "fling",
          data,
        },
        this,
      );
    }
  }

  wheel(ev: WheelEvent) {
    if (!this.options.wheel) return;
    const bounds = this.elem.getBoundingClientRect();
    ev.preventDefault();
    if (ev.ctrlKey) {
      this.callback(
        {
          kind: "zoom",
          data: {
            x: ev.x,
            y: ev.y,
            dy: -ev.deltaY,
            height: bounds.height,
            width: bounds.width,
          },
        },
        this,
      );
    } else {
      this.callback(
        {
          kind: "wheel drag",
          data: {
            event: ev,
            dy: -ev.deltaY,
            dx: -ev.deltaX,
            x: ev.x,
            y: ev.y,
            height: bounds.height,
            width: bounds.width,
          },
        },
        this,
      );
    }
  }

  handleEvent(ev: Event) {
    switch (ev.type) {
      case "wheel":
        this.wheel(ev as WheelEvent);
        break;
      case "pointerdown":
        this.down(ev as PointerEvent);
        break;
      case "pointermove":
        this.move(ev as PointerEvent);
        break;
      case "pointerleave":
        this.leave(ev as PointerEvent);
        break;
      case "pointerup":
      case "pointercancel":
      case "lostpointercapture":
        this.up(ev as PointerEvent);
        break;
    }
  }
}
