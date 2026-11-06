import { useMemo } from "react";
import { FONT_5x7 } from "@/features/postcards/pixel/font";

/**
 * Text set in the app's own 5×7 bitmap font (the one on the postcards and passes), as one crisp SVG
 * path that scales with the surrounding font size. For digits and Latin caps; screen readers get `label`.
 */
export function PixelText({ text, className = "", height = "0.78em" }: { text: string; className?: string; height?: string }) {
  const { d, width } = useMemo(() => {
    const f = FONT_5x7;
    let x = 0, d = "";
    for (const ch of text.toUpperCase()) {
      const glyph = f.glyphs[ch];
      if (!glyph) { x += f.space + f.spacing; continue; }
      glyph.forEach((row, y) => { [...row].forEach((c, i) => { if (c === "#") d += `M${x + i} ${y}h1v1h-1z`; }); });
      x += (glyph[0]?.length ?? 0) + f.spacing;
    }
    return { d, width: Math.max(1, x - f.spacing) };
  }, [text]);
  return (
    <svg viewBox={`0 0 ${width} ${FONT_5x7.height}`} style={{ height, width: "auto" }} className={`inline-block align-baseline ${className}`} shapeRendering="crispEdges" aria-hidden="true" fill="currentColor">
      <path d={d} />
    </svg>
  );
}
