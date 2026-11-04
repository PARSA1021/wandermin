/** App icons drawn with the postcard pixel engine: a cream globe, a navy airliner and its dotted trail on red. */
import { mkdirSync, writeFileSync, copyFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { PixelCanvas } from "@/features/postcards/pixel/canvas";

const RED = "#b83a2b", CREAM = "#f4ecd8", CREAM_SHADE = "#e2d3b0", NAVY = "#283152";
const c = new PixelCanvas(32, 32);
c.rect(0, 0, 32, 32, RED);
// globe with a soft crescent shadow; everything stays inside the maskable safe zone (centre 80%)
c.disc(16, 16, 10.5, CREAM);
c.paint((x, y) => ((x - 16) ** 2 + (y - 16) ** 2 <= 112 && (x - 13) ** 2 + (y - 13) ** 2 > 96 ? CREAM_SHADE : null));
// dotted flight path arriving from the lower left
for (const [x, y] of [[4, 25], [6, 24], [8, 23]] as const) c.set(x, y, CREAM);
// the boarding-pass airliner at 2x, crossing the globe
const plane = ["...#.....", "...##....", "#..###...", "#########", "#..###...", "...##....", "...#....."];
plane.forEach((row, j) => [...row].forEach((bit, i) => { if (bit === "#") c.rect(8 + i * 2, 9 + j * 2, 2, 2, NAVY); }));

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" shape-rendering="crispEdges">${c.toSvgPaths()}</svg>`;
mkdirSync("public/icons", { recursive: true });
writeFileSync("public/icons/icon.svg", svg);
for (const size of [32, 180, 192, 512]) execFileSync("rsvg-convert", ["-w", String(size), "-h", String(size), "-o", `public/icons/icon-${size}.png`, "public/icons/icon.svg"]);
copyFileSync("public/icons/icon-180.png", "src/app/apple-icon.png");
copyFileSync("public/icons/icon-32.png", "src/app/icon.png");
console.log("icons written");
