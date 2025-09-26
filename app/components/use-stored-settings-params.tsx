import { useEffect, useState } from "react";
import type { SongType } from "../routes/_index";
import { getQueryWithPreviousSettings } from "./midi-valtio";

export function useStoredSettingsParams(
  songs: Array<SongType>,
): Array<SongType> {
  const [result, setResult] = useState(songs);

  useEffect(() => {
    const withSettings = [...songs];
    for (const s of withSettings) {
      s.url = getQueryWithPreviousSettings(s.url);
    }
    setResult(withSettings);
  }, [songs]);

  return result;
}
