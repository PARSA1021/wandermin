"use client";
/**
 * The picture on the lock-screen player card while flying (Media Session artwork). It is drawn large
 * (1024×1024) because iOS can show it full screen and Android uses it as the player background, so the
 * flight is visible before unlocking: destination scene, route, progress and the landing time.
 */
import { getCity } from "@/data";
import { artUrl } from "./artClient";
import { PLANE_BITS } from "./Takeoff";

export interface LockArtInput {
  fromId: string; toId: string; progress: number; bigLine: string; smallLine: string; timeZone: string; paused: boolean;
  /** Expected landing time: the scene's postmark shows the real landing date. */
  landsAt: number;
}

const load = (src: string) => new Promise<HTMLImageElement>((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });

export async function drawLockArt(o: LockArtInput): Promise<string | null> {
  try {
    const S = 1024, c = document.createElement("canvas");
    c.width = S; c.height = S;
    const g = c.getContext("2d");
    if (!g) return null;
    g.imageSmoothingEnabled = false;
    g.fillStyle = "#f4ecd8"; g.fillRect(0, 0, S, S);
    // destination scene: crop the illustration out of its postcard (8,8 → 224×108 art pixels)
    const url = await artUrl({ kind: "postcard", cityId: o.toId, fromId: o.fromId, arrivedAt: Math.floor(o.landsAt / 60_000) * 60_000, focusMinutesAtArrival: 0, timeZone: o.timeZone });
    if (url) {
      const img = await load(url);
      const k = img.width / 240;
      g.drawImage(img, 8 * k, 8 * k, 224 * k, 108 * k, 32, 40, 960, 463);
      g.strokeStyle = "#283152"; g.lineWidth = 6; g.strokeRect(32, 40, 960, 463);
    }
    const from = getCity(o.fromId), to = getCity(o.toId);
    const mono = "ui-monospace, Menlo, Consolas, monospace", sans = "-apple-system, 'Apple SD Gothic Neo', 'Noto Sans KR', system-ui, sans-serif";
    g.fillStyle = "#283152"; g.textBaseline = "alphabetic";
    g.font = `900 132px ${mono}`;
    g.textAlign = "left"; g.fillText(from.code, 56, 650);
    g.textAlign = "right"; g.fillText(to.code, S - 56, 650);
    // progress bar with the pixel plane riding it
    const x0 = 64, x1 = S - 64, y = 712, p = Math.max(0, Math.min(1, o.progress));
    g.fillStyle = "#e2d3b0"; g.fillRect(x0, y, x1 - x0, 18);
    g.fillStyle = o.paused ? "#8a8578" : "#b83a2b"; g.fillRect(x0, y, (x1 - x0) * p, 18);
    const px = x0 + (x1 - x0) * p - 36, py = y - 20;
    g.fillStyle = "#283152";
    PLANE_BITS.forEach((row, j) => [...row].forEach((b, i) => { if (b === "#") g.fillRect(px + i * 8, py + j * 8, 8, 8); }));
    // landing time (stays true even if the card isn't redrawn while locked) and the leg
    g.textAlign = "center";
    g.font = `800 92px ${sans}`; g.fillText(o.bigLine, S / 2, 868);
    g.fillStyle = "#5f5b66"; g.font = `600 40px ${sans}`; g.fillText(o.smallLine, S / 2, 936);
    g.font = `800 26px ${mono}`; g.fillText("W A N D E R M I N", S / 2, 994);
    return c.toDataURL("image/png");
  } catch {
    return null;
  }
}
