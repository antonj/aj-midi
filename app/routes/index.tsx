import { Midi } from "@tonejs/midi";
import { useEffect, useState } from "react";
import { Track, links as trackLinks } from "../components/track";
import { SongProvider } from "../components/context-song";

import { Settings } from "~/components/settings";
import { useSongSound } from "../components/use-song-sounds";
import { useSearchParams } from "@remix-run/react";
import { createScalesMidi } from "~/util/create-scales-midi";

export function links() {
  return [...trackLinks()];
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
        { name: "Visa från Utmyra", url: "/static/midi/utmyra.midi" },
        { name: "Visa från Rättvik", url: "/static/midi/rattvik.midi" },
        { name: "Elise", url: "/static/midi/elise.midi" },
        {
          name: "A Whiter Shade of Pale",
          url: "/static/midi/a_whiter_shade_of_pale.midi",
        },
        {
          name: "Chopin - Nocturne",
          url: "/static/midi/chopin_nocturneop9nr1.midi",
        },
        { name: "Holy Night", url: "/static/midi/o_holy_night.midi" },
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
  let m = useMidi(file);
  if (!m) {
    return null;
  }

  /* m = createScalesMidi(); */

  return (
    <SongProvider song={m}>
      <Sounds />
      <Settings />
      <div className="h-s-screen">
        <Track />
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
