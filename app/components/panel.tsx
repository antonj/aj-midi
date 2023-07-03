import { useSettings } from "./context-settings";
import { useSongCtx } from "./context-song";
import styles from "./panel.css";
import { InputRange, links as InputRangeLinks } from "./input-range";
import { Input, links as InputLinks } from "./input";
import { useSongTicker } from "./use-song-ticker";
import { useId, useState } from "react";

export function links() {
  return [
    { rel: "stylesheet", href: styles },
    ...InputRangeLinks(),
    ...InputLinks(),
  ];
}

export function Panel() {
  const ctx = useSongCtx();
  const settings = useSettings((s) => s);

  return (
    <div data-panel className="p-2 font-bold">
      <hgroup>
        <h1>{ctx.song.header.name}</h1>
      </hgroup>
      <BoolVal
        label="sound"
        value={settings.volume > 0}
        onChange={(value) =>
          value ? settings.setVolume(0.5) : settings.setVolume(0)
        }
      />
      <BoolVal
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

function BoolVal(props: {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  const id = useId();
  return (
    <div className="flex items-center gap-2 mt-2">
      <label className="flex-1" htmlFor={id}>
        {props.label}
      </label>
      <div className="w-1/5">
        <input
          id={id}
          type="checkbox"
          checked={props.value}
          onChange={(ev) => props.onChange(ev.currentTarget.checked)}
        />
      </div>
    </div>
  );
}
