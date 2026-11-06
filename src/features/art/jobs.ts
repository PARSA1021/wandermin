/** Art job shapes and cache keys — kept free of drawing code so the UI can import them without pulling in the scenes. */
import type { BoardingPassInput } from "@/features/tickets/boarding-pass";

export interface PostcardJob { kind: "postcard"; cityId: string; fromId: string; arrivedAt: number; focusMinutesAtArrival: number; timeZone: string; /** Faded "not yet visited" look, baked into the pixels. */ ghost?: boolean }
export interface PassJob { kind: "pass"; input: BoardingPassInput }
export type ArtJob = PostcardJob | PassJob;
export interface ArtResult { width: number; height: number; pixels: Uint8ClampedArray }

/** Stable cache key for a job (ignores sub-15-second changes to live minutes). */
export function artKey(job: ArtJob): string {
  if (job.kind === "postcard") return `pc|${job.cityId}|${job.fromId}|${job.arrivedAt}|${Math.round(job.focusMinutesAtArrival)}|${job.timeZone}${job.ghost ? "|g" : ""}`;
  const i = job.input;
  return `bp3|${i.fromId}|${i.toId}|${i.boardedAt}|${Math.floor(i.minutesFlown * 4)}|${i.sessions}|${i.arrivedAt ?? ""}|${i.timeZone}`;
}
