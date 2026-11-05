"use client";
/**
 * Client for the art worker. Finished images are small native-size PNGs (240×164 etc.), scaled up
 * crisply with CSS; they are kept in memory and in Cache Storage, so a postcard is drawn once per device.
 */
import { artKey, type ArtJob, type ArtResult } from "@/features/art/jobs";

const CACHE = "wm-art-v1";
const memory = new Map<string, Promise<string>>();
let worker: Worker | null | undefined;
let seq = 0;
const waiting = new Map<number, (r: ArtResult | null) => void>();

function getWorker(): Worker | null {
  if (worker !== undefined) return worker;
  try {
    worker = new Worker(new URL("../features/art/art.worker.ts", import.meta.url));
    worker.onmessage = (e: MessageEvent<{ id: number; error?: string } & Partial<ArtResult>>) => {
      const { id, error, width, height, pixels } = e.data;
      waiting.get(id)?.(error || !pixels ? null : { width: width!, height: height!, pixels });
      waiting.delete(id);
    };
  } catch {
    worker = null;
  }
  return worker;
}

async function render(job: ArtJob): Promise<ArtResult | null> {
  const w = getWorker();
  if (w) return new Promise((resolve) => { const id = ++seq; waiting.set(id, resolve); w.postMessage({ id, job }); });
  const { renderArt } = await import("@/features/art/render"); // no worker support: render here, still lazily loaded
  return renderArt(job);
}

function toPngBlob(r: ArtResult): Promise<Blob> {
  const c = document.createElement("canvas");
  c.width = r.width; c.height = r.height;
  c.getContext("2d")!.putImageData(new ImageData(new Uint8ClampedArray(r.pixels), r.width, r.height), 0, 0);
  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("toBlob"))), "image/png"));
}

const cacheUrl = (key: string) => `/__art/${encodeURIComponent(key)}.png`;

export function artUrl(job: ArtJob): Promise<string> {
  const key = artKey(job);
  const hit = memory.get(key);
  if (hit) return hit;
  const p = (async () => {
    try {
      const cache = await caches.open(CACHE);
      const stored = await cache.match(cacheUrl(key));
      if (stored) return URL.createObjectURL(await stored.blob());
    } catch { /* no Cache Storage (private mode): just render */ }
    const result = await render(job);
    if (!result) throw new Error("no art");
    const blob = await toPngBlob(result);
    if (job.kind === "postcard") {
      try { await (await caches.open(CACHE)).put(cacheUrl(key), new Response(blob, { headers: { "Content-Type": "image/png" } })); } catch { /* best effort */ }
    }
    return URL.createObjectURL(blob);
  })();
  memory.set(key, p);
  p.catch(() => memory.delete(key));
  if (memory.size > 150) memory.delete(memory.keys().next().value!);
  return p;
}

/** A large, crisp PNG for sharing or saving (pixel art scaled up without smoothing). */
export async function artPngFile(job: ArtJob, filename: string, scale = 5): Promise<File> {
  const url = await artUrl(job);
  const img = new Image();
  img.src = url;
  await img.decode();
  const c = document.createElement("canvas");
  c.width = img.naturalWidth * scale; c.height = img.naturalHeight * scale;
  const ctx = c.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, 0, 0, c.width, c.height);
  const blob = await new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("toBlob"))), "image/png"));
  return new File([blob], `${filename}.png`, { type: "image/png" });
}

/** Share through the phone's share sheet when it can take image files; otherwise download. */
export async function shareOrSave(job: ArtJob, filename: string, text: string): Promise<"shared" | "saved" | "cancelled"> {
  const file = await artPngFile(job, filename);
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (nav.share && nav.canShare?.({ files: [file] })) {
    try { await nav.share({ files: [file], title: "WANDERMIN", text }); return "shared"; }
    catch (e) { if ((e as Error).name === "AbortError") return "cancelled"; }
  }
  const a = document.createElement("a");
  a.href = URL.createObjectURL(file);
  a.download = file.name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  return "saved";
}
