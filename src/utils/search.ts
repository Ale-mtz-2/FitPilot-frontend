const DIACRITICS_REGEX = /[\u0300-\u036f]/g;

export interface SearchNormalizationOptions {
    ignoreSpaces?: boolean;
}

const toSearchString = (value: unknown): string => {
    if (typeof value === 'string') {
        return value;
    }

    if (typeof value === 'number') {
        return String(value);
    }

    return '';
};

export const normalizeSearchText = (
    value: unknown,
    options: SearchNormalizationOptions = {},
): string => {
    const normalized = toSearchString(value)
        .normalize('NFD')
        .replace(DIACRITICS_REGEX, '')
        .toLowerCase()
        .trim();

    if (options.ignoreSpaces) {
        return normalized.replace(/\s+/g, '');
    }

    return normalized.replace(/\s+/g, ' ');
};

export const matchesNormalizedQuery = (
    value: unknown,
    query: string,
    options: SearchNormalizationOptions = {},
): boolean => {
    const normalizedQuery = normalizeSearchText(query, options);
    if (!normalizedQuery) {
        return true;
    }

    return normalizeSearchText(value, options).includes(normalizedQuery);
};

export const matchesAnyNormalizedQuery = (
    values: unknown[],
    query: string,
    options: SearchNormalizationOptions = {},
): boolean => {
    const normalizedQuery = normalizeSearchText(query, options);
    if (!normalizedQuery) {
        return true;
    }

    return values.some((value) =>
        normalizeSearchText(value, options).includes(normalizedQuery),
    );
};
