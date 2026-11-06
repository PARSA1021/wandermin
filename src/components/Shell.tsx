"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useApp } from "@/store/AppProvider";
import { useI18n } from "@/i18n/react";
import { formatClock, remainingMs } from "@/features/focus/timer";
import type { MessageKey } from "@/i18n";
import { secondPhase, useNow } from "./hooks";
import { UndoToast } from "./UndoToast";
import { buzz } from "./session";
import { getCity } from "@/data";

const NAV: { href: string; key: MessageKey; icon: ReactNode }[] = [
  { href: "/", key: "nav.home", icon: <path d="M3 11.5 12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" /> },
  { href: "/map", key: "nav.map", icon: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.8 3 2.8 15 0 18M12 3c-2.8 3-2.8 15 0 18" /></> },
  { href: "/focus", key: "nav.focus", icon: <><circle cx="12" cy="13" r="8" /><path d="M12 9v4l2.5 2.5M9.5 2.5h5" /></> },
  { href: "/journal", key: "nav.journal", icon: <><path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z" /><path d="M5 17a3 3 0 0 1 3-3h11" /></> },
  { href: "/profile", key: "nav.profile", icon: <><path d="M4 7h9M17 7h3M4 17h3M11 17h9" /><circle cx="15" cy="7" r="2" /><circle cx="9" cy="17" r="2" /></> },
];

const Icon = ({ children }: { children: ReactNode }) => (
  <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>
);

/** Small live timer shown outside the focus screen while a session runs. */
function SessionChip() {
  const { state } = useApp();
  const { t } = useI18n();
  const active = state.active;
  const now = useNow(1000, !!active && !active.pausedAt, secondPhase(active));
  if (!active) return null;
  return (
    <Link href="/focus" className="inline-flex min-h-10 items-center gap-2 rounded-full bg-ink px-3 py-1.5 text-sm font-semibold text-paper tabular">
      <span className={`h-2 w-2 rounded-full ${active.pausedAt ? "bg-paper-deep" : "bg-[#7fd18f]"}`} />
      {formatClock(remainingMs(active, now))}
      <span className="sr-only">{active.pausedAt ? t("focus.paused") : t("nav.focus")}</span>
    </Link>
  );
}

/** Remaining time in the browser tab title while a session runs (useful on desktop). */
function TabTitle() {
  const { state, journey } = useApp();
  const { t, name } = useI18n();
  const active = state.active;
  const now = useNow(1000, !!active && !active.pausedAt, secondPhase(active));
  useEffect(() => {
    if (!active) { document.title = "WANDERMIN"; return; }
    const where = active.kind === "break" ? t("focus.onBreak") : journey?.currentLeg ? `→ ${name(getCity(journey.currentLeg.toId).name)}` : "";
    document.title = `${active.pausedAt ? "⏸ " : ""}${formatClock(remainingMs(active, now))} ${where} · WANDERMIN`;
  });
  useEffect(() => () => { document.title = "WANDERMIN"; }, []);
  return null;
}

export function Shell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { state } = useApp();
  const { t } = useI18n();
  // distraction-free focus screen on phones while a session runs
  // and during first-run onboarding, which is its own full-screen flow
  // the welcome flow (shown on the main tabs until a trip exists) hides the tabs; Profile always keeps them
  const immersive = (pathname === "/focus" && !!state.active) || (!state.plan && !pathname.startsWith("/profile"));

  useEffect(() => {
    document.documentElement.dataset.motion = state.settings.reduceMotion ? "reduce" : "full";
  }, [state.settings.reduceMotion]);

  // light / dark / follow the device (and keep following it if it changes)
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const theme = state.settings.theme;
      document.documentElement.dataset.theme = theme === "dark" || (theme === "system" && mq.matches) ? "dark" : "light";
    };
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [state.settings.theme]);

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <div className="min-h-dvh sm:flex">
      <TabTitle />
      <UndoToast />
      {/* tablet rail / desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh shrink-0 flex-col overflow-y-auto border-r border-line bg-card/60 pl-[env(safe-area-inset-left)] sm:flex sm:w-[calc(5rem+env(safe-area-inset-left))] lg:w-60">
        <div className="px-3 pb-6 pt-6 lg:px-6">
          <div className="text-center text-sm font-black tracking-[0.18em] text-ink lg:text-left lg:text-lg">
            <span className="lg:hidden">WM</span><span className="hidden lg:inline">WANDERMIN</span>
          </div>
          <p className="mt-1 hidden text-xs text-ink-soft lg:block">{t("app.slogan")}</p>
        </div>
        <nav aria-label="Main" className="flex flex-1 flex-col gap-1 px-2 lg:px-3">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} aria-current={isActive(n.href) ? "page" : undefined}
              className={`flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl px-2 py-2 text-[11px] font-medium transition-colors lg:flex-row lg:justify-start lg:gap-3 lg:px-3 lg:text-sm ${isActive(n.href) ? "bg-ink text-paper" : "text-ink-soft hover:bg-paper-deep hover:text-ink"}`}>
              <Icon>{n.icon}</Icon>
              <span className="leading-tight">{t(n.key)}</span>
            </Link>
          ))}
        </nav>
        <div className="hidden p-4 lg:block"><SessionChip /></div>
      </aside>

      <div className="min-w-0 flex-1">
        {!immersive && pathname !== "/focus" && state.active && (
          <div className="sticky top-0 z-20 flex justify-end px-4 pt-3 lg:hidden"><SessionChip /></div>
        )}
        <main key={pathname} className={`page-in mx-auto w-full max-w-5xl px-4 pt-[max(1rem,env(safe-area-inset-top))] pr-[max(1rem,env(safe-area-inset-right))] sm:px-6 sm:pt-8 sm:pr-[max(1.5rem,env(safe-area-inset-right))] lg:px-10 short:pt-3 ${immersive ? "pb-8" : "pb-28 sm:pb-10"}`}>{children}</main>
      </div>

      {/* phone bottom tabs */}
      {!immersive && (
        <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-card pb-[env(safe-area-inset-bottom)] sm:hidden">
          <ul className="grid grid-cols-5">
            {NAV.map((n) => (
              <li key={n.href}>
                <Link href={n.href} aria-current={isActive(n.href) ? "page" : undefined} onClick={() => { if (!isActive(n.href)) buzz(8); }}
                  className={`tap flex min-h-16 flex-col items-center justify-center gap-0.5 text-[11px] font-medium ${isActive(n.href) ? "text-accent" : "text-ink-soft"}`}>
                  <span className={`grid h-8 w-14 place-items-center rounded-full transition-colors ${isActive(n.href) ? "bg-accent/15" : ""}`}><Icon>{n.icon}</Icon></span>
                  <span className={`max-w-full truncate px-1 ${isActive(n.href) ? "font-bold" : ""}`}>{t(n.key)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </div>
  );
}
