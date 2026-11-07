"use client";
/**
 * Knowing whether a newer WANDERMIN is out, and updating to it. The running build is baked in at build
 * time; /version.json says what is deployed now. Updating = refresh the service worker and reload (pages
 * are network-first, so the reload brings the new build; the travel record lives in the browser and the
 * timer runs on timestamps, so nothing is lost, even mid-flight).
 */
export const CURRENT_BUILD = process.env.NEXT_PUBLIC_BUILD_ID ?? "dev";
export const CURRENT_BUILT_AT = process.env.NEXT_PUBLIC_BUILT_AT ?? null;

export type UpdateStatus = { kind: "idle" } | { kind: "checking" } | { kind: "latest" } | { kind: "available"; build: string; builtAt: string | null } | { kind: "offline" };

let status: UpdateStatus = { kind: "idle" };
const listeners = new Set<(s: UpdateStatus) => void>();
const set = (s: UpdateStatus) => { status = s; listeners.forEach((l) => l(s)); };
export const getUpdateStatus = () => status;
export function onUpdateStatus(l: (s: UpdateStatus) => void) { listeners.add(l); return () => { listeners.delete(l); }; }

let inflight: Promise<UpdateStatus> | null = null;
/** Ask the server which build is live. Never throws; offline or errors report "offline". */
export function checkForUpdate(): Promise<UpdateStatus> {
  if (inflight) return inflight;
  if (status.kind !== "available") set({ kind: "checking" });
  inflight = (async () => {
    try {
      const res = await fetch(`/version.json?t=${Date.now()}`, { cache: "no-store" });
      if (!res.ok) throw new Error(String(res.status));
      const live = (await res.json()) as { build?: string; builtAt?: string | null };
      const next: UpdateStatus = live.build && live.build !== CURRENT_BUILD ? { kind: "available", build: live.build, builtAt: live.builtAt ?? null } : { kind: "latest" };
      set(next);
      return next;
    } catch {
      const next: UpdateStatus = { kind: "offline" };
      set(next);
      return next;
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

/** Fetch the new service worker too, then reload into the new build. */
export async function applyUpdate() {
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    await Promise.race([reg?.update(), new Promise((r) => setTimeout(r, 3000))]);
  } catch { /* the reload alone is enough */ }
  try { sessionStorage.setItem("wm-updating", "1"); } catch { /* private mode */ }
  location.reload();
}

/** "2026.11.07 · bcac680" for people; the date in their own time zone. */
export function versionLabel(build: string, builtAt: string | null) {
  if (!builtAt) return build;
  const d = new Date(builtAt);
  if (Number.isNaN(d.getTime())) return build;
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")} · ${build}`;
}
