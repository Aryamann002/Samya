import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Sāmya — student self-reflection",
    short_name: "Sāmya",
    description:
      "A self-reflection aid for students. Not a medical, psychological or academic assessment.",
    start_url: "/",
    display: "standalone",
    background_color: "#f6faf7",
    theme_color: "#256a59",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
