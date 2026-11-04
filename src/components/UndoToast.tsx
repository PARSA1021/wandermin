"use client";
import { useEffect } from "react";
import { UNDO_MS } from "@/store/state";
import { useApp } from "@/store/AppProvider";
import { useI18n } from "@/i18n/react";
import { useNow } from "./hooks";

/** "Session cancelled · Undo" for a few seconds after cancelling. */
export function UndoToast() {
  const { state, dispatch } = useApp();
  const { t } = useI18n();
  const undo = state.undo;
  const now = useNow(250, !!undo);
  const left = undo ? UNDO_MS - (now - undo.cancelledAt) : 0;
  useEffect(() => {
    if (undo && left <= 0) dispatch({ type: "undo-cancel", now: Date.now() }); // expired: clears it
  }, [undo, left, dispatch]);
  if (!undo || left <= 0) return null;
  return (
    <div role="status" className="rise fixed inset-x-4 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-40 mx-auto flex max-w-md items-center gap-3 rounded-2xl bg-ink px-4 py-3 text-paper shadow-xl sm:bottom-6">
      <span className="flex-1 text-sm">{t("focus.cancelled")}</span>
      <button onClick={() => dispatch({ type: "undo-cancel", now: Date.now() })} className="min-h-10 rounded-lg px-3 font-bold text-[#f2cf6a] underline">{t("common.undo")}</button>
      <span className="h-1 w-10 overflow-hidden rounded-full bg-paper/20" aria-hidden="true"><span className="block h-full bg-paper/70" style={{ width: `${(left / UNDO_MS) * 100}%` }} /></span>
    </div>
  );
}
