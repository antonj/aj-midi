import GUI from "lil-gui";
import { useEffect, useRef } from "react";
import { clamp } from "../util/map";
import { SongSettings, useSettings } from "./context-settings";
import { useSongCtx } from "./context-song";
import { useSongTicker } from "./use-song-ticker";

export function Settings() {
  const settings = useSettings((s) => s);
  const song = useSongCtx();

  let params = useRef<SongSettings>(settings);
  params.current = settings;
  let timeRef = useRef({ time: 0 });

  const { durationTicks } = song.song;
  const { ticksPerBar } = song;

  let changing = useRef(false);
  useEffect(() => {
    let bar = timeRef.current;
    let obj = { ...params.current, sound: false };
    const gui = new GUI();
    gui.add(obj, "sound").onChange(() => {
      settings.setVolume(obj.sound ? 0.5 : 0);
    });
    gui.add(obj, "sheetNotation").onChange(() => {
      settings.setSheetNotation(obj.sheetNotation);
    });
    gui.add(obj, "detect").onChange(() => {
      settings.setDetect(obj.detect);
    });
    gui.add(obj, "speed", 0, 2, 0.02).onChange(() => {
      settings.setSpeed(obj.speed);
    });
    gui
      .add(obj, "tickWindow", 0, 20000, 5)
      .name("window")
      .onChange(() => {
        settings.setTickWindow(obj.tickWindow);
      });
    gui.add(obj, "repeatBars", 0, 8, 1).onChange(() => {
      settings.setRepeatBars(obj.repeatBars);
    });
    gui
      .add(obj, "repeatBarsWarmup", 0, 8, 1)
      .name("warmup")
      .onChange(() => {
        settings.setRepeatBarsWarmup(obj.repeatBarsWarmup);
      });
    gui
      .add(bar, "time", -1, durationTicks / ticksPerBar, 1)
      .name("bar")
      .onChange((v: number) => {
        changing.current = true;
        settings.setStart(clamp(v * ticksPerBar, -1, durationTicks));
      })
      .onFinishChange(() => {
        changing.current = false;
      })
      .listen();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [durationTicks, ticksPerBar]);

  useSongTicker(function settingsTicker(tick) {
    if (!changing.current) {
      timeRef.current.time = Math.floor(tick / ticksPerBar);
    }
  });
  console.log("settings");
  return null;
}
