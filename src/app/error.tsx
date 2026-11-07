"use client";
import { CrashScreen } from "@/components/CrashScreen";

/** A page that failed to render: offer a retry instead of a blank screen. */
export default function PageError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <CrashScreen retry={reset} />;
}
