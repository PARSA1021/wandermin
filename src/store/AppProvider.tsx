"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { computeJourney, type Journey } from "@/features/travel/journey";
import { initialState, parseState, reduce, type Action, type AppState } from "./state";

const KEY = "wandermin.v1";

interface Ctx {
  state: AppState;
  journey: Journey | null;
  dispatch: (a: Action) => void;
  timeZone: string;
}

const AppContext = createContext<Ctx | null>(null);

function load(): AppState {
  try { return parseState(window.localStorage.getItem(KEY)); } catch { return initialState(); }
}
function save(s: AppState) {
  try { window.localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* private mode / quota: keep running in memory */ }
}

/**
 * Holds the whole app state, persists every change, reconciles the timer whenever the page
 * becomes visible again, and follows changes made in other tabs (storage events).
 */
export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState | null>(null);
  const ref = useRef<AppState | null>(null);

  const dispatch = useCallback((a: Action) => {
    const current = ref.current ?? load();
    const next = reduce(current, a);
    if (next === current) return;
    ref.current = next;
    save(next);
    setState(next);
  }, []);

  useEffect(() => {
    const s = reduce(load(), { type: "reconcile", now: Date.now() });
    ref.current = s;
    save(s);
    setState(s);
    try { navigator.storage?.persist?.(); } catch { /* best effort */ }
    const onStorage = (e: StorageEvent) => {
      if (e.key !== KEY) return;
      const s2 = parseState(e.newValue);
      ref.current = s2;
      setState(s2);
    };
    const onVisible = () => { if (document.visibilityState === "visible") dispatch({ type: "reconcile", now: Date.now() }); };
    window.addEventListener("storage", onStorage);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("pageshow", onVisible);
    return () => {
      window.removeEventListener("storage", onStorage);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("pageshow", onVisible);
    };
  }, [dispatch]);

  const journey = useMemo(() => (state?.plan ? computeJourney(state.plan, state.ledger) : null), [state?.plan, state?.ledger]);
  const timeZone = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC", []);

  if (!state) return <AppSkeleton />;
  return <AppContext.Provider value={{ state, journey, dispatch, timeZone }}>{children}</AppContext.Provider>;
}

export function useApp(): Ctx {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp outside AppProvider");
  return ctx;
}

/** Shown for the instant before saved data loads: the app's frame, so it never looks like a blank web page. */
function AppSkeleton() {
  return (
    <div className="min-h-dvh sm:flex" aria-busy="true" aria-label="WANDERMIN">
      <aside className="hidden h-dvh shrink-0 border-r border-line bg-card/60 sm:block sm:w-20 lg:w-60">
        <p className="px-6 pt-6 text-center text-sm font-black tracking-[0.18em] lg:text-left lg:text-lg">WANDERMIN</p>
        <div className="mt-6 flex flex-col gap-2 px-3">{[0, 1, 2, 3, 4].map((i) => <div key={i} className="skeleton h-12" />)}</div>
      </aside>
      <div className="mx-auto w-full max-w-5xl px-4 pt-6 sm:px-6 sm:pt-8 lg:px-10">
        <p className="text-xs font-black tracking-[0.25em] text-accent sm:hidden">WANDERMIN</p>
        <div className="skeleton mt-3 h-8 w-2/3" />
        <div className="skeleton mt-5 h-40" />
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">{[0, 1, 2, 3].map((i) => <div key={i} className="skeleton h-20" />)}</div>
      </div>
      <div className="fixed inset-x-0 bottom-0 h-16 border-t border-line bg-card/95 sm:hidden" />
    </div>
  );
}
