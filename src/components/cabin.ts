"use client";
/**
 * Audio for the flight: an opt-in looping cabin hum and a two-tone chime. Both files are
 * generated for WANDERMIN (no third-party audio). Playback must begin inside a user gesture
 * on iOS, so the Start button calls `cabin.start()` directly from its click handler.
 */
let hum: HTMLAudioElement | null = null;
let chime: HTMLAudioElement | null = null;

const pick = (name: string) => {
  const probe = document.createElement("audio");
  return probe.canPlayType("audio/mp4; codecs=mp4a.40.2") ? `/audio/${name}.m4a` : `/audio/${name}.mp3`;
};

function ensure() {
  if (typeof window === "undefined") return;
  if (!hum) { hum = new Audio(pick("cabin")); hum.loop = true; hum.volume = 0.35; hum.preload = "auto"; }
  if (!chime) { chime = new Audio(pick("chime")); chime.volume = 0.6; chime.preload = "auto"; }
}

export const cabin = {
  element(): HTMLAudioElement | null { ensure(); return hum; },
  async start() { ensure(); try { await hum!.play(); } catch { /* blocked: the user can tap play on the lock screen */ } },
  pause() { hum?.pause(); },
  stop() { if (hum) { hum.pause(); hum.currentTime = 0; } },
  playing() { return !!hum && !hum.paused; },
  async ding() { ensure(); try { chime!.currentTime = 0; await chime!.play(); } catch { /* not allowed without a gesture */ } },
};
