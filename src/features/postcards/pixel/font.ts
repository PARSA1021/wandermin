import type { Color, PixelCanvas } from "./canvas";

/** Original bitmap fonts drawn for WANDERMIN (no external font licence needed). */
export interface BitmapFont {
  height: number;
  spacing: number;
  space: number;
  glyphs: Record<string, string[]>;
}

const g = (s: string) => s.split(" ");

/** 5×7 caps font for titles and body lines on postcards. */
export const FONT_5x7: BitmapFont = {
  height: 7,
  spacing: 1,
  space: 3,
  glyphs: {
    A: g(".###. #...# #...# ##### #...# #...# #...#"),
    B: g("####. #...# #...# ####. #...# #...# ####."),
    C: g(".###. #...# #.... #.... #.... #...# .###."),
    D: g("####. #...# #...# #...# #...# #...# ####."),
    E: g("##### #.... #.... ####. #.... #.... #####"),
    F: g("##### #.... #.... ####. #.... #.... #...."),
    G: g(".###. #...# #.... #.### #...# #...# .####"),
    H: g("#...# #...# #...# ##### #...# #...# #...#"),
    I: g("### .#. .#. .#. .#. .#. ###"),
    J: g("..### ...#. ...#. ...#. #..#. #..#. .##.."),
    K: g("#...# #..#. #.#.. ##... #.#.. #..#. #...#"),
    L: g("#.... #.... #.... #.... #.... #.... #####"),
    M: g("#...# ##.## #.#.# #.#.# #...# #...# #...#"),
    N: g("#...# #...# ##..# #.#.# #..## #...# #...#"),
    O: g(".###. #...# #...# #...# #...# #...# .###."),
    P: g("####. #...# #...# ####. #.... #.... #...."),
    Q: g(".###. #...# #...# #...# #.#.# #..#. .##.#"),
    R: g("####. #...# #...# ####. #.#.. #..#. #...#"),
    S: g(".#### #.... #.... .###. ....# ....# ####."),
    T: g("##### ..#.. ..#.. ..#.. ..#.. ..#.. ..#.."),
    U: g("#...# #...# #...# #...# #...# #...# .###."),
    V: g("#...# #...# #...# #...# #...# .#.#. ..#.."),
    W: g("#...# #...# #...# #.#.# #.#.# #.#.# .#.#."),
    X: g("#...# #...# .#.#. ..#.. .#.#. #...# #...#"),
    Y: g("#...# #...# .#.#. ..#.. ..#.. ..#.. ..#.."),
    Z: g("##### ....# ...#. ..#.. .#... #.... #####"),
    "0": g(".###. #...# #..## #.#.# ##..# #...# .###."),
    "1": g("..#.. .##.. ..#.. ..#.. ..#.. ..#.. .###."),
    "2": g(".###. #...# ....# ...#. ..#.. .#... #####"),
    "3": g("####. ....# ....# .###. ....# ....# ####."),
    "4": g("...#. ..##. .#.#. #..#. ##### ...#. ...#."),
    "5": g("##### #.... ####. ....# ....# #...# .###."),
    "6": g("..##. .#... #.... ####. #...# #...# .###."),
    "7": g("##### ....# ...#. ..#.. .#... .#... .#..."),
    "8": g(".###. #...# #...# .###. #...# #...# .###."),
    "9": g(".###. #...# #...# .#### ....# ...#. .##.."),
    ".": g(". . . . . . #"),
    ",": g(".. .. .. .. .. .# #."),
    ":": g(". # . . . # ."),
    "-": g("... ... ... ### ... ... ..."),
    "/": g("....# ....# ...#. ..#.. .#... #.... #...."),
    "'": g("# # . . . . ."),
    "&": g(".##.. #..#. .##.. .#... #.#.# #..#. .##.#"),
    "·": g(". . . # . . ."),
    "→": g("..... ..#.. ...#. ##### ...#. ..#.. ....."),
    "%": g("##..# ##..# ...#. ..#.. .#... #..## #..##"),
  },
};

/** 3×5 caps font for postmarks and fine print. */
export const FONT_3x5: BitmapFont = {
  height: 5,
  spacing: 1,
  space: 2,
  glyphs: {
    A: g(".#. #.# ### #.# #.#"), B: g("##. #.# ##. #.# ##."), C: g(".## #.. #.. #.. .##"),
    D: g("##. #.# #.# #.# ##."), E: g("### #.. ##. #.. ###"), F: g("### #.. ##. #.. #.."),
    G: g(".## #.. #.# #.# .##"), H: g("#.# #.# ### #.# #.#"), I: g("### .#. .#. .#. ###"),
    J: g("..# ..# ..# #.# .#."), K: g("#.# #.# ##. #.# #.#"), L: g("#.. #.. #.. #.. ###"),
    M: g("#.# ### ### #.# #.#"), N: g("##. #.# #.# #.# #.#"), O: g(".#. #.# #.# #.# .#."),
    P: g("##. #.# ##. #.. #.."), Q: g(".#. #.# #.# ##. .##"), R: g("##. #.# ##. #.# #.#"),
    S: g(".## #.. .#. ..# ##."), T: g("### .#. .#. .#. .#."), U: g("#.# #.# #.# #.# ###"),
    V: g("#.# #.# #.# #.# .#."), W: g("#.# #.# ### ### #.#"), X: g("#.# #.# .#. #.# #.#"),
    Y: g("#.# #.# .#. .#. .#."), Z: g("### ..# .#. #.. ###"),
    "0": g("### #.# #.# #.# ###"), "1": g(".#. ##. .#. .#. ###"), "2": g("##. ..# .#. #.. ###"),
    "3": g("##. ..# .#. ..# ##."), "4": g("#.# #.# ### ..# ..#"), "5": g("### #.. ##. ..# ##."),
    "6": g(".## #.. ### #.# ###"), "7": g("### ..# .#. .#. .#."), "8": g("### #.# ### #.# ###"),
    "9": g("### #.# ### ..# ##."),
    ".": g(". . . . #"), ",": g(". . . # #"), ":": g(". # . # ."), "-": g("... ... ### ... ..."),
    "·": g(". . # . ."), "→": g("... ..# ### ..# ..."), "/": g("..# ..# .#. #.. #.."), "'": g("# # . . ."),
    "%": g("#.# ..# .#. #.. #.#"),
  },
};

/** Upper-case and strip diacritics so "Türkiye" prints as "TURKIYE". */
export function normalizeForFont(text: string): string {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase();
}

export function canPrint(text: string, font: BitmapFont): boolean {
  return [...normalizeForFont(text)].every((ch) => ch === " " || ch in font.glyphs);
}

export function measureText(text: string, font: BitmapFont, scale = 1): number {
  const chars = [...normalizeForFont(text)];
  let w = 0;
  chars.forEach((ch, i) => {
    w += ch === " " ? font.space : (font.glyphs[ch]?.[0]?.length ?? 0);
    if (i < chars.length - 1) w += font.spacing;
  });
  return w * scale;
}

export interface TextStyle {
  font: BitmapFont;
  color: Color;
  scale?: number;
  /** Hard drop shadow, offset in art pixels. */
  shadow?: { color: Color; dx: number; dy: number };
}

/** Draw text with its top-left at (x, y). Returns the drawn width. Unknown glyphs throw. */
export function drawText(canvas: PixelCanvas, text: string, x: number, y: number, style: TextStyle): number {
  const s = style.scale ?? 1;
  const draw = (ox: number, oy: number, color: Color) => {
    let cx = ox;
    for (const ch of normalizeForFont(text)) {
      if (ch === " ") { cx += (style.font.space + style.font.spacing) * s; continue; }
      const rows = style.font.glyphs[ch];
      if (!rows) throw new Error(`Glyph missing for "${ch}"`);
      rows.forEach((row, ry) =>
        [...row].forEach((bit, rx) => { if (bit === "#") canvas.rect(cx + rx * s, oy + ry * s, s, s, color); }),
      );
      cx += (rows[0]!.length + style.font.spacing) * s;
    }
  };
  if (style.shadow) draw(x + style.shadow.dx, y + style.shadow.dy, style.shadow.color);
  draw(x, y, style.color);
  return measureText(text, style.font, s);
}
