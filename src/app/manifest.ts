import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "WANDERMIN",
    short_name: "WANDERMIN",
    description: "Every Minute Takes You Somewhere. A focus timer that turns focused minutes into a journey around the world.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    display_override: ["standalone", "minimal-ui"],
    orientation: "any",
    background_color: "#f4ecd8",
    theme_color: "#f4ecd8",
    launch_handler: { client_mode: "focus-existing" },
    shortcuts: [
      { name: "Focus", short_name: "Focus", url: "/focus", icons: [{ src: "/icons/icon-192.png?v=2", sizes: "192x192" }] },
      { name: "Journal", short_name: "Journal", url: "/journal", icons: [{ src: "/icons/icon-192.png?v=2", sizes: "192x192" }] },
      { name: "Map", short_name: "Map", url: "/map", icons: [{ src: "/icons/icon-192.png?v=2", sizes: "192x192" }] },
    ],
    screenshots: [
      { src: "/screenshots/home.png", sizes: "780x1688", type: "image/png", form_factor: "narrow", label: "Home" },
      { src: "/screenshots/focus.png", sizes: "780x1688", type: "image/png", form_factor: "narrow", label: "Focus" },
      { src: "/screenshots/journal.png", sizes: "780x1688", type: "image/png", form_factor: "narrow", label: "Postcards" },
    ],
    categories: ["productivity", "education", "travel"],
    icons: [
      { src: "/icons/icon-192.png?v=2", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png?v=2", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png?v=2", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
