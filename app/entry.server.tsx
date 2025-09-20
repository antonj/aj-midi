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

  const isHttps =
    request.headers.get("x-forwarded-proto")?.toLowerCase() === "https" ||
    url.protocol === "https:";

  if (
    url.hostname !== "localhost" &&
    !url.hostname.startsWith("192") &&
    !isHttps
  ) {
    console.log("redirecting to HTTPS");
    url.protocol = "https:";
    return redirect(url.toString(), {
      status: 301,
    });
  }

  responseHeaders.set("Content-Type", "text/html");

  return new Response("<!DOCTYPE html>" + markup, {
    status: responseStatusCode,
    headers: responseHeaders,
  });
}
