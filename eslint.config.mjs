import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { FlatCompat } from "@eslint/eslintrc";

const compat = new FlatCompat({ baseDirectory: dirname(fileURLToPath(import.meta.url)) });

const config = [
  { ignores: [".next/**", "out/**", "node_modules/**", "public/**", "next-env.d.ts"] },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    // the art is tiny pixel images made on the device (blob: URLs) and scaled up crisply with CSS;
    // next/image would resample and blur them and cannot optimise blob URLs anyway
    rules: { "@next/next/no-img-element": "off" },
  },
];

export default config;
