"use client";

import { useEffect, useRef, useState } from "react";

export default function WritingCanvas({ guideChar, maxSize = 320 }: { guideChar: string; maxSize?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  // Default to 1 so the very first render (server + initial client hydration) matches exactly —
  // reading window.devicePixelRatio directly here would mismatch server (no window) vs client.
  // A lazy useState initializer doesn't fix this: it still runs during the client's
  // hydration-matching render, before React has verified the tree matches the server output.
  // Setting it post-mount in an effect is the correct (if lint-flagged) escape hatch here —
  // devicePixelRatio has no subscribe-style API to reach for instead.
  const [dpr, setDpr] = useState(1);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDpr(window.devicePixelRatio || 1);
  }, []);
  // The canvas buffer is a fixed maxSize*dpr pixels regardless of how large it's actually
  // displayed — the CSS below scales it down on narrow screens via min(maxSize, 100%), and
  // pointerPos() below already maps pointer coordinates through the rendered box size, so this
  // stays crisp without needing a ResizeObserver to re-buffer on resize (which would also
  // clear whatever's been drawn).
  const pixelSize = Math.round(maxSize * dpr);

  function pointerPos(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * canvas.width,
      y: ((e.clientY - rect.top) / rect.height) * canvas.height,
    };
  }

  function onPointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    drawing.current = true;
    last.current = pointerPos(e);
  }

  function onPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx || !canvas || !last.current) return;
    const p = pointerPos(e);
    ctx.strokeStyle = getComputedStyle(canvas).color;
    ctx.lineWidth = 10 * dpr;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(last.current.x, last.current.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    last.current = p;
  }

  function onPointerUp() {
    drawing.current = false;
    last.current = null;
  }

  const boxSize = `min(${maxSize}px, 100%)`;

  return (
    <div
      style={{
        position: "relative",
        width: boxSize,
        aspectRatio: "1 / 1",
        margin: "0 auto",
        overflow: "hidden", // guard: guide glyph is sized for maxSize, box can shrink slightly below it on narrow screens
      }}
    >
      <div
        className="jp"
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: maxSize * 0.7,
          color: "var(--text-muted)",
          opacity: 0.28,
          pointerEvents: "none",
        }}
      >
        {guideChar}
      </div>
      <canvas
        ref={canvasRef}
        width={pixelSize}
        height={pixelSize}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          color: "var(--foreground)",
          borderRadius: "var(--radius)",
          border: "1px solid var(--border)",
          touchAction: "none",
          cursor: "crosshair",
          background: "transparent",
          display: "block",
        }}
      />
    </div>
  );
}
