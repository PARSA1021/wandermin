/// <reference lib="webworker" />
import { renderArt, type ArtJob } from "./render";
import { fadePixels } from "./fade";

declare const self: DedicatedWorkerGlobalScope;

/**
 * Draws a postcard or pass and, where OffscreenCanvas exists, encodes the PNG here too — so the main
 * thread only receives a finished Blob and never stalls a scroll or an animation for it.
 */
self.onmessage = async (e: MessageEvent<{ id: number; job: ArtJob }>) => {
  const { id, job } = e.data;
  try {
    const ghost = job.kind === "postcard" && !!job.ghost;
    const out = renderArt(ghost ? { ...job, ghost: undefined } : job);
    if (!out) { self.postMessage({ id, error: "no-scene" }); return; }
    if (ghost) fadePixels(out.pixels);
    if (typeof OffscreenCanvas !== "undefined") {
      try {
        const canvas = new OffscreenCanvas(out.width, out.height);
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.putImageData(new ImageData(out.pixels as Uint8ClampedArray<ArrayBuffer>, out.width, out.height), 0, 0);
          self.postMessage({ id, blob: await canvas.convertToBlob({ type: "image/png" }) });
          return;
        }
      } catch { /* fall back to sending pixels */ }
    }
    self.postMessage({ id, ...out }, [out.pixels.buffer]);
  } catch (err) {
    self.postMessage({ id, error: String(err) });
  }
};
