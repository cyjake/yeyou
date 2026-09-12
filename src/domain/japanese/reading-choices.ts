import type { TextToken } from '../document/schema';

export function readingChoices(token: TextToken): string[] {
  return Array.from(new Set(
    [...token.candidates, token.reading].filter((value): value is string => Boolean(value))
  ));
}

export function adjacentReading(choices: string[], current: string, offset: -1 | 1): string {
  if (choices.length < 2) return current;
  const currentIndex = Math.max(0, choices.indexOf(current));
  return choices[(currentIndex + offset + choices.length) % choices.length];
}
