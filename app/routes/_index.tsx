import { data } from "@remix-run/node";
import { Link, useLoaderData, useSearchParams } from "@remix-run/react";
import type { Midi } from "@tonejs/midi";
import midiPkg from "@tonejs/midi";
import fs from "fs";
import path from "path";
import { useEffect, useState } from "react";
import { GraphDB } from "~/util/graph";
import { EngineProvider } from "../components/engine-provider";
import { Panel, links as PanelLinks } from "../components/panel";
import { Track, links as trackLinks } from "../components/track";
import { useSongSound } from "../components/use-song-sounds";
import { useStoredSettingsParams } from "../components/use-stored-settings-params";
import { files } from "./midi.$id[.midi]";

export function links() {
  return [...trackLinks(), ...PanelLinks()];
}

export type SongType = {
  artist: string;
  title: string;
  url: string;
  metadata?: Record<string, string>;
};

const hardcodedSongs: Array<SongType> = [
  {
    artist: "Felix Mendelssohn",
    title:
      "Lieder ohne Worte: Book VI, Op. 67: No. 2, Allegro leggiero, MWV U145",
    url: "/static/midi/mendelssohn_opus_67_no_2_and_no_32.midi",
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
    artist: "Erik Satie",
    title: "Gymnopédie No. 1",
    url: "/static/midi/gymnopedie_1.midi",
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

export async function loader() {
  const composersPath = path.join(
    process.cwd(),
    "public/static/output/composers_with_local_files.json",
  );
  const composersData = JSON.parse(fs.readFileSync(composersPath, "utf-8"));

  type Part = {
    name: string;
    url: string;
    localPath?: string;
  };

  type Piece = {
    name: string;
    parts: Part[];
  };

  type Composer = {
    name: string;
    url: string;
    pieces: Piece[];
  };

  function transformArtistName(name: string): {
    displayName: string;
    firstName: string;
    lastName: string;
  } {
    // Handle empty names
    if (!name) return { displayName: "", firstName: "", lastName: "" };

    // Special cases for common composers
    const specialCases: Record<
      string,
      { firstName: string; lastName: string }
    > = {
      "Ludwig van Beethoven": {
        firstName: "Ludwig",
        lastName: "van Beethoven",
      },
      "Johann Sebastian Bach": {
        firstName: "Johann Sebastian",
        lastName: "Bach",
      },
      "Wolfgang Amadeus Mozart": {
        firstName: "Wolfgang Amadeus",
        lastName: "Mozart",
      },
      "Frédéric Chopin": { firstName: "Frédéric", lastName: "Chopin" },
      "Pyotr Ilyich Tchaikovsky": {
        firstName: "Pyotr Ilyich",
        lastName: "Tchaikovsky",
      },
      "Felix Mendelssohn": { firstName: "Felix", lastName: "Mendelssohn" },
      "Erik Satie": { firstName: "Erik", lastName: "Satie" },
      "Jan Johansson": { firstName: "Jan", lastName: "Johansson" },
    };

    if (specialCases[name]) {
      return {
        displayName: name,
        ...specialCases[name],
      };
    }

    // Split by comma if present
    const parts = name.split(",").map((part) => part.trim());

    if (parts.length === 2) {
      // Format: "Lastname, Firstname"
      return {
        displayName: `${parts[1]} ${parts[0]}`,
        firstName: parts[1],
        lastName: parts[0],
      };
    } else {
      // Format: "Firstname Lastname" or single name
      const nameParts = name.split(" ");
      if (nameParts.length === 1) {
        return {
          displayName: name,
          firstName: "",
          lastName: name,
        };
      } else {
        // Handle prefixes like 'van', 'von', 'de', etc.
        const prefixes = [
          "van",
          "von",
          "de",
          "di",
          "del",
          "della",
          "des",
          "du",
          "la",
          "le",
          "der",
          "den",
          "ter",
          "ten",
          "van der",
          "van den",
          "van de",
          "von der",
          "af",
          "zu",
          "zum",
          "zur",
          "st.",
          "saint",
          "san",
          "santa",
        ];
        let lastNameParts = [];
        let firstNameParts = [];
        let foundPrefix = false;

        // Start from the end and work backwards
        for (let i = nameParts.length - 1; i >= 0; i--) {
          const part = nameParts[i].toLowerCase();
          const nextPart = i > 0 ? nameParts[i - 1].toLowerCase() : "";
          const combinedPart = `${nextPart} ${part}`.trim();

          if (
            !foundPrefix &&
            (prefixes.includes(part) || prefixes.includes(combinedPart))
          ) {
            if (prefixes.includes(combinedPart)) {
              lastNameParts.unshift(nameParts[i - 1], nameParts[i]);
              i--; // Skip the next part since we used it
            } else {
              lastNameParts.unshift(nameParts[i]);
            }
            foundPrefix = true;
          } else if (foundPrefix || lastNameParts.length > 0) {
            lastNameParts.unshift(nameParts[i]);
          } else {
            firstNameParts.unshift(nameParts[i]);
          }
        }

        // Capitalize first letter of each part
        const capitalize = (str: string) =>
          str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();

        return {
          displayName: name,
          firstName: firstNameParts.map(capitalize).join(" "),
          lastName: lastNameParts.map(capitalize).join(" "),
        };
      }
    }
  }

  const loaderSongs: Array<SongType> = composersData.flatMap(
    (composer: Composer) =>
      composer.pieces.flatMap((piece) =>
        piece.parts.map((part, i) => {
          const { displayName, firstName, lastName } = transformArtistName(
            composer.name,
          );
          return {
            artist: displayName,
            title: `${piece.name} - ${part.name}`,
            url: "static/output/" + part.localPath,
            metadata: {
              id: "static/output/" + part.localPath,
              artist: displayName,
              artist_firstname: firstName,
              artist_lastname: lastName,
              title: `${piece.name} - ${part.name}`,
              piece: piece.name,
              part: part.name,
              part_order: i.toString(),
              url: "static/output/" + part.localPath,
            },
          } satisfies SongType;
        }),
      ),
  );

  return data({ songs: [...hardcodedSongs, ...loaderSongs] });
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

function SongPicker() {
  const [file, setFile] = useState<string>("");
  const {
    data: { songs },
  } = useLoaderData<typeof loader>();

  const songsWithSettings = useStoredSettingsParams(songs);
  const [filters] = useSearchParams();

  if (file) {
    return <Song file={file} />;
  }

  const db = new GraphDB();
  for (const s of songsWithSettings) {
    db.addAll([
      [s.url, "artist", s.artist],
      [s.url, "title", s.title],
      [s.url, "url", s.url],
    ]);
    if (s.metadata) {
      for (const [key, value] of Object.entries(s.metadata)) {
        db.addAll([[s.url, key, value]]);
      }
    }
  }
  const uniqueArtists = db.query([["?song", "artist", "?artist"]], {
    distinct: "artist",
  });

  const filteredSongs = songsWithSettings.filter((s) => {
    for (const [fk, fv] of filters.entries()) {
      if (fk in s) {
        if (s[fk as keyof SongType] !== fv) {
          return false;
        }
      }
    }
    return true;
  });

  type SongWithRowspan = SongType & { rowspan?: number };
  const finalSongs: SongWithRowspan[] = [];
  for (let i = 0; i < filteredSongs.length; ) {
    let s = filteredSongs[i];
    const artist = s.artist;
    let rowspan = 1;
    for (let y = i + 1; y < filteredSongs.length; y++) {
      if (artist === filteredSongs[y].artist) {
        rowspan = rowspan + 1;
      } else {
        break;
      }
    }
    for (let r = 0; r < rowspan && i < filteredSongs.length; r++, i++) {
      s = filteredSongs[i];
      if (r === 0) {
        finalSongs.push({ ...s, rowspan });
      } else {
        finalSongs.push(s);
      }
    }
  }

  return (
    <main className="p-4 md:p-8">
      <ul className="flex gap-1 flex-wrap">
        <li>
          <Link
            to={`/`}
            preventScrollReset={true}
            className="block px-2 py-0 bg-action-primary hover:bg-action-primary-hover text-center"
          >
            All
          </Link>
        </li>
        {uniqueArtists.map((a) => {
          return (
            <li key={a}>
              <Link
                to={`?artist=${a}`}
                //to={`#${a}`}
                preventScrollReset={true}
                className="block px-2 py-0 bg-action-primary hover:bg-action-primary-hover text-center"
              >
                {a || "Other"}
              </Link>
            </li>
          );
        })}
      </ul>
      <table>
        <tbody>
          {finalSongs.map((s) => {
            return (
              <tr key={s.url} className="pb-4">
                {s.rowspan ? (
                  <td
                    rowSpan={s.rowspan}
                    className="align-top px-2 py-6"
                    id={s.artist}
                  >
                    <span className={s.rowspan > 1 ? "sticky top-2" : ""}>
                      {s.artist || "Other"}
                    </span>
                  </td>
                ) : null}
                <td className="p-2  py-6">
                  <a href={s.url} className="block hover:text-accent">
                    <h3 className="font-bold underline">{s.title}</h3>
                    <span>{s.artist || "-"}</span>
                    {/* <pre>{JSON.stringify(s.metadata, null, 2)}</pre>  */}
                  </a>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <ul className="hidden">
        {songsWithSettings.map((s) => {
          for (const [fk, fv] of filters.entries()) {
            if (fk in s) {
              if (s[fk as keyof SongType] !== fv) {
                return null;
              }
            }
          }

          return (
            <li key={s.url} className="pb-4">
              <a href={s.url} className="block hover:text-accent">
                <h3 className="font-bold underline">{s.title}</h3>
                <span>{s.artist || "-"}</span>
                <pre>{JSON.stringify(s.metadata, null, 2)}</pre>
              </a>
            </li>
          );
        })}
        <li className="pb-4">
          <label className="block font-bold underline hover:text-accent cursor-pointer">
            Upload MIDI
            <br />
            <input
              className="pt-2 w-full"
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

  return (
    <EngineProvider song={m}>
      <Sounds />
      <div className="flex overflow-hidden">
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
