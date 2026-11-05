/// <reference lib="webworker" />
import { renderArt, type ArtJob } from "./render";

declare const self: DedicatedWorkerGlobalScope;

self.onmessage = (e: MessageEvent<{ id: number; job: ArtJob }>) => {
  const { id, job } = e.data;
  try {
    const out = renderArt(job);
    if (!out) { self.postMessage({ id, error: "no-scene" }); return; }
    self.postMessage({ id, ...out }, [out.pixels.buffer]);
  } catch (err) {
    self.postMessage({ id, error: String(err) });
  }
};
