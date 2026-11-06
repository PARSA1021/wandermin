/**
 * The faded look of a city not visited yet — grey, a touch of sepia, low contrast — applied once to the
 * pixels (in place) instead of as a CSS filter, which a phone would otherwise redo on every scroll frame.
 */
export function fadePixels(p: Uint8ClampedArray): void {
  const tone = (v: number) => ((v - 128) * 0.7 + 128) * 1.08;
  for (let i = 0; i < p.length; i += 4) {
    const g = 0.299 * p[i]! + 0.587 * p[i + 1]! + 0.114 * p[i + 2]!;
    p[i] = tone(g + 0.35 * 22); p[i + 1] = tone(g + 0.35 * 8); p[i + 2] = tone(g - 0.35 * 14);
  }
}
