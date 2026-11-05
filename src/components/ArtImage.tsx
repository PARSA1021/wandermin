"use client";
import { useEffect, useRef, useState } from "react";
import { artKey, type ArtJob } from "@/features/art/jobs";
import { artUrl } from "./artClient";

const RATIO: Record<ArtJob["kind"], string> = { postcard: "240 / 164", pass: "252 / 100" };

/**
 * A postcard or boarding pass as a crisp pixel-art image. Drawn off the main thread, only when it
 * scrolls near the screen; keeps showing the previous image while a live pass updates.
 */
export function ArtImage({ job, alt, className = "", eager = false }: { job: ArtJob; alt: string; className?: string; eager?: boolean }) {
  const box = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(eager);
  const [src, setSrc] = useState<string | null>(null);
  const key = artKey(job);

  useEffect(() => {
    if (visible || !box.current) return;
    if (typeof IntersectionObserver === "undefined") { setVisible(true); return; }
    const io = new IntersectionObserver((entries) => { if (entries.some((e) => e.isIntersecting)) { setVisible(true); io.disconnect(); } }, { rootMargin: "300px" });
    io.observe(box.current);
    return () => io.disconnect();
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    let live = true;
    artUrl(job).then((u) => { if (live) setSrc(u); }).catch(() => {});
    return () => { live = false; };
  }, [visible, key]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div ref={box} className={`relative overflow-hidden ${className}`} style={{ aspectRatio: RATIO[job.kind] }}>
      {src ? (
        <img src={src} alt={alt} draggable={false} className="pixelated block h-full w-full select-none" />
      ) : (
        <div role="img" aria-label={alt} className="art-skeleton h-full w-full" />
      )}
    </div>
  );
}
