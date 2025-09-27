import { useRef, useState } from "react";
import { clamp, map, roundTo } from "../util/map";
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
  const wheelState = useRef(0);

  useGestureDetector(elInput, (ev) => {
    switch (ev.kind) {
      case "drag":
      case "down":
        {
          ev.data.event.preventDefault(); // to be able to focus input el
          inputRef.current?.focus();
          const x = roundTo(
            map(ev.data.x, 0, ev.data.width, props.min, props.max, true),
            props.step,
          );
          props.onChange(x);
        }
        break;
      case "wheel drag":
        {
          if (Math.abs(ev.data.dy) > Math.abs(ev.data.dx)) {
            return;
          }
          ev.data.event.preventDefault();
          const delta = map(ev.data.dx, 0, ev.data.width, props.min, props.max);
          if (wheelState.current === 0) {
            wheelState.current = props.value;
          }
          wheelState.current = clamp(
            wheelState.current + delta,
            props.min,
            props.max,
          );
          const x = roundTo(
            clamp(wheelState.current, props.min, props.max),
            props.step,
          );
          console.log("wheel", wheelState.current, x);
          if (x !== props.value) {
            props.onChange(x);
          }
        }
        break;
      case "leave":
        {
          console.log("reset");
          wheelState.current = 0; // reset
        }
        break;
    }
  });

  return (
    <div data-input-range ref={setElInput} className="flex items-center">
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
