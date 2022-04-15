import GUI from "lil-gui";
import { Midi } from "@tonejs/midi";
import { useEffect, useRef, useState } from "react";
import { Track } from "../components/track";
import { Keyboard, links as keyboardLinks } from "../components/keyboard";
import { SongProvider, SongSettings } from "../components/use-song-context";

export function links() {
  return [...keyboardLinks()];
}

function useMidi(path: string) {
  const [x, setX] = useState<Midi | null>(null);
  useEffect(() => {
    Midi.fromUrl(path).then((f) => setX(f));
  }, [path]);
  return x;
}

export default function Index() {
  const m = useMidi("/static/midi/moon.midi");
  //const m = useMidi("/static/midi/elise.midi");
  const start = useRef(performance.now());
  const [settings, setSettings] = useState<SongSettings>({
    speed: 0.2,
    start: start.current,
    tickWindow: 400,
  });

  useEffect(() => {
    let obj = {
      ...settings,
    };
    const gui = new GUI();
    gui.add(obj, "speed", 0, 2, 0.05);
    gui.add(obj, "tickWindow", 0, 2000, 5);
    gui.onChange(() => {
      setSettings({ ...obj });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <SongProvider settings={settings}>
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
    </SongProvider>
  );
}
