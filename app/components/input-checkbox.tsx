import { useId } from "react";
import styles from "./input-checkbox.css";

export function links() {
  return [{ rel: "stylesheet", href: styles }];
}

export function InputCheckbox(props: {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  const id = useId();
  return (
    <div data-input-checkbox className="flex items-center gap-2 mt-2">
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
