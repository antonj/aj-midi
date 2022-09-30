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
import { useSearchParams } from "remix";

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

function SongPicker() {
  const [file, setFile] = useState<string>("");

  if (file) {
    return <SongHej file={file} />;
  }

  return (
    <div>
      {[
        { name: "Moon", url: "/static/midi/moon.midi" },
        { name: "Elise", url: "static/midi/elise.midi" },
        { name: "Waltz", url: "/static/midi/blue-danube-waltz-strauss.midi" },
        { name: "Super Mario", url: "https://bitmidi.com/uploads/72257.mid" },
        { name: "Jingle Bells", url: "https://bitmidi.com/uploads/35143.mid" },
        { name: "Still Dre", url: "https://bitmidi.com/uploads/41197.mid" },
        { name: "Tetris", url: "https://bitmidi.com/uploads/100444.mid" },
      ].map((s) => {
        return (
          <a key={s.url} href={`/?file=${s.url}`} className="block">
            {s.name}
          </a>
        );
      })}
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
    </div>
  );
}

function SongHej({ file }: { file: string }) {
  const m = useMidi(file);
  if (!m) {
    return null;
  }
  return (
    <div className="flex flex-col h-s-screen">
      <Song song={m} />
    </div>
  );
}

export default function Index() {
  const [searchParams] = useSearchParams();
  const file = searchParams.get("file");

  if (file) {
    return <SongHej file={file} />;
  }
  return <SongPicker />;
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
    let obj = { ...params.current, sound: false };
    const gui = new GUI();
    gui.add(obj, "detect").onChange(() => {
      settings.setDetect(obj.detect);
    });
    gui.add(obj, "sound").onChange(() => {
      settings.setVolume(obj.sound ? 1 : 0);
    });
    gui.add(obj, "speed", 0, 2, 0.02).onChange(() => {
      settings.setSpeed(obj.speed);
    });
    gui.add(obj, "tickWindow", 0, 20000, 5).onChange(() => {
      settings.setTickWindow(obj.tickWindow);
    });
    gui.add(obj, "repeatBars", 0, 50, 1).onChange(() => {
      settings.setRepeatBars(obj.repeatBars);
    });
    gui
      .add(time, "time", -500, m.durationTicks, 1)
      .onChange((v: number) => {
        changing.current = true;
        settings.setStart(clamp(v, -500, m.durationTicks));
      })
      .onFinishChange(() => {
        changing.current = false;
      })
      .listen();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [m]);

  useSongTicker(m, (tick) => {
    if (!changing.current) {
      timeRef.current.time = tick;
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
