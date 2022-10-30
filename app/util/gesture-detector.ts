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
type GestureMove = GestureBase & {
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
      kind: "drag";
      data: GestureMove;
    }
  | {
      kind: "up";
      data: GestureMove;
    }
  | {
      kind: "fling";
      data: GestureMove;
    };

class VelocityTracker {
  private size = 2;
  private index = 0;
  events: Array<PointerEvent> = [];
  clear() {
    this.events = [];
    this.index = 0;
  }
  add(p: PointerEvent) {
    this.index = (this.index + 1) % this.size;
    this.events[this.index] = p;
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

export class GestureDetector {
  elem: HTMLElement;
  callback: (ev: GestureEvent) => void;
  is_dragging: boolean = false;
  events: Array<PointerEvent> = [];
  ev_down?: PointerEvent;
  ev_prev?: PointerEvent;
  velo: VelocityTracker;

  constructor(elem: HTMLElement, callback: (ev: GestureEvent) => void) {
    this.elem = elem;
    this.callback = callback;
    this.velo = new VelocityTracker();
  }

  attach() {
    this.elem.addEventListener("pointerdown", this);
    this.elem.addEventListener("pointermove", this);
    this.elem.addEventListener("pointerup", this);
    this.elem.addEventListener("pointercancel", this);
    return this;
  }
  deattach() {
    this.elem.removeEventListener("pointerdown", this);
    this.elem.removeEventListener("pointermove", this);
    this.elem.removeEventListener("pointerup", this);
    this.elem.removeEventListener("pointercancel", this);
    return this;
  }

  private getGestureBase(ev: PointerEvent, down: PointerEvent): GestureBase {
    const bounds = this.elem.getBoundingClientRect();
    return {
      x: ev.x,
      y: ev.y,
      event_down: down,
      event: ev,
      timestamp: ev.timeStamp,
      width: bounds.width,
      height: bounds.height,
    };
  }
  private getGestureMove(
    ev: PointerEvent,
    down: PointerEvent,
    prev: PointerEvent
  ): GestureMove {
    return {
      ...this.getGestureBase(ev, down),
      dx: ev.x - prev.x,
      dy: ev.y - prev.y,
      totaldx: ev.x - down.x,
      totaldy: ev.y - down.y,
      event_prev: prev,
      ...this.velo.velo(),
    };
  }

  down(ev: PointerEvent) {
    if (this.ev_down) {
      // ignore we are only trackng one finger
      return;
    }
    this.ev_down = ev;
    this.elem.setPointerCapture(ev.pointerId);
    this.velo.clear();
    this.velo.add(ev);
    this.callback({
      kind: "down",
      data: this.getGestureBase(ev, ev),
    });
    this.ev_prev = ev;
  }
  move(ev: PointerEvent) {
    if (!this.ev_down || !this.ev_prev) {
      return;
    }
    if (ev.pointerId !== this.ev_down.pointerId) {
      return;
    }
    this.velo.add(ev);
    this.callback({
      kind: "drag",
      data: this.getGestureMove(ev, this.ev_down, this.ev_prev),
    });
    this.ev_prev = ev;
  }
  up(ev: PointerEvent) {
    if (!this.ev_down || !this.ev_prev) {
      return;
    }
    if (ev.pointerId !== this.ev_down.pointerId) {
      return;
    }
    this.elem.releasePointerCapture(ev.pointerId);
    const data = this.getGestureMove(ev, this.ev_down, this.ev_prev);
    this.callback({
      kind: "up",
      data,
    });
    this.callback({
      kind: "fling",
      data,
    });
    this.ev_down = undefined;
    this.ev_prev = undefined;
  }

  handleEvent(ev: PointerEvent) {
    switch (ev.type) {
      case "pointerdown":
        this.down(ev);
        break;
      case "pointermove":
        this.move(ev);
        break;
      case "pointerup":
      case "pointercancel":
        this.up(ev);
        break;
    }
  }
}
