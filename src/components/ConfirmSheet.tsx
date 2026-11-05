"use client";
import { useRef } from "react";
import { BottomSheet } from "./BottomSheet";

/**
 * In-app confirmation (replaces window.confirm), built on the swipeable bottom sheet.
 * The safe choice gets focus first; Escape, a tap outside or a swipe down all choose it.
 */
export function ConfirmSheet({ open, title, body, confirmLabel, cancelLabel, destructive, onConfirm, onCancel }: {
  open: boolean; title: string; body?: string; confirmLabel: string; cancelLabel: string; destructive?: boolean;
  onConfirm: () => void; onCancel: () => void;
}) {
  const safeRef = useRef<HTMLButtonElement>(null);
  return (
    <BottomSheet open={open} onClose={onCancel} role="alertdialog" labelledBy="confirm-title" describedBy={body ? "confirm-body" : undefined} initialFocus={safeRef}>
      <div className="px-6 pb-6 pt-3 sm:pt-6">
        <h2 id="confirm-title" className="text-lg font-bold">{title}</h2>
        {body && <p id="confirm-body" className="mt-2 text-ink-soft">{body}</p>}
        <div className="mt-6 flex flex-col gap-2 sm:flex-row-reverse">
          <button ref={safeRef} onClick={onCancel} className="tap min-h-12 flex-1 rounded-xl bg-ink px-5 font-semibold text-paper">{cancelLabel}</button>
          <button onClick={onConfirm} className={`tap min-h-12 flex-1 rounded-xl border px-5 font-semibold ${destructive ? "border-accent text-accent" : "border-ink"}`}>{confirmLabel}</button>
        </div>
      </div>
    </BottomSheet>
  );
}
