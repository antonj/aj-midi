import { useRef, useState } from "react";
import { map, roundTo } from "../util/map";
import styles from "./input-range.css";
import { useGestureDetector } from "./use-gesture-detector";

export function links() {
  return [{ rel: "stylesheet", href: styles }];
}

export function InputRange(props: {
  focusable?: boolean;
  label: string;
  step: number;
  min: number;
  max: number;
  value: number;
  onChange: (value: number) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [elInput, setElInput] = useState<HTMLElement | null>(null);

  useGestureDetector(elInput, (ev) => {
    switch (ev.kind) {
      case "drag":
      case "down":
        {
          ev.data.event.preventDefault(); // to be able to focus input el
          inputRef.current?.focus();
          const x = roundTo(
            map(ev.data.x, 0, ev.data.width, props.min, props.max, true),
            props.step
          );
          props.onChange(x);
        }
        break;
    }
  });

  return (
    <div data-input-range ref={setElInput}>
      <label>{props.label}</label>
      <input
        hidden={!props.focusable}
        ref={inputRef}
        type="range"
        value={props.value}
        min={props.min}
        max={props.max}
        step={props.step}
        onChange={(ev) => props.onChange(ev.target.valueAsNumber)}
      />
      <div
        className="value"
        style={{
          left: `${map(props.value, props.min, props.max, 0, 100, true)}%`,
        }}
      />
    </div>
  );
}
