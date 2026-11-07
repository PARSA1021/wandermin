"use client";
/**
 * Shown instead of a blank "Application error" page if something breaks while rendering. Works without
 * the app's providers (they may be what broke): plain bilingual text, a retry, a way home, and a way to
 * save the travel record as a file first — the data itself is never touched here.
 */
export function CrashScreen({ retry }: { retry: () => void }) {
  const saveRecord = () => {
    try {
      const raw = localStorage.getItem("wandermin.v1") ?? "{}";
      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([raw], { type: "application/json" }));
      a.download = `wandermin-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a); a.click(); a.remove();
    } catch { /* storage blocked: nothing to save */ }
  };
  const btn = "min-h-12 rounded-xl px-5 font-semibold";
  return (
    <div role="alert" style={{ minHeight: "100dvh", display: "grid", placeItems: "center", padding: 24, background: "#f4ecd8", color: "#283152", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: 420, textAlign: "center" }}>
        <p style={{ fontSize: 40, margin: 0 }} aria-hidden="true">🛬</p>
        <h1 style={{ fontSize: 22, fontWeight: 800, margin: "12px 0 6px" }}>잠깐 문제가 생겼어요</h1>
        <p style={{ margin: 0, color: "#6f6b74" }}>여행 기록은 그대로 안전해요. 다시 시도해 주세요.</p>
        <p style={{ margin: "4px 0 0", color: "#6f6b74", fontSize: 14 }}>Something went wrong. Your travel record is safe.</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 20 }}>
          <button onClick={retry} className={btn} style={{ background: "#283152", color: "#f4ecd8" }}>다시 시도 · Try again</button>
          <button onClick={() => { location.href = "/"; }} className={btn} style={{ border: "1px solid #283152" }}>홈으로 · Home</button>
          <button onClick={saveRecord} className={btn} style={{ color: "#6f6b74", textDecoration: "underline" }}>기록 파일로 저장 · Save my record</button>
        </div>
      </div>
    </div>
  );
}
