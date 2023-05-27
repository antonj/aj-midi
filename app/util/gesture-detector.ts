/**
 * onFling function
 * @name GestureDetector~onFling
 * @function
 * @param {String} p - Information about the error.
 * @param {Number} velocity - An integer of joy.
 * @return undefined
 */

type GestureBase = {
  x: number;
  y: number;
  event_down: PointerEvent;
  event: PointerEvent;
  timestamp: number;
  width: number;
  height: number;
};
type GestureDrag = GestureBase & {
  event_prev: PointerEvent;
  dx: number;
  dy: number;
  vx: number;
  vy: number;
  totaldx: number;
  totaldy: number;
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
      kind: "pinch";
      data: { still: { x: number; y: number }; moving: GestureDrag };
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

class Pointer {
  ev_down: PointerEvent;
  ev_prev: PointerEvent;
  velo: VelocityTracker;
  elem: HTMLElement;

  constructor(ev: PointerEvent, elem: HTMLElement) {
    this.elem = elem;
    this.ev_down = ev;
    this.ev_prev = ev;
    this.velo = new VelocityTracker().add(ev);
  }

  getGestureBase(ev: PointerEvent): GestureBase {
    const bounds = this.elem.getBoundingClientRect();
    return {
      x: ev.x,
      y: ev.y,
      event_down: this.ev_down,
      event: ev,
      timestamp: ev.timeStamp,
      width: bounds.width,
      height: bounds.height,
    };
  }
  private getGestureDrag(ev: PointerEvent): GestureDrag {
    return {
      ...this.getGestureBase(ev),
      dx: ev.x - this.ev_prev.x,
      dy: ev.y - this.ev_prev.y,
      totaldx: ev.x - this.ev_down.x,
      totaldy: ev.y - this.ev_down.y,
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

  // 1 finger = pan
  // 2 finger = zoom

  constructor(
    elem: HTMLElement,
    callback: (ev: GestureEvent, self: GestureDetector) => void
  ) {
    this.elem = elem;
    this.callback = callback;
    this.pointers = new Map();
  }

  attach() {
    this.elem.addEventListener("pointerdown", this);
    this.elem.addEventListener("pointermove", this);
    this.elem.addEventListener("pointerleave", this);
    this.elem.addEventListener("pointerup", this);
    this.elem.addEventListener("pointercancel", this);
    return this;
  }
  deattach() {
    this.elem.removeEventListener("pointerdown", this);
    this.elem.removeEventListener("pointermove", this);
    this.elem.removeEventListener("pointerleave", this);
    this.elem.removeEventListener("pointerup", this);
    this.elem.removeEventListener("pointercancel", this);
    return this;
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
      this
    );
  }

  move(ev: PointerEvent) {
    this.callback({ kind: "move", data: ev }, this);
    const p = this.pointers.get(ev.pointerId);
    if (!p) return;
    const drag = p.add(ev);

    switch (this.pointers.size) {
      case 1:
        {
          this.callback(
            {
              kind: "drag",
              data: drag,
            },
            this
          );
        }
        break;
      case 2:
        {
          let op: Pointer | undefined;
          for (const [id, p] of this.pointers.entries()) {
            if (id !== ev.pointerId) {
              op = p;
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
            this
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

    this.callback(
      {
        kind: "up",
        data,
      },
      this
    );
    if (this.pointers.size === 0) {
      this.callback(
        {
          kind: "fling",
          data,
        },
        this
      );
    }
  }

  handleEvent(ev: PointerEvent) {
    switch (ev.type) {
      case "pointerdown":
        this.down(ev);
        break;
      case "pointermove":
        this.move(ev);
        break;
      case "pointerleave":
        this.leave(ev);
        break;
      case "pointerup":
      case "pointercancel":
        this.up(ev);
        break;
    }
  }
}
