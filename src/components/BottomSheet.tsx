"use client";
import { useEffect, useRef, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";
import { currentLayer, popLayers, pushLayer } from "./backStack";

/**
 * Native-feeling sheet: slides up from the bottom on phones (a centred card on larger screens),
 * has a grab handle, and closes with a downward swipe, Escape or a tap on the backdrop.
 * Page scroll is locked while it is open.
 */
export function BottomSheet({ open, onClose, labelledBy, describedBy, role = "dialog", initialFocus, children, wide = false, dismissible = true }: {
  open: boolean; onClose: () => void; labelledBy: string; describedBy?: string; role?: "dialog" | "alertdialog";
  initialFocus?: RefObject<HTMLElement | null>; children: ReactNode; wide?: boolean; dismissible?: boolean;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const backdrop = useRef<HTMLDivElement>(null);
  // the swipe moves the sheet by writing its transform directly, once per frame — no React render per
  // touch event, so dragging stays smooth even with a big postcard inside
  const drag = useRef<{ y: number; t: number; dy: number } | null>(null);
  const frame = useRef(0);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    (initialFocus?.current ?? panel.current)?.focus();
    const root = document.documentElement;
    const prevOverflow = root.style.overflow;
    root.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && dismissible) closeRef.current(); };
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("keydown", onKey); root.style.overflow = prevOverflow; previous?.focus?.(); cancelAnimationFrame(frame.current); };
  }, [open, dismissible]); // eslint-disable-line react-hooks/exhaustive-deps

  // the system back button closes the sheet (Android, browser back, iOS edge swipe in the browser)
  useEffect(() => {
    if (!open) return;
    const id = `sheet-${Math.random().toString(36).slice(2)}`;
    let mine = true;
    pushLayer(id);
    const onPop = () => {
      if (mine && currentLayer() !== id) { mine = false; closeRef.current(); }
    };
    window.addEventListener("popstate", onPop);
    return () => {
      window.removeEventListener("popstate", onPop);
      // closed from the UI: take our history entry off the stack again
      if (mine && currentLayer() === id) popLayers(1);
    };
  }, [open]);

  if (!open) return null;

  const start = (y: number) => {
    // only start a swipe when the sheet's own content is scrolled to the top
    if (!dismissible || (panel.current && panel.current.scrollTop > 0)) return;
    drag.current = { y, t: performance.now(), dy: 0 };
    if (panel.current) panel.current.style.animation = "none"; // the entry animation's fill would override the drag
  };
  const place = (dy: number, settle: boolean) => {
    const p = panel.current;
    if (!p) return;
    p.style.transition = settle ? "transform .25s cubic-bezier(.2,.8,.2,1)" : "none";
    p.style.transform = dy ? `translate3d(0, ${dy}px, 0)` : "";
    if (backdrop.current) backdrop.current.style.opacity = String(Math.max(0.2, 1 - dy / 400));
  };
  const move = (y: number) => {
    const d = drag.current;
    if (!d) return;
    d.dy = Math.max(0, y - d.y);
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => place(d.dy, false));
  };
  const end = (y: number) => {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    cancelAnimationFrame(frame.current);
    const dist = Math.max(0, y - d.y), speed = dist / Math.max(1, performance.now() - d.t);
    if (dist > 110 || speed > 0.7) closeRef.current();
    else place(0, true);
  };

  // portalled to <body> so page transitions (which create stacking contexts) can't put the tab bar on top
  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-end justify-center pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)] sm:items-center sm:p-6 short:p-2" role="presentation">
      <div ref={backdrop} className="sheet-backdrop absolute inset-0 bg-black/50" onClick={() => dismissible && onClose()} />
      <div ref={panel} role={role} aria-modal="true" aria-labelledby={labelledBy} aria-describedby={describedBy} tabIndex={-1}
        onTouchStart={(e) => start(e.touches[0]!.clientY)} onTouchMove={(e) => move(e.touches[0]!.clientY)} onTouchEnd={(e) => end(e.changedTouches[0]!.clientY)}
        className={`sheet-panel relative max-h-[92dvh] w-full overflow-y-auto overscroll-contain rounded-t-3xl bg-card pb-[env(safe-area-inset-bottom)] shadow-2xl outline-none sm:rounded-3xl sm:pb-0 ${wide ? "sm:max-w-2xl wideland:max-w-4xl" : "sm:max-w-md"} short:max-h-[96dvh]`}>
        {dismissible && (
          <div className="sticky top-0 z-10 flex justify-center bg-card pb-1 pt-2 sm:hidden" aria-hidden="true">
            <span className="h-1.5 w-10 rounded-full bg-line" />
          </div>
        )}
        {children}
      </div>
    </div>,
    document.body,
  );
}
