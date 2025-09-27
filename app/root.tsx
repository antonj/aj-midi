import {
  Links,
  LiveReload,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "@remix-run/react";
import type {
  LinksFunction,
  MetaFunction,
} from "@remix-run/react/dist/routeModules";
import tailwind from "./styles/tailwind.css";

export const links: LinksFunction = () => [
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
