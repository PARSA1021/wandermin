"use client";
import { useEffect, useRef } from "react";

/**
 * In-app confirmation (replaces window.confirm): a bottom sheet on phones, a centred card on larger
 * screens. The safe choice gets focus first; Escape and a tap outside both choose it.
 */
export function ConfirmSheet({ open, title, body, confirmLabel, cancelLabel, destructive, onConfirm, onCancel }: {
  open: boolean; title: string; body?: string; confirmLabel: string; cancelLabel: string; destructive?: boolean;
  onConfirm: () => void; onCancel: () => void;
}) {
  const safeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    safeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onCancel(); };
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("keydown", onKey); previous?.focus?.(); };
  }, [open, onCancel]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 sm:items-center" onClick={onCancel}>
      <div role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" aria-describedby={body ? "confirm-body" : undefined}
        onClick={(e) => e.stopPropagation()}
        className="rise w-full max-w-md rounded-t-3xl bg-card p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-2xl sm:rounded-3xl sm:pb-6">
        <h2 id="confirm-title" className="text-lg font-bold">{title}</h2>
        {body && <p id="confirm-body" className="mt-2 text-ink-soft">{body}</p>}
        <div className="mt-6 flex flex-col gap-2 sm:flex-row-reverse">
          <button ref={safeRef} onClick={onCancel} className="min-h-12 flex-1 rounded-xl bg-ink px-5 font-semibold text-paper">{cancelLabel}</button>
          <button onClick={onConfirm} className={`min-h-12 flex-1 rounded-xl border px-5 font-semibold ${destructive ? "border-accent text-accent" : "border-ink"}`}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}
