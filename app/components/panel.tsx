import { useSettings } from "./context-settings";
import { useSongCtx } from "./context-song";
import styles from "./panel.css";

import { InputRange, links as InputRangeLinks } from "./input-range";
import { links as InputCheckboxLinks } from "./input-checkbox";
import { Input, links as InputLinks } from "./input";
import { useSongTicker } from "./use-song-ticker";
import { useId, useState } from "react";
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
  const ctx = useSongCtx();
  const settings = useSettings((s) => s);
  const devices = useWebMidiDevices();
  const x = useDevicesStore();
  const [hidden, setHidden] = useState(false);

  return (
    <div data-panel className="font-bold">
      <section className={`p-2 font-bold ${hidden ? "hidden" : ""}`}>
        <div>
          {x.state}
          <br />
          {devices.map((d) => (
            <div key={d.id}>{d.name}</div>
          ))}
        </div>
        <a href="/">Home</a>
        <NumBool
          label="sound"
          value={settings.volume > 0}
          onChange={(value) =>
            value ? settings.setVolume(0.5) : settings.setVolume(0)
          }
        />
        <NumBool
          label="sheet-notation"
          value={settings.sheetNotation}
          onChange={settings.setSheetNotation}
        />
        <NumVal
          label="speed"
          value={settings.speed}
          onChange={settings.setSpeed}
          min={0}
          max={3}
          step={0.01}
        />
        <NumVal
          label="tick-window"
          value={settings.tickWindow}
          onChange={settings.setTickWindow}
          min={0}
          max={ctx.ticksPerBar * 10}
          step={1}
        />
        <NumVal
          label="repeat-bars"
          value={settings.repeatBars}
          onChange={settings.setRepeatBars}
          min={0}
          max={8}
          step={1}
        />
        <NumVal
          label="repeat-bars-warmup"
          value={settings.repeatBarsWarmup}
          onChange={settings.setRepeatBarsWarmup}
          min={0}
          max={8}
          step={1}
        />
        <NumBar />
      </section>
      <hgroup
        className="font-bold p-2 cursor-pointer select-none"
        onClick={() => setHidden((hidden) => !hidden)}
      >
        <h1>Controls</h1>
      </hgroup>
    </div>
  );
}

function NumBar() {
  const ctx = useSongCtx();
  const settings = useSettings((s) => s);
  const [bar, setBar] = useState(1);
  useSongTicker(function settingsTicker(tick) {
    setBar(Math.floor(tick / ctx.ticksPerBar) + 1);
  });

  return (
    <NumVal
      label="bar"
      value={bar}
      onChange={(v) => settings.setStart((v - 1) * ctx.ticksPerBar)}
      min={1}
      max={Math.floor(ctx.song.durationTicks / ctx.ticksPerBar) + 1}
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
