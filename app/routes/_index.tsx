import type { Midi } from "@tonejs/midi";
import midiPkg from "@tonejs/midi";
import { useEffect, useState } from "react";
import { Track, links as trackLinks } from "../components/track";
import { useSongSound } from "../components/use-song-sounds";
import { useSearchParams } from "@remix-run/react";
import { Panel, links as PanelLinks } from "../components/panel";
import { EngineProvider } from "../components/engine-provider";
import { files } from "./midi.$id[.midi]";

export function links() {
  return [...trackLinks(), ...PanelLinks()];
}

function useMidi(path: string) {
  const [x, setX] = useState<Midi | null>(null);
  useEffect(() => {
    midiPkg.Midi.fromUrl(path)
      .then((f) => setX(f))
      .catch((e) => {
        console.error("failed to load midi", e);
      });
  }, [path]);
  return x;
}

type SongType = {
  artist: string;
  title: string;
  url: string;
};

const songs: Array<SongType> = [
  {
    artist: "Felix Mendelssohn",
    title:
      "Lieder ohne Worte: Book VI, Op. 67: No. 2, Allegro leggiero, MWV U145",
    url: "/static/midi/mendelssohn_opus_67_no_2_and_no_32.midi",
  },
  {
    artist: "Ludwig van Beethoven",
    title:
      'Piano Sonata No. 14, Op. 27 No. 2, "Moonlight": I. Adagio sostenuto',
    url: "/static/midi/moon_1.midi",
  },
  {
    artist: "Ludwig van Beethoven",
    title: 'Piano Sonata No. 14, Op. 27 No. 2, "Moonlight": II. Allegretto',

    url: "/static/midi/moon_2.midi",
  },
  {
    artist: "Ludwig van Beethoven",
    title:
      'Piano Sonata No. 14, Op. 27 No. 2, "Moonlight": III. Presto agitato',
    url: "/static/midi/moon_3.midi",
  },
  {
    artist: "Ludwig van Beethoven",
    title: "Für Elise",
    url: "/static/midi/elise.midi",
  },
  {
    artist: "Frédéric Chopin",
    title: "Nocturne in B-Flat Minor, Op. 9, No. 1",
    url: "/static/midi/chopin_nocturneop9nr1.midi",
  },
  {
    artist: "Frédéric Chopin",
    title: '12 Études, Op. 25: No. 11 in A Minor "Winter Wind"',
    url: "/static/midi/chpn_op25_e11.midi",
  },
  {
    artist: "Pyotr Ilyich Tchaikovsky",
    title:
      "Swan Lake, Op. 20, TH. 12: Dance of the Four Swans (Arr. Wild for Piano)",
    url: "/static/midi/swan.midi",
  },
  {
    artist: "Jan Johansson",
    title: "Visa från Utmyra",
    url: "/static/midi/utmyra.midi",
  },
  {
    artist: "Jan Johansson",
    title: "Visa från Rättvik",
    url: "/static/midi/rattvik.midi",
  },

  {
    artist: "Procol Harum",
    title: "A Whiter Shade of Pale",
    url: "/static/midi/a_whiter_shade_of_pale.midi",
  },

  {
    artist: "Queen",
    title: "Bohemian Rhapsody",
    url: "/static/midi/bohemian-rhapsody.midi",
  },

  {
    artist: "",
    title: "Holy Night",
    url: "/static/midi/o_holy_night.midi",
  },
  {
    artist: "",
    title: "Waltz",
    url: "/static/midi/blue-danube-waltz-strauss.midi",
  },
  {
    artist: "",
    title: "Super Mario",
    url: "https://bitmidi.com/uploads/72257.mid",
  },
  {
    artist: "",
    title: "Jingle Bells",
    url: "https://bitmidi.com/uploads/35143.mid",
  },
  {
    artist: "Dr Dre",
    title: "Still Dre",
    url: "https://bitmidi.com/uploads/41197.mid",
  },
  {
    artist: "",
    title: "Tetris",
    url: "https://bitmidi.com/uploads/100444.mid",
  },
  {
    artist: "",
    title: "Twinkle Twinkle Little Star",
    url: "/static/midi/twinkle.midi",
  },
].concat(files);

function SongPicker() {
  const [file, setFile] = useState<string>("");

  if (file) {
    return <Song file={file} />;
  }

  return (
    <main className="p-8">
      <ul>
        {songs.map((s) => {
          return (
            <li key={s.url} className="pb-4">
              <a href={`/?file=${s.url}`} className="block hover:text-accent">
                <h3 className="font-bold underline">{s.title}</h3>
                <span>{s.artist || "-"}</span>
              </a>
            </li>
          );
        })}
        <li className="pb-4">
          <label className="block font-bold underline hover:text-accent cursor-pointer">
            Upload MIDI
            <br />
            <input
              className="pt-2"
              type="file"
              accept="audio/midi"
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  const file = e.target.files[0];
                  setFile(URL.createObjectURL(file));
                }
              }}
            />
          </label>
        </li>
      </ul>
    </main>
  );
}

function Song({ file }: { file: string }) {
  let m = useMidi(file);
  if (!m) {
    return null;
  }

  //m = createScalesMidi();

  return (
    <EngineProvider song={m}>
      <Sounds />
      {/* <Settings /> */}
      <div className="flex">
        <div className="h-s-screen flex-1">
          <Track />
        </div>
        <div className="h-s-screen max-w-xs">
          <Panel />
        </div>
      </div>
    </EngineProvider>
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
