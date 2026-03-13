import { describe, expect, it } from 'vitest';
import { calculateAgeFromDateOfBirth } from './dateOfBirth';

describe('calculateAgeFromDateOfBirth', () => {
  it('returns undefined for missing values', () => {
    expect(calculateAgeFromDateOfBirth(null)).toBeUndefined();
    expect(calculateAgeFromDateOfBirth(undefined)).toBeUndefined();
    expect(calculateAgeFromDateOfBirth('')).toBeUndefined();
  });

  it('returns undefined for invalid or future dates', () => {
    const now = new Date(2026, 2, 12, 12, 0, 0);
    expect(calculateAgeFromDateOfBirth('invalid-date', now)).toBeUndefined();
    expect(calculateAgeFromDateOfBirth('1997-99-99T00:00:00.000Z', now)).toBeUndefined();
    expect(calculateAgeFromDateOfBirth('2030-01-01', now)).toBeUndefined();
  });

  it('accepts ISO DateTime values and computes age from date part', () => {
    const now = new Date(2026, 2, 12, 12, 0, 0);

    expect(calculateAgeFromDateOfBirth('1997-08-12T00:00:00.000Z', now)).toBe(28);
    expect(calculateAgeFromDateOfBirth('1997-08-12T23:59:59-06:00', now)).toBe(28);
  });

  it('calculates full years correctly around birthday boundary', () => {
    const now = new Date(2026, 2, 12, 12, 0, 0);

    expect(calculateAgeFromDateOfBirth('2000-03-11', now)).toBe(26);
    expect(calculateAgeFromDateOfBirth('2000-03-12', now)).toBe(26);
    expect(calculateAgeFromDateOfBirth('2000-03-13', now)).toBe(25);
  });
});
