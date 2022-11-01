import { Midi } from "@tonejs/midi";
import { useEffect, useState } from "react";
import { Track } from "../components/track";
import { Keyboard, links as keyboardLinks } from "../components/keyboard";
import { SongProvider } from "../components/use-song-context";

import styles from "./index.css";
import { useSearchParams } from "remix";
import { Settings } from "~/components/settings";
import { useSongSound } from "../components/use-song-sounds";

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
    return <Song file={file} />;
  }

  return (
    <div>
      {[
        { name: "Moon 1", url: "/static/midi/moon_1.midi" },
        { name: "Moon 2", url: "/static/midi/moon_2.midi" },
        { name: "Moon 3", url: "/static/midi/moon_3.midi" },
        { name: "Visa från Utmyra", url: "static/midi/utmyra.midi" },
        { name: "Visa från Rättvik", url: "static/midi/rattvik.midi" },
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

function Song({ file }: { file: string }) {
  const m = useMidi(file);
  if (!m) {
    return null;
  }
  console.log(m);

  return (
    <SongProvider song={m}>
      <Sounds />
      <Settings />
      <div className="flex flex-col h-s-screen">
        <div data-index>
          <div className="track">
            <Track />
          </div>
          <div className="keyboard">
            <Keyboard />
          </div>
        </div>
      </div>
    </SongProvider>
  );
}

function Sounds() {
  useSongSound();
  return null;
}

export default function Index() {
  const [searchParams] = useSearchParams();
  const file = searchParams.get("file");

  if (file) {
    return <Song file={file} />;
  }
  return <SongPicker />;
}
