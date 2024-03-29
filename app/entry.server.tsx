import { RemixServer } from "@remix-run/react";
import type { EntryContext } from "@remix-run/react/dist/entry";
import { renderToString } from "react-dom/server";
import { redirect } from "@remix-run/node";

export default function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  remixContext: EntryContext
) {
  let markup = renderToString(
    <RemixServer context={remixContext} url={request.url} />
  );

  const url = new URL(request.url);
  if (
    url.hostname !== "localhost" &&
    !url.hostname.startsWith("192") &&
    !url.protocol.startsWith("https")
  ) {
    return redirect(url.toString(), {
      status: 301,
      headers: {
        "X-Forwarded-Proto": "https",
      },
    });
  }

  responseHeaders.set("Content-Type", "text/html");

  return new Response("<!DOCTYPE html>" + markup, {
    status: responseStatusCode,
    headers: responseHeaders,
  });
}
