/** iOS launch screens: the app icon and wordmark centred on the paper background, one PNG per device size. */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { SPLASH_SIZES } from "@/config/splash";

const icon = readFileSync("public/icons/icon.svg", "utf8").replace(/^<svg[^>]*>|<\/svg>$/g, "");
mkdirSync("public/splash", { recursive: true });
for (const { w, h } of SPLASH_SIZES) {
  for (const portrait of [true, false]) {
    const W = portrait ? w : h, H = portrait ? h : w, s = Math.round(Math.min(W, H) * 0.24), r = s * 0.22;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
      <rect width="100%" height="100%" fill="#f4ecd8"/>
      <clipPath id="c"><rect x="${(W - s) / 2}" y="${(H - s) / 2 - s * 0.25}" width="${s}" height="${s}" rx="${r}"/></clipPath>
      <svg x="${(W - s) / 2}" y="${(H - s) / 2 - s * 0.25}" width="${s}" height="${s}" viewBox="0 0 64 64" shape-rendering="crispEdges" clip-path="url(#c)">${icon}</svg>
      <text x="50%" y="${H / 2 + s * 0.62}" text-anchor="middle" font-family="DejaVu Sans, sans-serif" font-weight="900" letter-spacing="${s * 0.04}" font-size="${s * 0.17}" fill="#283152">WANDERMIN</text>
    </svg>`;
    const file = `public/splash/${W}x${H}.png`;
    writeFileSync("/tmp/splash.svg", svg);
    execFileSync("rsvg-convert", ["-o", file, "/tmp/splash.svg"]);
  }
}
console.log(`splash screens written: ${SPLASH_SIZES.length * 2}`);
