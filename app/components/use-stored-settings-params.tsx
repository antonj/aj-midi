import { useMemo } from "react";
import type { SongType } from "../routes/_index";
import { getQueryWithPreviousSettings } from "./midi-valtio";

export function useStoredSettingsParams(
  songs: Array<SongType>,
): Array<SongType> {
  const result = useMemo(() => {
    return songs.map((s) => ({
      ...s,
      url: getQueryWithPreviousSettings(s.url),
    }));
  }, [songs]);

  return result;
}
