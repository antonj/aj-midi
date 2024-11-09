import styles from "./panel.css";

import { useId, useState } from "react";
import { useSnapshot } from "valtio";
import { useEnginge } from "./engine-provider";
import { Input, links as InputLinks } from "./input";
import { links as InputCheckboxLinks } from "./input-checkbox";
import { InputRange, links as InputRangeLinks } from "./input-range";
import { useDevicesStore, useWebMidiDevices } from "./use-web-midi";

export function links() {
  return [
    { rel: "stylesheet", href: styles },
    ...InputRangeLinks(),
    ...InputCheckboxLinks(),
    ...InputLinks(),
  ];
}

export function Panel() {
  const engine = useEnginge();
  const settings = useSnapshot(engine);
  const devices = useWebMidiDevices();
  const x = useDevicesStore();
  const [hidden, setHidden] = useState(false);

  return (
    <div
      data-panel
      data-panel-state={hidden ? "hidden" : "open"}
      className="font-bold"
    >
      <section className={`p-2 font-bold ${hidden ? "hidden" : ""}`}>
        <div>
          {x.state}
          <br />
          {devices.map((d) => (
            <div key={d.id}>{d.name}</div>
          ))}
        </div>
        <a href="/">Home</a>
        <SelectTracks />
        <NumBool
          label="sound"
          value={settings.volume > 0}
          onChange={(value) =>
            value ? (engine.volume = 0.5) : (engine.volume = 0)
          }
        />
        <NumBool
          label="sheet-notation"
          value={settings.sheetNotation}
          onChange={(v) => (engine.sheetNotation = v)}
        />
        <NumVal
          label="speed"
          value={settings.speed}
          onChange={(v) => (engine.speed = v)}
          min={0}
          max={3}
          step={0.01}
        />
        <NumVal
          label="tick-window"
          value={settings.tickWindow}
          onChange={(v) => (engine.tickWindow = v)}
          min={0}
          max={settings.ticksPerBar * 10}
          step={1}
        />
        <NumVal
          label="repeat-bars"
          value={settings.repeatBars}
          onChange={(v) => (engine.repeatBars = v)}
          min={0}
          max={8}
          step={1}
        />
        <NumVal
          label="repeat-bars-warmup"
          value={settings.repeatBarsWarmup}
          onChange={(v) => (engine.repeatBarsWarmup = v)}
          min={0}
          max={8}
          step={1}
        />
        <NumBar />
      </section>
      <hgroup
        data-panel-toggle
        className="font-bold p-2 cursor-pointer select-none"
        onClick={() => setHidden((hidden) => !hidden)}
      >
        <h1>Controls</h1>
      </hgroup>
    </div>
  );
}

function SelectTracks() {
  const eng = useEnginge();
  const snap = useSnapshot(eng);
  if (snap.tracks.length < 2) {
    return null;
  }
  return (
    <>
      <NumBool
        label="all-tracks"
        value={
          snap.trackIndex.size === 0 ||
          snap.trackIndex.size ===
            snap.tracks.filter((t) => t.notes.length > 0).length
        }
        onChange={(v) => {
          console.log(v);
          if (v) {
            eng.trackIndex = new Set(
              snap.tracks.filter((t) => t.notes.length > 0).map((_, i) => i)
            );
          }
        }}
      />
      <div className="ml-2">
        {snap.tracks.map((x, i) => {
          return (
            <NumBool
              key={i}
              label={x.name}
              value={snap.trackIndex.has(i)}
              onChange={(v) => {
                const newVals = new Set(snap.trackIndex);
                if (v) {
                  newVals.add(i);
                } else {
                  newVals.delete(i);
                }
                eng.trackIndex = newVals;
              }}
            />
          );
        })}
      </div>
    </>
  );
}

function NumBar() {
  const engine = useEnginge();
  const bar = useSnapshot(engine).bar;

  return (
    <NumVal
      label="bar"
      value={bar}
      onChange={(v) => engine.seek((v - 1) * engine.ticksPerBar)}
      min={1}
      max={Math.floor(engine.song.durationTicks / engine.ticksPerBar) + 1}
      step={1}
    />
  );
}

function NumVal(props: {
  label: string;
  step: number;
  min: number;
  max: number;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="flex items-center gap-2 mt-2">
      <div className="flex-1">
        <InputRange
          label={props.label}
          value={props.value}
          min={props.min}
          max={props.max}
          step={props.step}
          onChange={props.onChange}
        />
      </div>
      <div className="w-1/5">
        <Input value={props.value} onChange={props.onChange} />
      </div>
    </div>
  );
}

export function NumBool(props: {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  const id = useId();
  return (
    <label
      data-input-checkbox
      className="flex items-center gap-2 mt-2 select-none"
    >
      <span className="label flex-1">{props.label}</span>
      <input
        id={id}
        type="checkbox"
        checked={props.value}
        onChange={(ev) => props.onChange(ev.currentTarget.checked)}
      />
      <span className="w-1/5 checkbox ">{props.value ? "ON" : "OFF"}</span>
    </label>
  );
}
