import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "kotoba — JLPT study",
    short_name: "kotoba",
    description: "Study Japanese toward the JLPT, one card at a time.",
    start_url: "/",
    display: "standalone",
    background_color: "#f6f3ec",
    theme_color: "#d85a30",
    icons: [
      { src: "/icons/192", sizes: "192x192", type: "image/png" },
      { src: "/icons/512", sizes: "512x512", type: "image/png" },
      { src: "/icons/512-maskable", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
