import { useEffect, useRef, useState } from "react";
import { AjScroller } from "../util/aj-scroller";
import { clamp, map } from "../util/map";
import { Scroller } from "../util/scroller";
import { useGestureDetector } from "./use-gesture-detector";
import { useSongCtx } from "./context-song";
import { useToneDetector } from "./use-tone-detector";
import { useSettings } from "./context-settings";
import { useSongTicker } from "./use-song-ticker";
import { trackDraw, miniMapWidthRatio } from "./track-draw";
import { drawTrackSheet, sheetTickWindow } from "./track-draw-sheet";
import { trackDrawBg } from "./track-draw-bg";
import { Keyboard, links as keyboardLinks } from "./keyboard";

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
    width: 0,
    height: 0,
  });
  if (bounds.current == undefined && elem) {
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

export function Track() {
  const { song, ticksPerBar } = useSongCtx();
  const sheetNotation = useSettings((s) => s.sheetNotation);
  const [canvasEl, setCanvasEl] = useState<HTMLCanvasElement | null>(null);
  const [canvasBgEl, setCanvasBgEl] = useState<HTMLCanvasElement | null>(null);
  const [canvasSheetEl, setCanvasSheetEl] = useState<HTMLCanvasElement | null>(
    null
  );
  const canvasElSize = useElementSize(canvasEl);
  const canvasBgElSize = useElementSize(canvasBgEl);
  const canvasSheetElSize = useElementSize(canvasSheetEl);
  const detect = useSettings((s) => s.detect);
  const tickWindow = useSettings((s) => s.tickWindow);
  const setStart = useSettings((s) => s.setStart);
  const setTickWindow = useSettings((s) => s.setTickWindow);

  const tones = useToneDetector(detect);
  const sDetected = new Set(tones);
  const tickToneRef = useRef(new Map<number, Set<number>>());
  const tickRef = useRef(0);
  const tickWindowRef = useRef(tickWindow);
  const scrollerRef = useRef(Scroller());

  useSongTicker(function trackTicker(tick, songCtx) {
    tickRef.current = tick;
    tickToneRef.current.set(tick, sDetected);
    if (canvasBgEl) {
      let ctx = canvasBgEl.getContext("2d", { alpha: false });
      if (!ctx) {
        return;
      }
      const changed = fixDpr(canvasBgEl, canvasBgElSize.current);
      if (changed) {
        trackDrawBg(ctx, songCtx);
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
        drawTrackSheet(ctx, tick, songCtx);
      }
    }
  });

  useGestureDetector(canvasEl, (ev) => {
    switch (ev.kind) {
      case "down":
        const x = map(ev.data.x, 0, ev.data.width, 0, 1);
        {
          scrollerRef.current.forceFinished(true);
          ev.data.event.preventDefault();
          if (x < miniMapWidthRatio) {
            let y = map(ev.data.y, 0, ev.data.height, 0, 1);
            let yy = map(y, 1, 0, 0, song.durationTicks, true);
            tickRef.current = yy;
            setStart(yy);
          }
        }
        break;
      case "drag":
        {
          ev.data.event.preventDefault();
          const x = map(ev.data.event_down.x, 0, ev.data.width, 0, 1);
          if (x < miniMapWidthRatio) {
            let y = map(ev.data.y, 0, ev.data.height, 0, 1);
            let yy = map(y, 1, 0, 0, song.durationTicks, true);
            tickRef.current = yy;
            setStart(yy);
          } else {
            let dt = map(ev.data.dy, 0, ev.data.height, 0, tickWindow);
            tickRef.current = tickRef.current + dt;
            setStart(tickRef.current);
          }
        }
        break;
      case "wheel drag":
        {
          let dt = map(ev.data.dy, 0, ev.data.height, 0, tickWindow);
          tickRef.current = tickRef.current + dt;
          setStart(tickRef.current);
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
                let dt = map(dy, 0, h, 0, tickWindow);

                const start = tickRef.current + dt;
                setStart(start);
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
                let dt = map(dy, 0, h, 0, tickWindow);
                tickRef.current = tickRef.current + dt;
                setStart(tickRef.current);
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
          let tickWindow = tickWindowRef.current;
          let startTick = tickRef.current;
          const zoomPoint = map(ev.data.still.y, h, 0, 0, tickWindow); // zoom around still finger
          const d1 = Math.abs(y1 - (y2 + dy)); // distance before
          const d2 = Math.abs(y1 - y2); // distance after
          const scale = d1 === 0 || d2 === 0 ? 1 : d2 / d1;
          const windowScaled = scale * tickWindow;
          if (
            windowScaled < ticksPerBar / 4 ||
            windowScaled > song.durationTicks
          ) {
            return;
          }
          tickWindowRef.current = windowScaled;
          tickRef.current = startTick + zoomPoint * (1 - scale);
          setTickWindow(tickWindowRef.current);
          setStart(tickRef.current);
        }
        break;
      case "zoom":
        {
          const h = ev.data.height;
          const dy = ev.data.dy;
          let tickWindow = tickWindowRef.current;
          let startTick = tickRef.current;
          const zoomPoint = map(ev.data.y, h, 0, 0, tickWindow); // zoom around still finger
          const scale = 1 + map(dy, 0, 10, 0, -0.05); // tweak
          tickWindowRef.current = scale * tickWindow;
          setTickWindow(tickWindowRef.current);
          tickRef.current = startTick + zoomPoint * (1 - scale);
          setStart(tickRef.current);
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
            sheetTickWindow(tickWindow)
          );
          setStart(tickRef.current - dt);
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
            let dt = map(dx, 0, w, 0, tickWindow);
            const start = tickRef.current + dt;
            setStart(start);
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

      {sheetNotation ? (
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
