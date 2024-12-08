import type { Midi } from "@tonejs/midi";
import type { Note } from "@tonejs/midi/dist/Note";
import { proxy, ref } from "valtio";
import { subscribeKey } from "valtio/utils";
import { keySignatures } from "~/util/key-signature";
import type { Key } from "~/util/key-signature";
import { debounce } from "../util/debounce";
import { roundTo } from "../util/map";
import { getTicksPerBar } from "../util/music";
import type { SongCtx } from "./engine-provider";
import { ParallelNotes } from "./parallel-notes";
import { keySignatureForTick } from "./track-draw-sheet";

export const QUERY_SETTING_KEYS = [
  "speed",
  "volume",
  "window",
  "start",
  "repeat",
  "sheet",
  "warmup",
  "trackIndex",
] as const;
type QuerySettingsKey = (typeof QUERY_SETTING_KEYS)[number];

export function getQueryWithPreviousSettings(urlStr: string) {
  const result = new URLSearchParams();
  for (const key of QUERY_SETTING_KEYS) {
    const val = localStorage.getItem(`${urlStr}:${key}`);
    if (val !== null) {
      result.set(key, val);
    }
  }

  let sp: URLSearchParams;
  try {
    let url = new URL(urlStr);
    for (const [key, value] of result.entries()) {
      url.searchParams.set(key, value);
    }
    sp = url.searchParams;
  } catch (e) {
    let url = new URL(urlStr, "https://antonj.se");
    for (const [key, value] of result.entries()) {
      url.searchParams.set(key, value);
    }
    sp = url.searchParams;
  }
  sp.set("file", urlStr);
  return `?${sp.toString()}`;
}
function setVal(url: URL, key: QuerySettingsKey, val: string) {
  url.searchParams.set(key, val);
  const file = url.searchParams.get("file");
  localStorage.setItem(`${file}:${key}`, val);
}
function getVal(url: URL, key: QuerySettingsKey) {
  return url.searchParams.get(key);
}

function updateQuery(ctx: MidiEngine) {
  const url = new URL(window.location.href);
  setVal(url, "speed", ctx.speed.toString());
  setVal(url, "window", Math.floor(ctx.tickWindow).toString());
  setVal(url, "start", ctx.tickStart.toString());
  setVal(url, "repeat", Math.floor(ctx.repeatBars).toString());
  setVal(url, "sheet", ctx.sheetNotation ? "true" : "false");
  setVal(url, "volume", ctx.volume.toString());
  setVal(url, "warmup", Math.floor(ctx.repeatBarsWarmup).toString());
  setVal(url, "trackIndex", Array.from(ctx.trackIndex).join(","));
  window.history.replaceState(null, "", url.toString());
}

const updateQueryDebounced = debounce(updateQuery, 300);

export type MidiEngine = ReturnType<typeof createMidiEngine>;
type PressedNote = { midi: number; velocity: number; ticks: number };

export function createMidiEngine(song: Midi) {
  const ticksPerBar = getTicksPerBar(song);

  // intial settings from  query params
  const url = new URL(window.location.href);
  const start = getVal(url, "start");
  const repeatBars = getVal(url, "repeat");
  const warmup = getVal(url, "warmup");
  const tickWindow = getVal(url, "window");
  const speed = getVal(url, "speed");
  const sheetNotation = getVal(url, "sheet");
  const trackIndex = getVal(url, "trackIndex");
  const volume = getVal(url, "volume");

  const p = proxy({
    speed: speed ? parseFloat(speed) : 1,
    tick: start ? parseInt(start) : -1,
    keySignature:
      keySignatures[song.header.keySignatures[0]?.key as Key] ||
      keySignatures["C-major"],
    tickStart: start ? parseInt(start) : -1,
    tickEnd: song.durationTicks,
    song: ref(song), // do not track internal nested objects, ex ppq was lost
    detect: false,
    tickRepeatStart: 0,
    repeatBars: repeatBars ? parseInt(repeatBars) : 0,
    repeatBarsWarmup: warmup ? parseInt(warmup) : 0,
    tickWindow: tickWindow ? parseInt(tickWindow) : ticksPerBar * 4,
    sheetNotation: sheetNotation ? sheetNotation === "true" : true,
    volume: volume ? parseFloat(volume) : 0,
    movingTimestamp: 0,
    pressed: new Map<number, PressedNote>(),
    pressedFuture: new Map<number, PressedNote>(),
    rid: 0,
    listeners: new Set<() => void>(),

    trackIndex: trackIndex
      ? new Set<number>(trackIndex.split(",").map((i) => parseInt(i)))
      : new Set<number>(),
    ticksPerBar: 0,
    bpm: 0,
    instruments: ["piano"] as Array<"piano" | "organ">,
    pianoNotes: [] as Note[],
    octaves: {} as SongCtx["octaves"],
    tickConnections: new ParallelNotes([]),

    get tracks() {
      const filtered = song.tracks.filter(
        (t) =>
          t.notes.length > 0 &&
          this.instruments.indexOf(t.instrument.family) >= 0
      );
      if (filtered.length === 0) return song.tracks;
      return filtered;
    },

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
      this.listeners.add(subscribeKey(this, "volume", update));
      this.listeners.add(subscribeKey(this, "tickStart", update));
      this.listeners.add(subscribeKey(this, "tickWindow", update));
      this.listeners.add(subscribeKey(this, "repeatBars", update));
      this.listeners.add(subscribeKey(this, "repeatBarsWarmup", update));
      this.listeners.add(subscribeKey(this, "sheetNotation", update));
      this.listeners.add(subscribeKey(this, "trackIndex", update));

      const {
        durationTicks,
        header: { ppq },
      } = this.song;

      let prevTimestamp = 0;

      const step = (timestamp: number) => {
        const msPerTick = (60 * 1000) / (this.bpm * ppq) / this.speed;
        const deltaMs = prevTimestamp ? timestamp - prevTimestamp : 0;
        prevTimestamp = timestamp;
        let tick =
          this.speed === 0 ? this.tick : this.tick + deltaMs / msPerTick;
        //console.log("deltaMs", deltaMs, msPerTick, tick);
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
          const pressed = new Map<number, PressedNote>();
          const pressedFuture = new Map<number, PressedNote>();
          for (const n of this.pianoNotes) {
            // current
            if (
              this.tickRepeatStart <= n.ticks &&
              tick > n.ticks &&
              tick < n.ticks + n.durationTicks
            ) {
              pressed.set(n.midi, n);
            } else if (
              tick < n.ticks &&
              tick > n.ticks - this.tickWindow &&
              n.ticks > this.tickRepeatStart && // do not show things that are before repeat start
              n.ticks < this.tickEnd // do not show things that are after repeat end
            ) {
              pressedFuture.set(n.midi, n);
            }
          }
          if (!mapEquals(this.pressed, pressed)) {
            this.pressed = pressed;
          }
          if (!mapEquals(this.pressedFuture, pressedFuture)) {
            this.pressedFuture = pressedFuture;
          }
        }
        this.tick = tick;
        this.keySignature = keySignatureForTick(tick, song);
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

function mapEquals(m1: Map<number, PressedNote>, m2: Map<number, PressedNote>) {
  if (m1.size !== m2.size) {
    return false;
  }
  for (let [key, v1] of m1) {
    const v2 = m2.get(key);
    if (!v2) {
      return false;
    } else if (v1.ticks !== v2.ticks) {
      return false;
    }
  }
  return true;
}
