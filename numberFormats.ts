/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AppLanguage } from '../types';

export const DEFAULT_NUMBER_FORMATS: Record<AppLanguage, string[]> = {
  en: ["0","1","2","3","4","5","6","7","8","9"],
  hi: ["०","१","२","३","४","५","६","७","८","९"],
  mr: ["०","१","२","३","४","५","६","७","८","९"],
  ur: ["۰","۱","۲","۳","۴","۵","۶","۷","۸","۹"],
  ar: ["٠","١","٢","٣","٤","٥","٦","٧","٨","٩"]
};

/**
 * Global cache of Realtime Database number formats, falls back to static defaults if not yet loaded.
 */
let syncedNumberFormats: Record<string, string[]> = { ...DEFAULT_NUMBER_FORMATS };

export function updateSyncedNumberFormats(formats: any) {
  if (formats && typeof formats === 'object') {
    Object.keys(formats).forEach((langKey) => {
      if (Array.isArray(formats[langKey])) {
        syncedNumberFormats[langKey] = formats[langKey];
      }
    });
  }
}

/**
 * Localizes all standard English digits (0-9) inside a given string/number
 * to the appropriate localized numerals.
 */
export function localizeDigits(input: string | number | undefined | null, lang: AppLanguage): string {
  if (input === undefined || input === null) return '';
  const str = String(input);
  const mapping = syncedNumberFormats[lang] || DEFAULT_NUMBER_FORMATS[lang] || DEFAULT_NUMBER_FORMATS.en;

  return str.replace(/[0-9]/g, (digit) => {
    const val = parseInt(digit, 10);
    return mapping[val] !== undefined ? mapping[val] : digit;
  });
}
