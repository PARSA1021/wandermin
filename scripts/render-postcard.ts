/**
 * Render postcards from real data. Each card is the arrival after flying the leg from the
 * nearest connected departure city (else the nearest city) at the configured km/min rate.
 *   npm run postcard            → every illustrated city
 *   npm run postcard -- osaka   → one city
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { computeJourney } from "@/features/travel/journey";
import { GRAPH } from "@/features/travel/graph";
import { buildPostcardContent, renderPostcardSvg } from "@/features/postcards/template";
import { getScene, illustratedCityIds } from "@/features/postcards/scenes";
import { TRAVEL_CONFIG } from "@/config/travel";
import { getCity } from "@/data";

const ids = process.argv.slice(2).length ? process.argv.slice(2) : illustratedCityIds();
const completedAt = Date.parse("2026-11-04T13:30:00Z");
mkdirSync("out", { recursive: true });

for (const cityId of ids) {
  const scene = getScene(cityId);
  if (!scene) throw new Error(`No scene for ${cityId}`);
  const neighbours = [...GRAPH.get(cityId)!].sort((a, b) => a[1] - b[1]);
  const [fromId, km] = neighbours.find(([id]) => getCity(id).departure) ?? neighbours[0]!;
  const minutes = Math.ceil(km / TRAVEL_CONFIG.kmPerMinute);
  const j = computeJourney({ departureId: fromId, stops: [cityId] }, [
    { id: `sample-${cityId}`, completedAt, focusedMs: minutes * 60000, kmPerMinute: TRAVEL_CONFIG.kmPerMinute },
  ]);
  const a = j.arrivals[0]!;
  const content = buildPostcardContent({
    cityId, fromId: a.fromId, arrivedAt: a.arrivedAt, focusMinutesAtArrival: a.focusMinutesAtArrival, timeZone: "Asia/Seoul",
  });
  const svg = renderPostcardSvg(content, scene);
  writeFileSync(`out/postcard-${cityId}.svg`, svg);
  execFileSync("rsvg-convert", ["-w", "1440", "-o", `out/postcard-${cityId}.png`, `out/postcard-${cityId}.svg`]);
  console.log(`${cityId}: from ${fromId}, ${content.route.km} km, ${content.focusMinutes} min, ${Math.round(svg.length / 1024)} KB`);
}
