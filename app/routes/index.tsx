import { Keyboard, links as keyboardLinks } from "../components/keyboard";
import { Midi } from "@tonejs/midi";
import { useEffect, useState } from "react";
import { Track } from "../components/track";

export function links() {
  return [...keyboardLinks()];
}

function useMidi(path: string) {
  const [x, setX] = useState<Midi | null>(null);
  useEffect(() => {
    Midi.fromUrl("/static/midi/moon.mid").then((f) => setX(f));
  }, [path]);
  return x;
}

export default function Index() {
  const m = useMidi("/static/midi/moon.mid");
  console.log(m);
  return (
    <div className="flex flex-col h-screen">
      <div className="bg-secondary h-full overflow-hidden">
        {m ? <Track song={m} /> : null}
      </div>
      {m ? (
        <div className="w-full h-60 outline-black">
          <Keyboard song={m} />
        </div>
      ) : null}
      {/* <pre>{JSON.stringify(m?.tracks[0].notes, null, 2)}</pre> */}
    </div>
  );
}
