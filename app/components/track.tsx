import { useEffect, useRef, useState } from "react";
import { AjScroller } from "../util/aj-scroller";
import { map } from "../util/map";
import { Scroller } from "../util/scroller";
import { useGestureDetector } from "./use-gesture-detector";
import { useToneDetector } from "./use-tone-detector";
import { useSongTicker } from "./use-song-ticker";
import { trackDraw, miniMapWidthRatio } from "./track-draw";
import { drawTrackSheet, sheetTickWindow } from "./track-draw-sheet";
import { trackDrawBg } from "./track-draw-bg";
import { Keyboard, links as keyboardLinks } from "./keyboard";
import { useDevicesStore } from "./use-web-midi";
import { usePlayController } from "./use-play-controller";
import { useEnginge } from "./engine-provider";
import { useSnapshot } from "valtio";
import { usePrevious } from "./use-previous";

export function links() {
  return keyboardLinks();
}

function fixDpr(
  canvas: HTMLCanvasElement,
  size: { width: number; height: number }
): boolean {
  let didChange = false;
  let { width, height } = size;
  const dpr = window.devicePixelRatio || 1;
  width = Math.floor(width * dpr);
  height = Math.floor(height * dpr);
  if (canvas.width !== width) {
    canvas.width = width;
    didChange = true;
  }
  if (canvas.height !== height) {
    canvas.height = height;
    didChange = true;
  }
  return didChange;
}

function useElementSize(elem: HTMLElement | null) {
  const bounds = useRef<{ width: number; height: number }>({
    width: -1,
    height: -1,
  });
  if (elem == null) {
    bounds.current = { width: 0, height: 0 };
  } else if (bounds.current.width < 0) {
    bounds.current = elem.getBoundingClientRect();
  }

  useEffect(() => {
    if (!elem) {
      return;
    }
    const obs = new ResizeObserver((stuff) => {
      for (const el of stuff) {
        bounds.current = el.contentRect;
        break;
      }
    });
    obs.observe(elem);

    return () => {
      obs.disconnect();
    };
  }, [elem]);

  return bounds;
}

function useTracksChange() {
  const engine = useEnginge();
  const pianoTracks = useSnapshot(engine).pianoNotes;
  const prevPianoTracks = usePrevious(pianoTracks);
  return pianoTracks !== prevPianoTracks;
}

export function Track() {
  const engine = useEnginge();
  const showSheetNotation = useSnapshot(engine).sheetNotation;
  const [canvasEl, setCanvasEl] = useState<HTMLCanvasElement | null>(null);
  const [canvasBgEl, setCanvasBgEl] = useState<HTMLCanvasElement | null>(null);
  const [canvasSheetEl, setCanvasSheetEl] = useState<HTMLCanvasElement | null>(
    null
  );
  const canvasElSize = useElementSize(canvasEl);
  const canvasBgElSize = useElementSize(canvasBgEl);
  const canvasSheetElSize = useElementSize(canvasSheetEl);

  const pressedNotes = useDevicesStore((state) => state.pressed);

  usePlayController();
  const tones = useToneDetector(engine.detect);
  const sDetected = new Set(tones);
  const tickToneRef = useRef(new Map<number, Set<number>>());
  const scrollerRef = useRef(Scroller());

  const tracksChanged = useTracksChange();
  const rerenderBackground = useRef(true);
  if (tracksChanged) {
    rerenderBackground.current = true;
  }

  useSongTicker(
    function trackTicker(tick, songCtx) {
      tickToneRef.current.set(tick, sDetected);
      if (canvasBgEl) {
        let ctx = canvasBgEl.getContext("2d", { alpha: false });
        if (!ctx) {
          return;
        }
        const changed = fixDpr(canvasBgEl, canvasBgElSize.current);
        if (changed || rerenderBackground.current) {
          trackDrawBg(ctx, songCtx);
          rerenderBackground.current = false;
        }
      }
      {
        if (!canvasEl) {
          return;
        }
        let ctx = canvasEl.getContext("2d", { alpha: true });
        if (!ctx) {
          return;
        }
        fixDpr(canvasEl, canvasElSize.current);
        trackDraw(ctx, tick, songCtx, tickToneRef.current);
      }
      if (canvasSheetEl) {
        let ctx = canvasSheetEl.getContext("2d", { alpha: false });
        if (!ctx) {
          return;
        }
        fixDpr(canvasSheetEl, canvasSheetElSize.current);
        if (songCtx.sheetNotation) {
          drawTrackSheet(ctx, tick, songCtx, pressedNotes);
        }
      }
    },
    [canvasEl, canvasSheetEl, canvasBgEl]
  );

  useGestureDetector(canvasEl, (ev) => {
    switch (ev.kind) {
      case "down":
        const x = map(ev.data.x, 0, ev.data.width, 0, 1);
        {
          scrollerRef.current.forceFinished(true);
          ev.data.event.preventDefault();
          if (x < miniMapWidthRatio) {
            let y = map(ev.data.y, 0, ev.data.height, 0, 1);
            let yy = map(y, 1, 0, 0, engine.song.durationTicks, true);
            engine.seek(yy);
          }
        }
        break;
      case "drag":
        {
          ev.data.event.preventDefault();
          const x = map(ev.data.event_down.x, 0, ev.data.width, 0, 1);
          if (x < miniMapWidthRatio) {
            let y = map(ev.data.y, 0, ev.data.height, 0, 1);
            let yy = map(y, 1, 0, 0, engine.song.durationTicks, true);
            engine.seek(yy);
          } else {
            let dt = map(ev.data.dy, 0, ev.data.height, 0, engine.tickWindow);
            engine.seek(engine.tick + dt);
          }
        }
        break;
      case "wheel drag":
        {
          let dt = map(ev.data.dy, 0, ev.data.height, 0, engine.tickWindow);
          engine.seek(engine.tick + dt);
        }
        break;
      case "fling":
        {
          let prevY = 0;
          const h = ev.data.height;
          const simpleScroller = false;
          if (!simpleScroller) {
            scrollerRef.current.fling(0, prevY, 0, ev.data.vy * 1000);
            function anim() {
              const scrolling = scrollerRef.current.computeScrollOffset();
              if (scrolling) {
                const y = scrollerRef.current.getCurrY();
                let dy = y - prevY;
                prevY = y;
                let dt = map(dy, 0, h, 0, engine.tickWindow);

                const start = engine.tick + dt;
                engine.seek(start);
                requestAnimationFrame(anim);
              }
            }
            requestAnimationFrame(anim);
          } else {
            const ajScroller = new AjScroller();
            ajScroller.fling(ev.data.vy);
            function anim() {
              const info = ajScroller.computeOffset();
              if (!info.done) {
                const y = info.y;
                let dy = y - prevY;
                prevY = y;
                let dt = map(dy, 0, h, 0, engine.tickWindow);
                engine.seek(engine.tick + dt);
                requestAnimationFrame(anim);
              }
            }
            requestAnimationFrame(anim);
          }
        }
        break;
      case "pinch":
        {
          const h = ev.data.moving.height;
          const y1 = ev.data.still.y;
          const y2 = ev.data.moving.y;
          const dy = ev.data.moving.dy;
          let tickWindow = engine.tickWindow;
          let startTick = engine.tick;
          const zoomPoint = map(ev.data.still.y, h, 0, 0, tickWindow); // zoom around still finger
          const d1 = Math.abs(y1 - (y2 + dy)); // distance before
          const d2 = Math.abs(y1 - y2); // distance after
          const scale = d1 === 0 || d2 === 0 ? 1 : d2 / d1;
          const windowScaled = scale * tickWindow;
          if (
            windowScaled < engine.ticksPerBar / 4 ||
            windowScaled > engine.song.durationTicks
          ) {
            return;
          }
          engine.tickWindow = windowScaled;
          engine.seek(startTick + zoomPoint * (1 - scale));
        }
        break;
      case "zoom":
        {
          const h = ev.data.height;
          const dy = ev.data.dy;
          let tickWindow = engine.tickWindow;
          let startTick = engine.tick;
          const zoomPoint = map(ev.data.y, h, 0, 0, tickWindow); // zoom around still finger
          const scale = 1 + map(dy, 0, 10, 0, -0.05); // tweak
          engine.tickWindow = scale * tickWindow;
          engine.seek(startTick + zoomPoint * (1 - scale));
        }
        break;
    }
  });

  useGestureDetector(canvasSheetEl, (ev) => {
    switch (ev.kind) {
      case "down":
        {
          scrollerRef.current.forceFinished(true);
        }
        break;
      case "drag":
      case "wheel drag":
        {
          let dt = map(
            ev.data.dx,
            0,
            ev.data.width,
            0,
            sheetTickWindow(engine.tickWindow)
          );
          engine.seek(engine.tick - dt);
        }
        break;
      case "fling":
        {
          const w = ev.data.width;
          let prevX = 0;
          scrollerRef.current.fling(prevX, 0, -ev.data.vx * 1000, 0);
          function anim() {
            if (!scrollerRef.current.computeScrollOffset()) {
              return;
            }
            const x = scrollerRef.current.getCurrX();
            let dx = x - prevX;
            prevX = x;
            let dt = map(dx, 0, w, 0, engine.tickWindow);
            engine.seek(engine.tick + dt);
            requestAnimationFrame(anim);
          }
          requestAnimationFrame(anim);
        }
        break;
    }
  });

  return (
    <div className="flex flex-col w-full h-full select-none">
      <div className="relative w-full h-full touch-none overflow-hidden">
        <canvas
          key={"canvas-bg"}
          className="absolute w-full h-full touch-none"
          ref={setCanvasBgEl}
        />
        <canvas
          key={"canvas-track"}
          className="absolute w-full h-full touch-none"
          ref={setCanvasEl}
        />
      </div>
      <div className="h-1/6 bg-primary">
        <Keyboard />
      </div>

      {showSheetNotation ? (
        <div className="h-1/3 bg-secondary touch-none relative">
          <canvas
            key={"canvas-sheet"}
            className="absolute w-full h-full"
            ref={setCanvasSheetEl}
          />
        </div>
      ) : null}
    </div>
  );
}
