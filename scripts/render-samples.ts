/** Ready-made images the first screens show instantly (before the art worker has loaded). */
import { mkdirSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { buildPostcardContent, renderPostcardSvg } from "@/features/postcards/template";
import { getScene } from "@/features/postcards/scenes";

mkdirSync("public/samples", { recursive: true });
const content = buildPostcardContent({ cityId: "tokyo", fromId: "seoul", arrivedAt: Date.UTC(2026, 10, 4, 13, 23), focusMinutesAtArrival: 23, timeZone: "Asia/Tokyo" });
writeFileSync("/tmp/welcome-tokyo.svg", renderPostcardSvg(content, getScene("tokyo")!));
execFileSync("rsvg-convert", ["-w", "720", "-o", "public/samples/welcome-tokyo.png", "/tmp/welcome-tokyo.svg"]);
console.log("samples written");
