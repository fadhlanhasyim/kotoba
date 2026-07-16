import { ImageResponse } from "next/og";

// Maskable: the OS applies its own crop shape (circle, squircle, ...), so the
// background must run full-bleed (no rounded corners here) and the glyph must
// stay inside the safe zone — roughly the center 80% of the canvas.
export const dynamic = "force-static";

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#d85a30",
          color: "#fffaf6",
          fontSize: 220,
          fontWeight: 700,
          fontFamily: "sans-serif",
        }}
      >
        こ
      </div>
    ),
    { width: 512, height: 512 }
  );
}
