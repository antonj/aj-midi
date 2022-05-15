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
import { clamp } from "../util/map";
import styles from "./index.css";

export function links() {
  return [{ rel: "stylesheet", href: styles }, ...keyboardLinks()];
}

function useMidi(path: string) {
  const [x, setX] = useState<Midi | null>(null);
  useEffect(() => {
    Midi.fromUrl(path)
      .then((f) => setX(f))
      .catch((e) => {
        console.error("failed to load midi", e);
      });
  }, [path]);
  return x;
}

export default function Index() {
  const [file, setFile] = useState<string>("/static/midi/moon.midi");
  const m = useMidi(file);
  if (!m) {
    return null;
  }
  console.log(m);

  return (
    <div className="flex flex-col h-s-screen">
      <input
        type="file"
        accept="audio/midi"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            setFile(URL.createObjectURL(file));
          }
        }}
      />
      <Song song={m} />
    </div>
  );
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
  params.current = settings;
  let timeRef = useRef({ time: 0 });

  let changing = useRef(false);
  useEffect(() => {
    if (!m) {
      return;
    }
    let time = timeRef.current;
    let obj = params.current;
    const gui = new GUI();
    gui.add(obj, "speed", 0, 10, 0.05).onChange(() => {
      settings.setSpeed(obj.speed);
    });
    gui.add(obj, "tickWindow", 0, 20000, 5).onChange(() => {
      settings.setTickWindow(obj.tickWindow);
    });
    gui.add(obj, "repeatBars", 0, 50, 1).onChange(() => {
      settings.setRepeatBars(obj.repeatBars);
    });
    gui
      .add(time, "time", -1920, m.durationTicks, 1)
      .onChange((v: number) => {
        changing.current = true;
        settings.setStart(clamp(v, -1920, m.durationTicks));
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
    <div data-index>
      <div className="track">
        <Track song={m} />
      </div>

      <div className="keyboard">
        <Keyboard song={m} />
      </div>
    </div>
  );
}
