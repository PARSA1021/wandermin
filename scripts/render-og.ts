/** Link-preview image (1200×630) for chats and social apps: what WANDERMIN is, at a glance. */
import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { buildPostcardContent, renderPostcardSvg } from "@/features/postcards/template";
import { getScene } from "@/features/postcards/scenes";
import { buildBoardingPass, composeBoardingPass, passAccent } from "@/features/tickets/boarding-pass";

const png = (svg: string, w: number, name: string) => {
  writeFileSync(`/tmp/${name}.svg`, svg);
  execFileSync("rsvg-convert", ["-w", String(w), "-o", `/tmp/${name}.png`, `/tmp/${name}.svg`]);
  return `data:image/png;base64,${readFileSync(`/tmp/${name}.png`).toString("base64")}`;
};
const card = (cityId: string, fromId: string, min: number) =>
  png(renderPostcardSvg(buildPostcardContent({ cityId, fromId, arrivedAt: Date.UTC(2026, 10, 4, 13), focusMinutesAtArrival: min, timeZone: "Asia/Seoul" }), getScene(cityId)!), 960, `og-${cityId}`);
const passCanvas = composeBoardingPass(buildBoardingPass({ fromId: "seoul", toId: "tokyo", boardedAt: Date.UTC(2026, 10, 4, 12, 37), minutesFlown: 14, kmPerMinute: 50, sessions: 1, timeZone: "Asia/Seoul" }), passAccent("tokyo"));
const pass = png(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${passCanvas.width} ${passCanvas.height}" shape-rendering="crispEdges">${passCanvas.toSvgPaths()}</svg>`, 1008, "og-pass");
const icon = `data:image/png;base64,${readFileSync("public/icons/icon-192.png").toString("base64")}`;

const KR = "Noto Sans CJK KR";
const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#f4ecd8"/>
  <rect x="0" y="0" width="1200" height="10" fill="#b83a2b"/>
  <image href="${icon}" x="64" y="64" width="72" height="72"/>
  <text x="152" y="113" font-family="${KR}" font-weight="900" font-size="34" letter-spacing="5" fill="#283152">WANDERMIN</text>
  <text x="64" y="228" font-family="${KR}" font-weight="900" font-size="58" fill="#283152">집중하는 동안,</text>
  <text x="64" y="300" font-family="${KR}" font-weight="900" font-size="58" fill="#283152">세계를 여행해요</text>
  <text x="64" y="364" font-family="${KR}" font-weight="500" font-size="27" fill="#4a4652">집중 1분 = 50km 비행 · 50개 도시</text>
  <text x="64" y="404" font-family="${KR}" font-weight="500" font-size="27" fill="#4a4652">도착할 때마다 픽셀 엽서를 받아요</text>
  <rect x="64" y="452" width="360" height="62" rx="31" fill="#b83a2b"/>
  <text x="244" y="493" text-anchor="middle" font-family="${KR}" font-weight="700" font-size="26" fill="#fbf6ea">무료 · 가입 없이 바로 시작</text>
  <text x="64" y="572" font-family="${KR}" font-weight="500" font-size="22" fill="#6a6670">Every Minute Takes You Somewhere.</text>
  <g transform="translate(640 70) rotate(-5)"><rect x="-6" y="-6" width="492" height="338" rx="6" fill="#00000018"/><image href="${card("rio-de-janeiro", "buenos-aires", 39)}" width="480" height="328"/></g>
  <g transform="translate(700 260) rotate(4)"><rect x="-6" y="-6" width="492" height="338" rx="6" fill="#00000022"/><image href="${card("tokyo", "seoul", 23)}" width="480" height="328"/></g>
  <g transform="translate(580 440) rotate(-2)"><image href="${pass}" width="504" height="200"/></g>
</svg>`;
writeFileSync("/tmp/og.svg", svg);
execFileSync("rsvg-convert", ["-w", "1200", "-h", "630", "-o", "public/og.png", "/tmp/og.svg"]);
console.log("og image written");
