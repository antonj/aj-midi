import { data } from "@remix-run/node";
import {
  Link,
  useLoaderData,
  useLocation,
  useNavigate,
  useSearchParams,
} from "@remix-run/react";
import type { Midi } from "@tonejs/midi";
import midiPkg from "@tonejs/midi";
import fs from "fs";
import path from "path";
import { useCallback, useEffect, useRef, useState } from "react";
import { GraphDB } from "~/util/graph";
import { EngineProvider } from "../components/engine-provider";
import { Panel, links as PanelLinks } from "../components/panel";
import { Track, links as trackLinks } from "../components/track";
import { useSongSound } from "../components/use-song-sounds";
import { useStoredSettingsParams } from "../components/use-stored-settings-params";
import { files } from "./midi.$id[.midi]";
import { cn } from "~/util/cn";

export function links() {
  return [...trackLinks(), ...PanelLinks()];
}

export type SongType = {
  artist: string;
  title: string;
  url: string;
  metadata?: {
    id: string;
    artist: string;
    artist_firstname: string;
    artist_lastname: string;
    title: string;
    piece: string;
    part: string;
    part_order: string;
    url: string;
  };
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

  const loaderSongs = composersData.flatMap((composer: Composer) =>
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

  const [activeHash, setActiveHash] = useState<string>();
  const { hash } = useLocation();
  const navRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onHashChange = () =>
      setActiveHash(decodeURIComponent(window.location.hash));
    setActiveHash(decodeURIComponent(hash));
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, [hash]);

  useEffect(() => {
    if (!activeHash) return;
    const container = navRef.current;
    if (!container) return;

    const normalizedHash = activeHash.startsWith("#")
      ? activeHash.slice(1)
      : activeHash;

    const anchors = container.querySelectorAll<HTMLAnchorElement>(
      "a[data-anchor-link]",
    );
    const activeAnchor = Array.from(anchors).find(
      (anchor) => anchor.getAttribute("data-anchor-link") === normalizedHash,
    );
    if (!activeAnchor) return;

    const containerRect = container.getBoundingClientRect();
    const anchorRect = activeAnchor.getBoundingClientRect();
    const isAbove = anchorRect.top < containerRect.top;
    const isBelow = anchorRect.bottom > containerRect.bottom;

    if (isAbove || isBelow) {
      activeAnchor.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  }, [activeHash]);

  useEffect(() => {
    // Check which artist header is currently sticky at the top
    const headers = Array.from(
      document.querySelectorAll<HTMLElement>("h2[data-anchor]"),
    );

    const threshold = 1; // pixels tolerance for top ~ 0

    const checkSticky = () => {
      if (headers.length === 0) return;

      // Find the header that is currently stuck to the top (top <= 0 and still visible)
      let current: HTMLElement | null = null;
      let bestTop = -Infinity;

      for (const h of headers) {
        const rect = h.getBoundingClientRect();
        const isStickyNow = rect.top <= threshold && rect.bottom > 0; // top edge at/above top and header visible
        if (isStickyNow && rect.top > bestTop) {
          bestTop = rect.top;
          current = h;
        }
      }

      if (current) {
        const anchor = current.dataset.anchor;
        if (
          anchor &&
          decodeURIComponent(window.location.hash) !== `#${anchor}`
        ) {
          // Update the hash without causing a scroll jump
          const oldURL = window.location.href;
          window.history.replaceState(null, "", `#${anchor}`);
          window.dispatchEvent(
            new HashChangeEvent("hashchange", {
              oldURL,
              newURL: window.location.href,
            }),
          );
        }
      }
    };

    // Run on scroll and resize; also run once on mount
    const onScroll = () => {
      // Use rAF to coalesce multiple scroll events
      requestAnimationFrame(checkSticky);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    // Initial check (headers may not exist until after first paint)
    requestAnimationFrame(checkSticky);

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  if (file) {
    return <Song file={file} />;
  }

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

  type ArtistSongs = { artist: string; songs: SongType[] };
  const groupedSongs = new Map<string, SongType[]>();

  for (const song of filteredSongs) {
    const existingSongs = groupedSongs.get(song.artist);
    if (existingSongs) {
      existingSongs.push(song);
    } else {
      groupedSongs.set(song.artist, [song]);
    }
  }

  const nestedSongs: ArtistSongs[] = Array.from(groupedSongs.entries())
    .map(([artist, songs]) => ({ artist, songs }))
    .sort((a, b) => {
      const aLast = a.songs[0].metadata?.artist_lastname ?? a.artist;
      const bLast = b.songs[0].metadata?.artist_lastname ?? b.artist;
      return aLast.localeCompare(bLast);
    });

  return (
    <div>
      <header
        className={cn("py-8", "border-b border-b-gray-200", "bg-gray-50")}
      >
        <div
          className={cn("flex items-baseline justify-between mx-4 md:mx-16")}
        >
          <h1 className={cn("flex items-baseline", "text-4xl", "font-light")}>
            <img src="/favicon.ico" className="w-4 h-4 mr-2" />
            MIDI piano player
          </h1>
          <label className="block font-bold underline hover:text-accent cursor-pointer">
            Upload MIDI
            <input
              className="pt-2 h-0 w-0 block"
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
        </div>
      </header>
      <div className=" bg-white pt-8">
        <div className="flex mx-4 md:mx-16">
          <aside
            className={cn(
              "shrink-0 h-svh sticky top-0 overflow-y-scroll",
              "pr-4",
            )}
            ref={navRef}
          >
            <h2 className="font-bold py-1">Composer</h2>
            <ul className="flex flex-col pb-16 text-secondary">
              {nestedSongs.map((a) => {
                const anchor = a.artist || "other";
                return (
                  <li key={anchor}>
                    <Link
                      to={{ hash: anchor }}
                      replace={true}
                      data-anchor-link={anchor}
                      className={cn(
                        "block py-1 px-4 hover:bg-gray-100 rounded-lg",
                        activeHash === `#${anchor}`
                          ? cn(
                              "text-primary font-medium",
                              "outline outline-offset-[-1px]",
                              "outline-gray-300",
                              "bg-gray-50",
                            )
                          : "",
                      )}
                    >
                      {a.artist || "Other"}
                    </Link>
                    <span
                      className={cn(
                        "invisible h-0 block px-4",
                        "text-primary font-medium",
                      )}
                    >
                      {a.artist || "Other"}
                    </span>
                  </li>
                );
              })}
            </ul>
          </aside>
          <main className="pb-4">
            <ul className="space-y-16 pb-16">
              {nestedSongs.map(({ artist, songs }) => {
                const anchorId = artist || "other";
                return (
                  <ul key={anchorId} id={anchorId}>
                    <h2
                      className={cn(
                        "sticky top-0 pl-4 py-1 mb-8 bg-white font-semibold text-2xl",
                        "border-b border-b-gray-200",
                      )}
                      data-anchor={anchorId}
                    >
                      {artist || "Other"}
                    </h2>
                    <ul className="-mt-6">
                      {songs.map((song) => (
                        <li key={song.url} className="">
                          <a
                            href={song.url}
                            className="block pl-4 hover:text-accent"
                          >
                            <h3 className="">{song.title}</h3>
                          </a>
                        </li>
                      ))}
                    </ul>
                  </ul>
                );
              })}
            </ul>
          </main>
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
        </div>
      </div>
    </div>
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
