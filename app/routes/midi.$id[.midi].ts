import type { LoaderFunctionArgs } from "@remix-run/node";
import { createScalesMidi } from "~/util/create-scales-midi";

export const files = {
  artist: "",
  title: "All Key Signatures",
  url: "/midi/all_scales.midi",
};

export async function loader({ params }: LoaderFunctionArgs) {
  console.log("load midi", params.id);

  const m = createScalesMidi();
  return new Response(m.toArray(), {
    status: 200,
    headers: {
      "Content-Type": "audio/midi",
    },
  });
}
