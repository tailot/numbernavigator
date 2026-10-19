/**
 * @file parse-number.ts
 * @description Converts a speech transcript into a number (0-200).
 * Chrome usually transcribes spoken numbers as DIGITS ("21"), sometimes as words ("twenty-one"),
 * so both are supported, including Eastern Arabic and full-width digits.
 */
import { numberWordMaps } from './number-words';

export const MAX_SPOKEN_NUMBER = 200;

/** Maps Eastern Arabic (٠-٩), Devanagari (०-९), and full-width (０-９) digits to ASCII digits. */
function normalizeDigits(text: string): string {
  return text
    .replace(/[٠-٩]/g, (c) => String(c.charCodeAt(0) - 0x0660))
    .replace(/[०-९]/g, (c) => String(c.charCodeAt(0) - 0x0966))
    .replace(/[０-９]/g, (c) => String(c.charCodeAt(0) - 0xff10));
}

/**
 * @param transcript raw transcript from the speech recognizer
 * @param langCode   language code ("en", "it", ...)
 * @returns the number, or null when no number in 0-200 was found
 */
export function parseSpokenNumber(transcript: string, langCode: string): number | null {
  const map = numberWordMaps[langCode.split('-')[0]] ?? {};
  const cleaned = normalizeDigits(transcript.toLowerCase())
    .replace(/[.,!?;:¿¡。、]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned) return null;

  const fromDigits = (token: string): number | null => {
    if (!/^\d{1,3}$/.test(token)) return null;
    const n = parseInt(token, 10);
    return n <= MAX_SPOKEN_NUMBER ? n : null;
  };

  // 1. whole utterance
  const whole = fromDigits(cleaned) ?? map[cleaned];
  if (whole !== undefined && whole !== null) return whole;

  // 2. Languages written without spaces (ja/ar) or phrases such as "number twenty one":
  //    try word windows from longest to shortest, scanning left to right.
  const tokens = cleaned.split(' ');
  for (let size = Math.min(4, tokens.length); size >= 1; size--) {
    for (let start = 0; start + size <= tokens.length; start++) {
      const chunk = tokens.slice(start, start + size).join(' ');
      const value = fromDigits(chunk) ?? map[chunk];
      if (value !== undefined && value !== null) return value;
    }
  }
  return null;
}
