/**
 * Pure art rendering for the UI: builds the pixel canvas for a postcard or a boarding pass and
 * returns raw RGBA pixels. Runs inside a Web Worker (see art.worker.ts), so the 30 illustrated
 * scenes never load on — or block — the main thread.
 */
import { buildPostcardContent, composePostcard, CARD_W, CARD_H } from "@/features/postcards/template";
import { getScene } from "@/features/postcards/scenes";
import { buildBoardingPass, composeBoardingPass, passAccent, PASS_W, PASS_H, type BoardingPassInput } from "@/features/tickets/boarding-pass";

import type { ArtJob, ArtResult } from "./jobs";
export type { ArtJob, ArtResult, PassJob, PostcardJob } from "./jobs";
export { artKey } from "./jobs";

export function renderArt(job: ArtJob): ArtResult | null {
  if (job.kind === "postcard") {
    const scene = getScene(job.cityId);
    if (!scene) return null;
    const card = composePostcard(buildPostcardContent(job), scene);
    return { width: CARD_W, height: CARD_H, pixels: card.toRGBA() };
  }
  const pass = composeBoardingPass(buildBoardingPass(job.input), passAccent(job.input.toId));
  return { width: PASS_W, height: PASS_H, pixels: pass.toRGBA() };
}
