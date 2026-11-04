"use client";
import { memo } from "react";

/** Renders one of our generated pixel-art SVG strings (postcards, passes). Never user-supplied markup. */
export const Pixel = memo(function Pixel({ svg, label, className = "" }: { svg: string; label: string; className?: string }) {
  return <div className={`pixel ${className}`} role="img" aria-label={label} dangerouslySetInnerHTML={{ __html: svg }} />;
});
