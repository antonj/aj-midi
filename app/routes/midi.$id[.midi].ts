import type { LoaderFunctionArgs } from "@remix-run/node";
import { createScalesMidi } from "~/util/create-scales-midi";
import { keySignatures } from "../util/key-signature";

function keyToString(k: string) {
  return k.replaceAll("#", "sharp");
}

const routes = (() => {
  let result: Record<
    string,
    { artist: string; title: string; url: string; content: Uint8Array }
  > = {
    all_scales: {
      artist: "",
      title: "All Key Signatures",
      url: "/midi/all_scales.midi",
      content: createScalesMidi(Object.values(keySignatures)).toArray(),
    },
  };

  for (const k of Object.values(keySignatures)) {
    result[keyToString(k.key)] = {
      artist: "scale-" + k.scale,
      title: k.key,
      url: `/midi/${keyToString(k.key)}.midi`,
      content: createScalesMidi([keySignatures[k.key]]).toArray(),
    };
  }
  return result;
})();

export const files = Object.values(routes);

export async function loader({ params }: LoaderFunctionArgs) {
  if (!params.id) return new Response(null, { status: 404 });
  if (!(params.id in routes)) return new Response(null, { status: 404 });
  const c = routes[params.id as keyof typeof routes];
  return new Response(c.content, {
    status: 200,
    headers: {
      "Content-Type": "audio/midi",
    },
  });
}
