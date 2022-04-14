import { useEffect, useRef } from "react";

export function Track() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const canv = canvasRef.current;
    if (!canv) {
      return;
    }
    const ctx = canv.getContext("2d");
    if (!ctx) {
      return;
    }
    requestAnimationFrame(() => draw(ctx));

    const handleResize = () => {
      const rect = wrapperRef.current?.getBoundingClientRect();
      if (!rect) {
        return;
      }
      ctx.canvas.height = rect.height;
      ctx.canvas.width = rect.width;
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div className="w-full h-full" ref={wrapperRef}>
      <canvas ref={canvasRef} />
    </div>
  );
}

function draw(ctx: CanvasRenderingContext2D) {
  const canvas = ctx.canvas;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "salmon";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "white";
  ctx.font = "50px sans-serif";
  ctx.fillText("Resize Me!", canvas.width / 2 - 100, canvas.height / 2, 200);

  requestAnimationFrame(() => draw(ctx));
}
