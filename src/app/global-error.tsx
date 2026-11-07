"use client";
import { CrashScreen } from "@/components/CrashScreen";

/** The app shell itself failed (e.g. while loading saved data): still a calm screen with a way out. */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="ko">
      <body style={{ margin: 0 }}>
        <CrashScreen retry={() => { reset(); location.reload(); }} />
      </body>
    </html>
  );
}
