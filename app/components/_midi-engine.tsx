import { Midi } from "@tonejs/midi";
import {
  BehaviorSubject,
  distinctUntilChanged,
  filter,
  first,
  identity,
  iif,
  map,
  Observable,
  of,
  Subject,
  startWith,
  switchMap,
  takeUntil,
  tap,
} from "rxjs";
import { debounce } from "../util/debounce";
import { roundTo } from "../util/map";
import { SongCtx } from "./engine-provider";
import { SongSettingsExtended } from "./use-song-ticker";

function updateQuery(engine: MidiEngine) {
  const url = new URL(window.location.href);
  url.searchParams.set("start", engine.start.toString());
  window.history.replaceState(null, "", url.toString());
}
const updateQueryDebounced = debounce(updateQuery, 300);

type Changes = {
  [K in keyof MidiEngine]-?: { kind: K; value: MidiEngine[K] };
}[keyof MidiEngine];

export class MidiEngine {
  private changes: Subject<Changes>;
  detect: boolean = false;
  speed = 1;
  tick = 0;
  tickRepeatStart = 0;
  repeatBars = 0;
  repeatBarsWarmup = 0;
  warmupBar = 0;
  tickWindow = 0;
  sheetNotation = false;
  volume = 0;
  song: SongCtx;
  private _tickStart = 0;
  tickEnd: number;

  seek(newStart: number) {
    this._tickStart = newStart;
    this.tick = newStart;
    this.movingTimestamp = Date.now();
    updateQueryDebounced(this);
  }
  get tickStart() {
    return this._tickStart;
  }

  private rid: number = 0; // animation frame id
  movingTimestamp: number = 0;

  listen<K extends Changes["kind"]>(n: K, initialValue = true) {
    let r = this.changes.pipe(
      filter((x) => x.kind === n),
      map((x) => x.value as (typeof this)[K]),
    );
    if (initialValue) {
      r = r.pipe(startWith(this[n]));
    }
    return r;
  }
  constructor(songCtx: SongCtx) {
    this.song = songCtx;
    this.tickEnd = songCtx.song.durationTicks;
    this.changes = new Subject<Changes>();
    this.tickWindow = 1000;
    const proxy = new Proxy(this, {
      set(target, prop: keyof MidiEngine, value) {
        console.log("set ", prop, value);
        const r = Reflect.set(target, prop, value);
        setTimeout(() => {
          target.changes.next({ kind: prop, value: value });
        }, 0);
        return r;
      },
    });
    console.log("proxy", proxy);
    return proxy;
  }

  start(songCtx: SongCtx) {
    console.log("start", songCtx);
    this.listen("tick")
      .pipe(
        map((t) => Math.floor(t)),
        distinctUntilChanged(),
        tap((t) => console.log("new tick", t)),
      )
      .subscribe();

    const {
      ticksPerBar,
      bpm,
      song: {
        durationTicks,
        header: { ppq },
      },
    } = songCtx;

    let prevTimestamp = 0;

    const step = (timestamp: number) => {
      const msPerTick = (60 * 1000) / (bpm * ppq) / this.speed;
      const deltaMs = prevTimestamp ? timestamp - prevTimestamp : 0;
      prevTimestamp = timestamp;
      console.log("=====");
      console.log("deltaMs", deltaMs, msPerTick);
      let tick = this.tick + deltaMs / msPerTick;
      const tickEnd =
        this.repeatBars === 0
          ? durationTicks
          : roundTo(
              Math.max(0, this.tickStart) + this.repeatBars * ticksPerBar,
              ticksPerBar,
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
      this.tick = tick;
      this.rid = requestAnimationFrame(step);
    };
    this.rid = requestAnimationFrame(step);
  }

  stop() {
    cancelAnimationFrame(this.rid);
  }
}
