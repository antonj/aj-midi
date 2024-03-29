import {
  Links,
  LiveReload,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "@remix-run/react";

import color from "./styles/color.css";
import tailwind from "./styles/tailwind.css";
import type {
  LinksFunction,
  MetaFunction,
} from "@remix-run/react/dist/routeModules";

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: color },
  { rel: "stylesheet", href: tailwind },
];

export const meta: MetaFunction = () => [
  {
    title: "MIDI visualizer",
  },
  {
    charset: "utf-8",
  },
  {
    name: "viewport",
    content: "width=device-width,initial-scale=1,viewport-fit=cover",
  },
];

export default function App() {
  console.log("hello App");
  return (
    <html lang="en">
      <head>
        <Meta />
        <Links />
      </head>
      <body>
        <Outlet />
        <ScrollRestoration />
        <Scripts />
        <LiveReload />
      </body>
    </html>
  );
}
