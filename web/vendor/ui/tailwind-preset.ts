/**
 * FILE: tailwind-preset.ts
 * PURPOSE: Tailwind preset exporting Ummat brand colors + Arabic font family.
 * INVARIANTS: hex values delegate to `./src/tokens` (which delegates to @ummat/brand).
 * REF: P8 STACK-PACKAGES T07.
 */

import type { Config } from 'tailwindcss';

import { colors, ummatFonts } from './src/tokens/index.js';

const preset: Partial<Config> = {
  theme: {
    extend: {
      colors: {
        ummat: {
          lime: colors.lime.DEFAULT,
          green: {
            mid: colors.green.mid,
            dark: colors.green.dark,
            deep: colors.green.deep,
          },
        },
      },
      fontFamily: {
        arabic: ummatFonts.arabic as unknown as string[],
      },
    },
  },
};

export default preset;
