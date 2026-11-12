import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Leki",
    short_name: "Leki",
    description: "Codzienna lista leków, zapasy i przypomnienia.",
    lang: "pl",
    start_url: "/",
    display: "standalone",
    background_color: "#1a1816",
    theme_color: "#1a1816",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
