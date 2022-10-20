/**
 * onFling function
 * @name GestureDetector~onFling
 * @function
 * @param {String} p - Information about the error.
 * @param {Number} velocity - An integer of joy.
 * @return undefined
 */

type GestureData = {
  x: number;
  y: number;
  dx: number;
  dy: number;
  totaldx: number;
  totaldy: number;
  event_down: PointerEvent;
  event_prev: PointerEvent;
  event: PointerEvent;
  timestamp: number;
  width: number;
  height: number;
};

export type GestureEvent =
  | {
      kind: "fling";
      data: GestureData & { vx: number; vy: number };
    }
  | {
      kind: "drag";
      data: GestureData;
    }
  | {
      kind: "up";
      data: GestureData;
    }
  | {
      kind: "down";
      data: {
        x: number;
        y: number;
        event: PointerEvent;
        timestamp: number;
      };
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
      data: {
        x: ev.x,
        y: ev.y,
        timestamp: ev.timeStamp,
        event: ev,
      },
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
    const bounds = this.elem.getBoundingClientRect();
    this.callback({
      kind: "drag",
      data: {
        x: ev.x,
        y: ev.y,
        dx: ev.x - this.ev_prev.x,
        dy: ev.y - this.ev_prev.y,
        totaldx: ev.x - this.ev_down.x,
        totaldy: ev.y - this.ev_down.y,
        event_down: this.ev_down,
        event_prev: this.ev_prev,
        event: ev,
        timestamp: ev.timeStamp,
        width: bounds.width,
        height: bounds.height,
      },
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
    console.log({ y: ev.y, yy: this.ev_prev.y });
    this.elem.releasePointerCapture(ev.pointerId);
    const bounds = this.elem.getBoundingClientRect();
    const data = {
      x: ev.x,
      y: ev.y,
      dx: ev.x - this.ev_prev.x,
      dy: ev.y - this.ev_prev.y,
      totaldx: ev.x - this.ev_down.x,
      totaldy: ev.y - this.ev_down.y,
      event_down: this.ev_down,
      event_prev: this.ev_prev,
      event: ev,
      timestamp: ev.timeStamp,
      width: bounds.width,
      height: bounds.height,
    };
    this.callback({
      kind: "up",
      data,
    });
    this.callback({
      kind: "fling",
      data: {
        ...data,
        ...this.velo.velo(),
      },
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
