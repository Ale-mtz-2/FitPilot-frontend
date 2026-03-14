import { describe, expect, it } from 'vitest';
import {
    matchesAnyNormalizedQuery,
    matchesNormalizedQuery,
    normalizeSearchText,
} from './search';

describe('search utils', () => {
    it('normalizes accents and casing', () => {
        expect(normalizeSearchText(' Plátano ')).toBe('platano');
        expect(normalizeSearchText('ARÁNDANO')).toBe('arandano');
    });

    it('matches values without requiring accents', () => {
        expect(matchesNormalizedQuery('Plátano macho', 'platano')).toBe(true);
        expect(matchesNormalizedQuery('Arándano', 'arandano')).toBe(true);
    });

    it('can ignore spaces when requested', () => {
        expect(
            matchesNormalizedQuery('María José', 'mariajose', { ignoreSpaces: true }),
        ).toBe(true);
    });

    it('matches any candidate field', () => {
        expect(
            matchesAnyNormalizedQuery(['Sin marca', 'Yogurt griego'], 'yogurt'),
        ).toBe(true);
    });
});
