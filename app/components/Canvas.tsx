import { useEffect, useLayoutEffect, useRef, useState } from "react";

function useElementSize(elem: HTMLElement | null) {
  const [bounds, setBounds] = useState<{ width: number; height: number }>({
    width: 0,
    height: 0,
  });
  useLayoutEffect(() => {
    if (!elem) {
      return;
    }
    const obs = new ResizeObserver((stuff) => {
      for (const el of stuff) {
        setBounds((b) =>
          b.width === el.contentRect.width && b.height === el.contentRect.height
            ? b
            : el.contentRect,
        );
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

export function Canvas(props: {
  className?: string;
  canvasRef: (el: HTMLCanvasElement) => void;
  draw(ctx: CanvasRenderingContext2D): void;
}) {
  const [canvasEl, setCanvasEl] = useState<HTMLCanvasElement | null>(null);
  const s = useElementSize(canvasEl);
  const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;

  const drawRef = useRef(props.draw);
  if (drawRef.current !== props.draw) {
    drawRef.current = props.draw;
  }

  useEffect(() => {
    let ctx = canvasEl?.getContext("2d", { alpha: false });
    if (!ctx) {
      return;
    }
    if (s.width === 0 || s.height === 0) {
      return;
    }
    drawRef.current(ctx);
  }, [s, canvasEl]);

  return (
    <canvas
      className={props.className}
      ref={setCanvasEl}
      width={Math.floor(s.width * dpr)}
      height={Math.floor(s.height * dpr)}
    />
  );
}
