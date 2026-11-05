"use client";
/**
 * Make the system back button behave like a native app: it closes the open sheet or goes back one
 * onboarding step instead of leaving the app. Layers add a history entry (keeping Next's own state);
 * when a layer is closed from the UI, its entry is removed with history.back().
 */
type Fn = () => void;
let backPending = 0;
let queued: Fn[] = [];

if (typeof window !== "undefined") {
  window.addEventListener("popstate", () => {
    if (backPending > 0) backPending--;
    if (backPending === 0 && queued.length) {
      const run = queued; queued = [];
      // let React and the router settle on the restored entry first
      setTimeout(() => run.forEach((f) => f()), 0);
    }
  });
}

export const currentLayer = (): string | undefined => (typeof history !== "undefined" ? (history.state as { wmLayer?: string } | null)?.wmLayer : undefined);

export function pushLayer(id: string) {
  history.pushState({ ...(history.state ?? {}), wmLayer: id }, "");
}

/** Remove our own entry(ies) from the top of the history stack. */
export function popLayers(n = 1) {
  if (n <= 0) return;
  backPending++;
  history.go(-n);
}

/** Run `fn` once any layer entries being removed are gone (use before navigating away from a sheet). */
export function afterLayersClosed(fn: Fn) {
  if (backPending > 0) queued.push(fn);
  else fn();
}
