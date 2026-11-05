"use client";
import { useApp } from "@/store/AppProvider";
import { useI18n } from "@/i18n/react";
import { buzz } from "./session";

/** After a flight with a to-do: "did you get it done?" — finished, or carry it to the next flight. */
export function NoteReview() {
  const { state, dispatch } = useApp();
  const { t } = useI18n();
  const s = state.noteReview && !state.active ? state.ledger.find((x) => x.id === state.noteReview) : undefined;
  if (!s?.note) return null;
  const answer = (done: boolean) => { buzz(done ? [15, 40, 25] : 10); dispatch({ type: "note-result", sessionId: s.id, done }); };
  return (
    <section className="rise rounded-2xl border border-line bg-card p-4" aria-labelledby="note-review-title">
      <p id="note-review-title" className="text-xs font-bold uppercase tracking-wider text-ink-soft">{t("note.reviewTitle")}</p>
      <p className="mt-1 text-lg font-semibold">“{s.note}”</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button onClick={() => answer(true)} className="tap min-h-12 rounded-xl bg-ok px-3 font-semibold text-paper">✓ {t("note.done")}</button>
        <button onClick={() => answer(false)} className="tap min-h-12 rounded-xl border border-ink px-3 font-semibold">{t("note.carry")}</button>
      </div>
    </section>
  );
}
