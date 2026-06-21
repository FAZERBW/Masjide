/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AppTheme } from '../types';

export interface ColorScheme {
  bg: string;
  card: string;
  text: string;
  textMuted: string;
  accent: string;
  accentLight: string;
  accentText: string;
  borderClass: string;
}

// Deeply eye-soothing premium Forest/Sage Green Midnight Dark Theme
const PREMIUM_GREEN_DARK_SCHEME: ColorScheme = {
  bg: 'bg-[#060a07] text-[#cbd5e0]',
  card: 'bg-[#0d1310]/95 border border-[#1b2620] shadow-[0_15px_40px_-5px_rgba(0,0,0,0.65)] text-[#f0f4f1]',
  text: 'text-[#f0f4f1]',
  textMuted: 'text-[#7c9081]',
  accent: 'emerald-400',
  accentLight: 'bg-[#132018] text-emerald-300 border border-emerald-500/20 shadow-md',
  accentText: 'text-emerald-300 drop-shadow-[0_0_6px_rgba(16,185,129,0.12)]',
  borderClass: 'border-[#1b2620]'
};

// Extremely eye-friendly, soft Mint-Cream Ivory Light Theme (no glare, ultra-luxurious)
const PREMIUM_GREEN_LIGHT_SCHEME: ColorScheme = {
  bg: 'bg-[#f3f7f4] text-[#243027]',
  card: 'bg-white border border-[#d6dfd9] shadow-[0_12px_32px_rgba(10,25,15,0.04)] text-[#243027]',
  text: 'text-[#1a241e] font-semibold',
  textMuted: 'text-[#536558] font-medium',
  accent: 'emerald-700',
  accentLight: 'bg-[#e6eee9] text-emerald-950 border border-[#cbd8cf]',
  accentText: 'text-emerald-800 font-bold',
  borderClass: 'border-[#d6dfd9]'
};

export const THEME_COLORS: Record<AppTheme, ColorScheme> = {
  'emerald-dark': PREMIUM_GREEN_DARK_SCHEME,
  'emerald-light': PREMIUM_GREEN_LIGHT_SCHEME,
  'gold-dark': PREMIUM_GREEN_DARK_SCHEME,
  'gold-light': PREMIUM_GREEN_LIGHT_SCHEME,
  'sky-dark': PREMIUM_GREEN_DARK_SCHEME,
  'sky-light': PREMIUM_GREEN_LIGHT_SCHEME,
  'rose-dark': PREMIUM_GREEN_DARK_SCHEME,
  'rose-light': PREMIUM_GREEN_LIGHT_SCHEME,
  'teal-dark': PREMIUM_GREEN_DARK_SCHEME,
  'teal-light': PREMIUM_GREEN_LIGHT_SCHEME,
  'indigo-dark': PREMIUM_GREEN_DARK_SCHEME,
  'indigo-light': PREMIUM_GREEN_LIGHT_SCHEME,
  'violet-dark': PREMIUM_GREEN_DARK_SCHEME,
  'violet-light': PREMIUM_GREEN_LIGHT_SCHEME,
  'amethyst-dark': PREMIUM_GREEN_DARK_SCHEME,
  'amethyst-light': PREMIUM_GREEN_LIGHT_SCHEME,
  'amber-dark': PREMIUM_GREEN_DARK_SCHEME,
  'amber-light': PREMIUM_GREEN_LIGHT_SCHEME,
  'crimson-dark': PREMIUM_GREEN_DARK_SCHEME,
  'crimson-light': PREMIUM_GREEN_LIGHT_SCHEME,
  'coral-dark': PREMIUM_GREEN_DARK_SCHEME,
  'coral-light': PREMIUM_GREEN_LIGHT_SCHEME,
  'slate-dark': PREMIUM_GREEN_DARK_SCHEME,
  'slate-light': PREMIUM_GREEN_LIGHT_SCHEME,
};
