import { ImageResponse } from "next/og";

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
          borderRadius: 44,
          color: "#fffaf6",
          fontSize: 112,
          fontWeight: 700,
          fontFamily: "sans-serif",
        }}
      >
        こ
      </div>
    ),
    { width: 192, height: 192 }
  );
}
