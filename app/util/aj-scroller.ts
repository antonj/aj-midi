export class AjScroller {
  timeStart: number = 0;
  v0: number = 0;
  yFinal: number = 0;
  a = -0.05;

  fling(v: number) {
    this.timeStart = Date.now();
    this.v0 = Math.abs(v);
    // finalY
    // v(t) = 0 =>
    // 0 = v0 - a*t
    // 0.95t = v0
    // t = v0/0.95
    const tFinal = this.v0 / Math.abs(this.a);
    const v0 = this.v0;
    this.yFinal = this.s(v0, tFinal);
  }

  s = (v0: number, t: number) => {
    return v0 * t + (this.a / 2) * t * t;
  };

  computeOffset(): { done: boolean; y: number } {
    const t = Date.now() - this.timeStart;
    console.log("t", t);

    const v = (v0: number, t: number) => {
      return v0 + this.a * t;
    };

    let sNow = this.s(this.v0, t);
    const vNow = v(this.v0, t);
    const done = vNow <= 0;
    if (done) {
      sNow = this.yFinal;
    }

    return { done: vNow <= 0, y: sNow };
  }
}
