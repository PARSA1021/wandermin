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

  if (!state) return <div className="grid min-h-dvh place-items-center text-ink-soft" aria-busy="true">WANDERMIN</div>;
  return <AppContext.Provider value={{ state, journey, dispatch, timeZone }}>{children}</AppContext.Provider>;
}

export function useApp(): Ctx {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp outside AppProvider");
  return ctx;
}
