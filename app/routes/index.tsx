import GUI from "lil-gui";
import { Midi } from "@tonejs/midi";
import { useEffect, useRef, useState } from "react";
import { Track } from "../components/track";
import { Keyboard, links as keyboardLinks } from "../components/keyboard";
import {
  SongSettings,
  useSettings,
  useSongTicker,
} from "../components/use-song-context";
import { clamp, map } from "../util/map";
import { TimeoutError, timer } from "rxjs";

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
  if (!m) {
    return null;
  }
  return <Song song={m} />;
}

function Song(props: { song: Midi }) {
  const m = props.song;
  const settings = useSettings();

  useEffect(() => {
    if (!m) {
      return;
    }
  }, [settings, m]);

  let params = useRef<SongSettings>(settings);
  let timeRef = useRef({ time: 0 });

  let changing = useRef(false);
  useEffect(() => {
    if (!m) {
      return;
    }
    let time = timeRef.current;
    let obj = params.current;
    const gui = new GUI();
    gui.add(obj, "speed", 0, 2, 0.05).onChange(() => {
      settings.setSpeed(obj.speed);
    });
    gui.add(obj, "tickWindow", 0, 2000, 5).onChange(() => {
      settings.setTickWindow(obj.tickWindow);
    });
    gui
      .add(time, "time", 0, m.durationTicks, 1)
      .onChange((v: number) => {
        changing.current = true;
        console.log("setstart", v);
        settings.setStart(clamp(v, 0, m.durationTicks));
      })
      .onFinishChange(() => {
        changing.current = false;
      })
      .listen();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [m]);

  useSongTicker(m, (_, ctx) => {
    if (!changing.current) {
      timeRef.current.time = ctx.tick;
    }
  });

  return (
    <div className="flex flex-col h-screen">
      <div className="bg-secondary h-full overflow-hidden">
        <Track song={m} />
      </div>

      <div className="w-full h-60 outline-black">
        <Keyboard song={m} />
      </div>
    </div>
  );
}
