import { useRef, useState } from "react";
import { AjScroller } from "../util/aj-scroller";
import { map } from "../util/map";
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
import { GestureEvent } from "../util/gesture-detector";

export function links() {
  return keyboardLinks();
}

function fixDpr(canvas: HTMLCanvasElement): boolean {
  let didChange = false;
  let { width, height } = canvas.getBoundingClientRect();
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

export function Track() {
  const { song } = useSongCtx();
  const sheetNotation = useSettings((s) => s.sheetNotation);
  const [canvasEl, setCanvasEl] = useState<HTMLCanvasElement | null>(null);
  const [canvasBgEl, setCanvasBgEl] = useState<HTMLCanvasElement | null>(null);
  const [canvasSheetEl, setCanvasSheetEl] = useState<HTMLCanvasElement | null>(
    null
  );
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
      const changed = fixDpr(canvasBgEl);
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
      fixDpr(canvasEl);
      trackDraw(ctx, tick, songCtx, tickToneRef.current);
    }
    if (canvasSheetEl) {
      let ctx = canvasSheetEl.getContext("2d", { alpha: false });
      if (!ctx) {
        return;
      }
      fixDpr(canvasSheetEl);
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
            setStart(yy);
          } else {
            let dt = map(ev.data.dy, 0, ev.data.height, 0, tickWindow);
            setStart(tickRef.current + dt);
          }
        }
        break;
      case "fling":
        {
          let prevY = 0;
          const h = ev.data.height;
          const simpleScroller = false;
          if (!simpleScroller) {
            console.log("fling", ev.data.vy * 1000);
            scrollerRef.current.fling(0, prevY, 0, ev.data.vy * 1000);
            console.log("fling final", scrollerRef.current.getFinalY());
            function anim() {
              const scrolling = scrollerRef.current.computeScrollOffset();
              console.log("fling first offset", scrollerRef.current.getCurrY());
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
            console.log("fling", ev.data.vy);
            ajScroller.fling(ev.data.vy);
            console.log("fling final", ajScroller.yFinal);
            function anim() {
              const info = ajScroller.computeOffset();
              console.log("fling first offset", info.y);
              if (!info.done) {
                const y = info.y;
                let dy = y - prevY;
                prevY = y;
                let dt = map(dy, 0, h, 0, tickWindow);
                const start = tickRef.current + dt;
                setStart(start);
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
          const scale = d2 / d1;
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
    <div className="flex flex-col w-full h-full">
      <div className="relative w-full h-full touch-none overflow-hidden">
        <canvas
          key={"canvas-bg"}
          className="absolute w-full h-full touch-none select-none"
          ref={setCanvasBgEl}
        />
        <canvas
          key={"canvas-track"}
          className="absolute w-full h-full touch-none select-none"
          ref={setCanvasEl}
        />
      </div>
      <div className="h-1/6 bg-primary">
        <Keyboard />
      </div>
      {sheetNotation ? (
        <canvas
          key={"canvas-sheet"}
          className="h-1/3 bg-secondary touch-none select-none"
          ref={setCanvasSheetEl}
        />
      ) : null}
    </div>
  );
}
