import { useCallback, useEffect, useState } from "react";

export function Canvas({
  onCanvas,
}: {
  onCanvas: (el: HTMLCanvasElement | null) => void;
}) {
  const [canvasEl, setCanvasEl] = useState<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!canvasEl) {
      return;
    }
    const obs = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (canvasEl == entry.target) {
          const ctx = canvasEl.getContext("2d");
          if (!ctx) {
            return;
          }
          let { width, height } = entry.contentRect;
          const dpr = window.devicePixelRatio || 1;
          width = width * dpr;
          height = height * dpr;

          var tmpCanvas = document.createElement("canvas");
          tmpCanvas.width = width;
          tmpCanvas.height = height;
          var tmpContext = tmpCanvas.getContext("2d");
          tmpContext?.drawImage(ctx.canvas, 0, 0);
          ctx.canvas.height = height;
          ctx.canvas.width = width;
          ctx.fillStyle = "white";
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(tmpCanvas, 0, 0);
        }
      }
    });
    obs.observe(canvasEl);
    return () => {
      obs.disconnect();
    };
  }, [canvasEl]);

  const setEl = useCallback(
    (el: HTMLCanvasElement) => {
      onCanvas(el);
      setCanvasEl(el);
    },
    [onCanvas, setCanvasEl]
  );

  return (
    <canvas className="w-full h-full touch-none select-none" ref={setEl} />
  );
}
