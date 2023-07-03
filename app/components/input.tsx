import { useEffect, useState } from "react";
import styles from "./input.css";

export function links() {
  return [{ rel: "stylesheet", href: styles }];
}

export function Input(props: {
  value: number;
  onChange: (value: number) => void;
}) {
  const [v, setV] = useState(props.value);
  useEffect(() => {
    setV(props.value);
  }, [props.value]);

  return (
    <input
      data-input
      value={v}
      type="number"
      onChange={(ev) => {
        setV(ev.target.valueAsNumber);
        if (isNaN(ev.target.valueAsNumber)) return;
        props.onChange(ev.target.valueAsNumber);
      }}
    />
  );
}
