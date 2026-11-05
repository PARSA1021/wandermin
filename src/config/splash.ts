/** iPhone / iPad launch-screen sizes in device pixels (portrait) with their CSS size and pixel ratio. */
export const SPLASH_SIZES = [
  { w: 1320, h: 2868, cw: 440, ch: 956, dpr: 3 }, // 16 Pro Max
  { w: 1206, h: 2622, cw: 402, ch: 874, dpr: 3 }, // 16 Pro
  { w: 1290, h: 2796, cw: 430, ch: 932, dpr: 3 }, // 14–16 Plus / Pro Max
  { w: 1179, h: 2556, cw: 393, ch: 852, dpr: 3 }, // 14 Pro – 16
  { w: 1284, h: 2778, cw: 428, ch: 926, dpr: 3 }, // 12–14 Plus / Pro Max
  { w: 1170, h: 2532, cw: 390, ch: 844, dpr: 3 }, // 12–14
  { w: 1125, h: 2436, cw: 375, ch: 812, dpr: 3 }, // X / 11 Pro / mini
  { w: 828, h: 1792, cw: 414, ch: 896, dpr: 2 }, // XR / 11
  { w: 750, h: 1334, cw: 375, ch: 667, dpr: 2 }, // SE
  { w: 1640, h: 2360, cw: 820, ch: 1180, dpr: 2 }, // iPad Air
  { w: 2048, h: 2732, cw: 1024, ch: 1366, dpr: 2 }, // iPad Pro 12.9
] as const;

export const splashStartupImages = () =>
  SPLASH_SIZES.flatMap(({ w, h, cw, ch, dpr }) => (["portrait", "landscape"] as const).map((o) => ({
    url: o === "portrait" ? `/splash/${w}x${h}.png` : `/splash/${h}x${w}.png`,
    media: `(device-width: ${cw}px) and (device-height: ${ch}px) and (-webkit-device-pixel-ratio: ${dpr}) and (orientation: ${o})`,
  })));
