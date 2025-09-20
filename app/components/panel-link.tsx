import type { ReactNode } from "react";
import styles from "./panel-link.css";

export function links() {
  return [{ rel: "stylesheet", href: styles }];
}

export function PanelLink(props: { href: string; children: ReactNode }) {
  return (
    <a data-panel-link href={props.href} className="select-none">
      <span>{props.children}</span>
    </a>
  );
}
