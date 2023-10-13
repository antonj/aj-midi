import { proxy, ref } from "valtio";
import { SongCtx } from "./context-song";
import { getTicksPerBar } from "../util/music";
import { roundTo } from "../util/map";
import { debounce } from "../util/debounce";
import { subscribeKey } from "valtio/utils";

function updateQuery(ctx: MidiEngine) {
  const url = new URL(window.location.href);
  url.searchParams.set("speed", ctx.speed.toString());
  url.searchParams.set("window", Math.floor(ctx.tickWindow).toString());
  url.searchParams.set("start", ctx.tickStart.toString());
  url.searchParams.set("repeat", Math.floor(ctx.repeatBars).toString());
  if (ctx.sheetNotation) {
    url.searchParams.set("sheet", "true");
  } else {
    url.searchParams.delete("sheet");
  }
  url.searchParams.set("warmup", Math.floor(ctx.repeatBarsWarmup).toString());
  window.history.replaceState(null, "", url.toString());
}
const updateQueryDebounced = debounce(updateQuery, 300);

export type MidiEngine = ReturnType<typeof createMidiEngine>;

export function createMidiEngine(song: SongCtx) {
  const ticksPerBar = getTicksPerBar(song.song);

  // intial settings from  query params
  const url = new URL(window.location.href);
  const searchParams = url.searchParams;
  const start = searchParams.get("start");
  const repeatBars = searchParams.get("repeat");
  const warmup = searchParams.get("warmup");
  const tickWindow = searchParams.get("window");
  const speed = searchParams.get("speed");
  const sheetNotation = searchParams.get("sheet") === "true";

  const p = proxy({
    speed: speed ? parseFloat(speed) : 1,
    tick: start ? parseInt(start) : -1,
    tickStart: start ? parseInt(start) : -1,
    tickEnd: song.song.durationTicks,
    song: ref(song), // do not track internal nested objects, ex ppq was lost
    detect: false,
    tickRepeatStart: 0,
    repeatBars: repeatBars ? parseInt(repeatBars) : 0,
    repeatBarsWarmup: warmup ? parseInt(warmup) : 0,
    tickWindow: tickWindow ? parseInt(tickWindow) : ticksPerBar * 4,
    sheetNotation,
    volume: 0,
    movingTimestamp: 0,
    pressed: new Map<number, { midi: number; velocity: number }>(),
    pressedFuture: new Map<number, { midi: number; velocity: number }>(),
    rid: 0,
    listeners: new Set<() => void>(),

    get bar() {
      return Math.floor(this.tick / ticksPerBar) + 1;
    },
    seek(x: number) {
      this.tickStart = x;
      this.tick = x;
      this.movingTimestamp = Date.now();
    },

    start() {
      const update = () => updateQueryDebounced(this);
      this.listeners.add(subscribeKey(this, "speed", update));
      this.listeners.add(subscribeKey(this, "tickStart", update));
      this.listeners.add(subscribeKey(this, "tickWindow", update));
      this.listeners.add(subscribeKey(this, "repeatBars", update));
      this.listeners.add(subscribeKey(this, "repeatBarsWarmup", update));
      this.listeners.add(subscribeKey(this, "sheetNotation", update));

      console.log("start", this.song.song);
      const {
        ticksPerBar,
        bpm,
        song: {
          durationTicks,
          header: { ppq },
        },
      } = this.song;

      let prevTimestamp = 0;

      const step = (timestamp: number) => {
        const msPerTick = (60 * 1000) / (bpm * ppq) / this.speed;
        const deltaMs = prevTimestamp ? timestamp - prevTimestamp : 0;
        prevTimestamp = timestamp;
        let tick =
          this.speed === 0 ? this.tick : this.tick + deltaMs / msPerTick;
        // console.log("=====");
        // console.log("deltaMs", deltaMs, msPerTick, tick);
        const tickEnd =
          this.repeatBars === 0
            ? durationTicks
            : roundTo(
                Math.max(0, this.tickStart) + this.repeatBars * ticksPerBar,
                ticksPerBar
              );
        const tickRepeatStart = !this.repeatBars
          ? 0
          : tickEnd - this.repeatBars * ticksPerBar;

        if (tick > tickEnd && this.tickStart < tickEnd) {
          // reset to start
          if (this.repeatBars > 0) {
            tick = tickRepeatStart - this.repeatBarsWarmup * ticksPerBar;
          } else {
            tick = roundTo(this.tickStart, ticksPerBar) - ticksPerBar;
          }
        }

        // find pressed
        {
          this.pressed = new Map();
          this.pressedFuture = new Map();
          for (const n of this.song.pianoNotes) {
            // current
            if (tick > n.ticks && tick < n.ticks + n.durationTicks) {
              this.pressed.set(n.midi, n);
            } else if (
              tick < n.ticks &&
              tick > n.ticks - this.tickWindow &&
              n.ticks > this.tickRepeatStart && // do not show things that are before repeat start
              n.ticks < this.tickEnd // do not show things that are after repeat end
            ) {
              this.pressedFuture.set(n.midi, n);
            }
          }
        }

        this.tick = tick;
        this.tickEnd = tickEnd;
        this.tickRepeatStart = tickRepeatStart;
        this.rid = requestAnimationFrame(step);
      };
      this.rid = requestAnimationFrame(step);
    },

    stop() {
      cancelAnimationFrame(this.rid);
      this.listeners.forEach((l) => l());
      this.listeners.clear();
    },
  });
  return p;
}
