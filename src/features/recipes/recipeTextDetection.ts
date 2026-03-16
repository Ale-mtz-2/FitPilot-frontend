import type { FoodSearchResult, IFoodItem } from '@/features/foods/types';
import { normalizeSearchText } from '@/utils/search';

const PREPARATION_SECTION_PREFIXES = [
    'preparacion',
    'procedimiento',
    'instrucciones',
    'elaboracion',
    'proceso',
    'pasos',
    'modo de preparacion',
    'sugerencia para servir',
    'servir',
];

const NOUN_STOPWORDS = new Set([
    'de',
    'del',
    'la',
    'las',
    'el',
    'los',
    'y',
    'e',
    'o',
    'u',
    'con',
    'sin',
    'para',
    'por',
    'al',
    'a',
    'en',
]);

const DESCRIPTOR_PATTERNS = [
    /\bal gusto\b/gi,
    /\bopcional(?:es)?\b/gi,
    /\bpara servir\b/gi,
    /\bpara decorar\b/gi,
    /\bpicad[oa]s?\b/gi,
    /\brallad[oa]s?\b/gi,
    /\btriturad[oa]s?\b/gi,
    /\brebanad[oa]s?\b/gi,
    /\bdeshebrad[oa]s?\b/gi,
    /\bdesmenuzad[oa]s?\b/gi,
    /\bfinamente\b/gi,
    /\bfresc[oa]s?\b/gi,
    /\bcocid[oa]s?\b/gi,
    /\bnatural(?:es)?\b/gi,
    /\ben cubos?\b/gi,
    /\ben trozos?\b/gi,
    /\ben rodajas?\b/gi,
    /\ben tiras?\b/gi,
    /\bsin piel\b/gi,
    /\bsin hueso\b/gi,
];

const QUANTITY_PREFIX_REGEX =
    /^(?:(?:\d+(?:[.,]\d+)?|\d+\/\d+|[¼½¾⅓⅔])\s*(?:a\s*(?:\d+(?:[.,]\d+)?|\d+\/\d+|[¼½¾⅓⅔]))?\s*(?:kg|kilo(?:s)?|g|gr|gramos?|ml|l|litros?|tazas?|cucharadas?|cucharaditas?|cdas?|cdtas?|piezas?|pieza|pechugas?|muslos?|rebanadas?|ramas?|dientes?|latas?|sobres?|paquetes?|porciones?|filetes?|lonchas?|pizcas?)?\s*(?:de|del)?\s*)+/i;

type IndexedFood = {
    food: FoodSearchResult;
    normalizedName: string;
    normalizedMorphName: string;
    tokens: string[];
};

type CanonicalUnit =
    | 'g'
    | 'kg'
    | 'ml'
    | 'l'
    | 'taza'
    | 'cucharada'
    | 'cucharadita'
    | 'pieza'
    | 'pechuga'
    | 'muslo'
    | 'rebanada'
    | 'filete'
    | 'loncha'
    | 'diente'
    | 'rama'
    | 'lata'
    | 'sobre'
    | 'paquete'
    | 'porcion'
    | 'rodaja';

type SemanticPieceUnit = 'pechuga' | 'muslo' | 'filete' | 'rebanada';

type ParsedMeasurement = {
    amount: number;
    unit: CanonicalUnit | null;
    semanticPieceUnit: SemanticPieceUnit | null;
    hasIngredientConnector: boolean;
};

type DetectedIngredientCandidate = {
    raw: string;
    name: string;
    measurement: ParsedMeasurement | null;
};

export interface DetectedRecipeIngredient {
    food: FoodSearchResult;
    quantity: number | null;
    servingUnitId: number | null;
    rawIngredient: string;
}

export interface RecipeTextDetectionResult {
    detectedTitle: string | null;
    matchedIngredients: DetectedRecipeIngredient[];
    unmatchedIngredients: string[];
}

const UNICODE_FRACTIONS: Record<string, number> = {
    '¼': 0.25,
    '½': 0.5,
    '¾': 0.75,
    '⅓': 1 / 3,
    '⅔': 2 / 3,
    '⅛': 0.125,
    '⅜': 0.375,
    '⅝': 0.625,
    '⅞': 0.875,
};

const CANONICAL_UNIT_ALIASES: Record<CanonicalUnit, string[]> = {
    g: ['g', 'gr', 'gramo', 'gramos'],
    kg: ['kg', 'kilo', 'kilos', 'kilogramo', 'kilogramos'],
    ml: ['ml', 'mililitro', 'mililitros'],
    l: ['l', 'lt', 'litro', 'litros'],
    taza: ['taza', 'tazas', 'cup', 'cups'],
    cucharada: ['cucharada', 'cucharadas', 'cda', 'cdas', 'tbsp', 'tablespoon', 'tablespoons'],
    cucharadita: ['cucharadita', 'cucharaditas', 'cdta', 'cdtas', 'tsp', 'teaspoon', 'teaspoons'],
    pieza: ['pieza', 'piezas', 'pza', 'pzas', 'pz', 'unidad', 'unidades', 'unit', 'units'],
    pechuga: ['pechuga', 'pechugas'],
    muslo: ['muslo', 'muslos'],
    rebanada: ['rebanada', 'rebanadas', 'slice', 'slices'],
    filete: ['filete', 'filetes'],
    loncha: ['loncha', 'lonchas'],
    diente: ['diente', 'dientes', 'clove', 'cloves'],
    rama: ['rama', 'ramas', 'sprig', 'sprigs'],
    lata: ['lata', 'latas', 'can', 'cans'],
    sobre: ['sobre', 'sobres', 'sachet', 'sachets'],
    paquete: ['paquete', 'paquetes', 'pack', 'packs'],
    porcion: ['porcion', 'porciones', 'serving', 'servings'],
    rodaja: ['rodaja', 'rodajas'],
};

/**
 * Factores por defecto para mapear unidades semánticas de corte/pieza a `pieza`.
 * Este catálogo está separado del parser para permitir ajustes nutricionales futuros.
 */
const SEMANTIC_PIECE_TO_UNIT_FACTOR: Record<SemanticPieceUnit, number> = {
    pechuga: 1,
    muslo: 1,
    filete: 1,
    rebanada: 1,
};

const SEMANTIC_PIECE_UNITS = new Set<SemanticPieceUnit>(['pechuga', 'muslo', 'filete', 'rebanada']);

const PIECE_LIKE_UNITS = new Set<CanonicalUnit>([
    'pieza',
    'rebanada',
    'filete',
    'loncha',
    'diente',
    'rama',
    'lata',
    'sobre',
    'paquete',
    'porcion',
    'rodaja',
]);

const toFoodSearchResult = (food: IFoodItem): FoodSearchResult => ({
    id: food.id,
    name: food.name,
    brand: food.brand,
    exchange_group_id: food.exchange_group_id ?? null,
    base_serving_size: food.base_serving_size ?? null,
    base_unit: food.base_unit ?? null,
    calories_kcal: food.calories_kcal ?? null,
    protein_g: food.protein_g ?? null,
    carbs_g: food.carbs_g ?? null,
    fat_g: food.fat_g ?? null,
    fiber_g: food.fiber_g ?? null,
    serving_units: Array.isArray(food.serving_units) ? food.serving_units : [],
});

const normalizeIngredientSegment = (value: string) =>
    value
        .replace(/(\d)([a-zA-Záéíóúüñ])/g, '$1 $2')
        .replace(/([¼½¾⅓⅔⅛⅜⅝⅞])([a-zA-Záéíóúüñ])/g, '$1 $2')
        .replace(/\s+/g, ' ')
        .trim();

const aliasToCanonicalUnit = (value: string): CanonicalUnit | null => {
    const normalizedValue = normalizeSearchText(value).replace(/\./g, '');
    if (!normalizedValue) {
        return null;
    }

    for (const [canonicalUnit, aliases] of Object.entries(CANONICAL_UNIT_ALIASES) as Array<
        [CanonicalUnit, string[]]
    >) {
        if (aliases.includes(normalizedValue)) {
            return canonicalUnit;
        }
    }

    return null;
};

const parseNumericToken = (value: string) => {
    const normalizedValue = value.trim();
    if (!normalizedValue) {
        return null;
    }

    if (normalizedValue in UNICODE_FRACTIONS) {
        return UNICODE_FRACTIONS[normalizedValue];
    }

    if (/^\d+\s+\d+\/\d+$/.test(normalizedValue)) {
        const [whole, fraction] = normalizedValue.split(/\s+/);
        const [numerator, denominator] = fraction.split('/').map(Number);
        if (!denominator) {
            return null;
        }

        return Number(whole) + numerator / denominator;
    }

    if (/^\d+\/\d+$/.test(normalizedValue)) {
        const [numerator, denominator] = normalizedValue.split('/').map(Number);
        if (!denominator) {
            return null;
        }

        return numerator / denominator;
    }

    const parsedValue = Number.parseFloat(normalizedValue.replace(',', '.'));
    return Number.isFinite(parsedValue) ? parsedValue : null;
};

const extractMeasurement = (value: string): ParsedMeasurement | null => {
    const normalizedValue = normalizeIngredientSegment(value)
        .replace(/^[\-*•·\u2022]+/, '')
        .replace(/^\d+[.)]\s+/, '')
        .trim();
    if (!normalizedValue) {
        return null;
    }

    const amountMatch = normalizedValue.match(
        /^(\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:[.,]\d+)?|[¼½¾⅓⅔⅛⅜⅝⅞])(?:\s*(?:-|a)\s*(\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:[.,]\d+)?|[¼½¾⅓⅔⅛⅜⅝⅞]))?/i,
    );

    if (!amountMatch) {
        return null;
    }

    const firstAmount = parseNumericToken(amountMatch[1]);
    const secondAmount = amountMatch[2] ? parseNumericToken(amountMatch[2]) : null;
    if (firstAmount === null) {
        return null;
    }

    const amount = secondAmount !== null ? (firstAmount + secondAmount) / 2 : firstAmount;
    const remainder = normalizedValue.slice(amountMatch[0].length).trim();
    const unitToken = remainder.match(/^([a-zA-Záéíóúüñ.]+)/)?.[1] ?? '';
    const canonicalUnit = aliasToCanonicalUnit(unitToken);

    return {
        amount,
        unit: canonicalUnit,
        semanticPieceUnit: canonicalUnit && SEMANTIC_PIECE_UNITS.has(canonicalUnit as SemanticPieceUnit)
            ? (canonicalUnit as SemanticPieceUnit)
            : null,
        hasIngredientConnector: /^de(?:l)?\b/i.test(remainder.slice(unitToken.length).trim()),
    };
};

const tokenizeIngredient = (value: string) =>
    normalizeSearchText(value)
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .map((token) => token.trim())
        .filter((token) => token.length > 1 && !NOUN_STOPWORDS.has(token));

const normalizeSpanishToken = (token: string) => {
    const normalizedToken = token.trim();
    if (normalizedToken.length < 4) {
        return normalizedToken;
    }

    if (/[bcdfghjklmn\u00f1pqrstvwxyz]es$/.test(normalizedToken) && normalizedToken.length > 4) {
        return normalizedToken.slice(0, -2);
    }

    if (/[aeiou]s$/.test(normalizedToken) && normalizedToken.length > 4) {
        return normalizedToken.slice(0, -1);
    }

    return normalizedToken;
};

const getSpanishTokenMatchVariants = (token: string) => {
    const variants = new Set<string>([token]);
    const normalizedToken = normalizeSpanishToken(token);
    variants.add(normalizedToken);

    if (/[bcdfghjklmn\u00f1pqrstvwxyz]es$/.test(token) && token.length > 4) {
        variants.add(token.slice(0, -1));
    }

    return Array.from(variants).filter((variant) => variant.length > 1 && !NOUN_STOPWORDS.has(variant));
};

const tokenizeIngredientForMatch = (value: string) => {
    const baseTokens = tokenizeIngredient(value);
    const tokensWithFallback = new Set<string>();

    for (const token of baseTokens) {
        for (const variant of getSpanishTokenMatchVariants(token)) {
            tokensWithFallback.add(variant);
        }
    }

    return Array.from(tokensWithFallback);
};

const normalizeIngredientForMatch = (value: string) =>
    tokenizeIngredient(value)
        .map((token) => normalizeSpanishToken(token))
        .filter((token) => token.length > 1 && !NOUN_STOPWORDS.has(token))
        .join(' ');

const isPreparationHeading = (value: string) =>
    PREPARATION_SECTION_PREFIXES.some((prefix) => value.startsWith(prefix));

const isTitleCandidate = (value: string) => {
    const normalizedValue = normalizeSearchText(value.replace(/^#+\s*/, ''));
    if (!normalizedValue) {
        return false;
    }

    if (normalizedValue.startsWith('ingredientes')) {
        return false;
    }

    if (isPreparationHeading(normalizedValue)) {
        return false;
    }

    if (/^[\d\-*•·]/.test(value.trim())) {
        return false;
    }

    if (value.length > 90) {
        return false;
    }

    return !QUANTITY_PREFIX_REGEX.test(normalizedValue);
};

const extractTitle = (lines: string[]) => {
    const firstMeaningfulLine = lines.find((line) => line.trim().length > 0);
    if (!firstMeaningfulLine) {
        return null;
    }

    const cleanedTitle = firstMeaningfulLine.replace(/^#+\s*/, '').trim();
    return isTitleCandidate(cleanedTitle) ? cleanedTitle : null;
};

const extractIngredientSource = (lines: string[], detectedTitle: string | null) => {
    const candidateLines =
        detectedTitle &&
        lines[0] &&
        normalizeSearchText(lines[0].replace(/^#+\s*/, '')) === normalizeSearchText(detectedTitle)
            ? lines.slice(1)
            : lines;

    const ingredientLines: string[] = [];
    let insideIngredientSection = false;

    for (const rawLine of candidateLines) {
        const line = rawLine.trim();
        if (!line) {
            continue;
        }

        const normalizedLine = normalizeSearchText(line);

        if (!insideIngredientSection && normalizedLine.startsWith('ingredientes')) {
            insideIngredientSection = true;
            const afterColon = line.split(':').slice(1).join(':').trim();
            if (afterColon) {
                ingredientLines.push(afterColon);
            }
            continue;
        }

        if (insideIngredientSection && isPreparationHeading(normalizedLine)) {
            break;
        }

        if (insideIngredientSection) {
            if (/^para\s.+:$/i.test(line)) {
                continue;
            }

            ingredientLines.push(line);
        }
    }

    if (ingredientLines.length > 0) {
        return ingredientLines.join('\n');
    }

    const fallbackLines: string[] = [];
    for (const rawLine of candidateLines) {
        const line = rawLine.trim();
        if (!line) {
            continue;
        }

        const normalizedLine = normalizeSearchText(line);
        if (isPreparationHeading(normalizedLine)) {
            break;
        }

        fallbackLines.push(line);
    }

    return fallbackLines.join('\n');
};

const cleanIngredientCandidate = (value: string) => {
    let candidate = normalizeIngredientSegment(value)
        .replace(/\([^)]*\)/g, ' ')
        .replace(/^[\s\-*•·\u2022#]+/, ' ')
        .replace(/^\d+[.)]\s+/, '')
        .replace(/\s+/g, ' ')
        .trim();

    if (!candidate) {
        return null;
    }

    candidate = candidate.replace(QUANTITY_PREFIX_REGEX, '').trim();

    for (const pattern of DESCRIPTOR_PATTERNS) {
        candidate = candidate.replace(pattern, ' ');
    }

    candidate = candidate
        .replace(/\s+/g, ' ')
        .replace(/^[,;:.]+/, '')
        .replace(/[,;:.]+$/, '')
        .trim();

    if (!candidate) {
        return null;
    }

    const normalizedCandidate = normalizeSearchText(candidate);
    if (!normalizedCandidate || normalizedCandidate.startsWith('ingredientes') || isPreparationHeading(normalizedCandidate)) {
        return null;
    }

    return candidate;
};

const expandIngredientSegments = (value: string) => {
    const separators = [/\s+y\s+/i, /\s+e\s+/i, /\s+o\s+/i, /\s*\/\s*/, /\s*,\s*/];
    const queue = [normalizeIngredientSegment(value)];
    const expanded: string[] = [];

    while (queue.length > 0) {
        const current = queue.shift()!;
        const directCandidate = cleanIngredientCandidate(current);
        if (!directCandidate) {
            continue;
        }

        const separator = separators.find((pattern) => pattern.test(directCandidate));
        if (!separator) {
            expanded.push(current);
            continue;
        }

        const parts = current.split(separator).map((part) => part.trim()).filter(Boolean);
        if (parts.length <= 1) {
            expanded.push(current);
            continue;
        }

        for (const part of parts) {
            queue.push(part);
        }
    }

    return expanded;
};

const extractIngredientCandidates = (sourceText: string) => {
    const rawSegments = sourceText
        .replace(/\r/g, '\n')
        .replace(/[•·●▪◦]/g, '\n')
        .split(/\n+/)
        .flatMap((line) => line.split(';'))
        .map((line) => line.trim())
        .filter(Boolean);

    const candidates: DetectedIngredientCandidate[] = [];

    for (const rawSegment of rawSegments) {
        const payload = rawSegment.includes(':') ? rawSegment.split(':').slice(1).join(':') : rawSegment;
        const expandedCandidates = expandIngredientSegments(payload);

        for (const candidateSegment of expandedCandidates) {
            const cleanedCandidate = cleanIngredientCandidate(candidateSegment);
            if (!cleanedCandidate) {
                continue;
            }

            const normalizedCandidate = normalizeSearchText(cleanedCandidate);
            if (!normalizedCandidate) {
                continue;
            }

            candidates.push({
                raw: candidateSegment,
                name: cleanedCandidate,
                measurement: extractMeasurement(candidateSegment),
            });
        }
    }

    return candidates;
};

const buildFoodIndex = (foods: IFoodItem[], excludeFoodIds: number[]) =>
    foods
        .filter((food) => !excludeFoodIds.includes(food.id))
        .map((food) => {
            const normalizedName = normalizeSearchText(food.name);
            return {
                food: toFoodSearchResult(food),
                normalizedName,
                normalizedMorphName: normalizeIngredientForMatch(food.name),
                tokens: tokenizeIngredientForMatch(food.name),
            };
        })
        .filter((food) => food.normalizedName.length > 0);

const convertMeasurementToBaseQuantity = (
    measurement: ParsedMeasurement,
    baseUnit: string | number | null | undefined,
) => {
    const canonicalBaseUnit = aliasToCanonicalUnit(String(baseUnit ?? ''));

    if (measurement.unit === canonicalBaseUnit) {
        return measurement.amount;
    }

    if (measurement.unit === 'kg' && canonicalBaseUnit === 'g') {
        return measurement.amount * 1000;
    }

    if (measurement.unit === 'l' && canonicalBaseUnit === 'ml') {
        return measurement.amount * 1000;
    }

    return null;
};

const resolveServingUnitId = (food: FoodSearchResult, unit: CanonicalUnit) =>
    food.serving_units.find((servingUnit) => {
        const directMatch = aliasToCanonicalUnit(servingUnit.unit_name);
        if (directMatch === unit) {
            return true;
        }

        const normalizedUnitName = normalizeSearchText(servingUnit.unit_name);
        return CANONICAL_UNIT_ALIASES[unit].some((alias) => normalizedUnitName.includes(alias));
    })?.id ?? null;

const resolveDetectedIngredientQuantity = (
    food: FoodSearchResult,
    measurement: ParsedMeasurement | null,
): Pick<DetectedRecipeIngredient, 'quantity' | 'servingUnitId'> => {
    if (!measurement) {
        return {
            quantity: null,
            servingUnitId: null,
        };
    }

    if (measurement.semanticPieceUnit) {
        // Prioridad para patrones como "2 pechugas de pollo": cuando viene con
        // conector de ingrediente (de/del), se conserva esta cantidad semántica
        // antes de intentar usar el tamaño base del alimento.
        const isExplicitIngredientSemanticQuantity = measurement.hasIngredientConnector;
        const pieceQuantity = measurement.amount * SEMANTIC_PIECE_TO_UNIT_FACTOR[measurement.semanticPieceUnit];
        const pieceServingUnitId = resolveServingUnitId(food, 'pieza');
        if (isExplicitIngredientSemanticQuantity) {
            return {
                quantity: pieceQuantity,
                servingUnitId: pieceServingUnitId,
            };
        }

        return {
            quantity: pieceQuantity,
            servingUnitId: pieceServingUnitId,
        };
    }

    if (measurement.unit) {
        const servingUnitId = resolveServingUnitId(food, measurement.unit);
        if (servingUnitId !== null) {
            return {
                quantity: measurement.amount,
                servingUnitId,
            };
        }

        const baseQuantity = convertMeasurementToBaseQuantity(measurement, food.base_unit);
        if (baseQuantity !== null) {
            return {
                quantity: baseQuantity,
                servingUnitId: null,
            };
        }
    }

    if (!measurement.unit) {
        const canonicalBaseUnit = aliasToCanonicalUnit(String(food.base_unit ?? ''));
        if (canonicalBaseUnit && PIECE_LIKE_UNITS.has(canonicalBaseUnit)) {
            return {
                quantity: measurement.amount,
                servingUnitId: null,
            };
        }

        const pieceLikeServingUnit = Array.from(PIECE_LIKE_UNITS).find(
            (unit) => resolveServingUnitId(food, unit) !== null,
        );

        if (pieceLikeServingUnit) {
            return {
                quantity: measurement.amount,
                servingUnitId: resolveServingUnitId(food, pieceLikeServingUnit),
            };
        }
    }

    return {
        quantity: null,
        servingUnitId: null,
    };
};

const selectBestFoodMatch = (candidate: string, foods: IndexedFood[]) => {
    const normalizedCandidate = normalizeSearchText(candidate);
    const normalizedMorphCandidate = normalizeIngredientForMatch(candidate);
    const candidateTokens = tokenizeIngredientForMatch(candidate);

    if (!normalizedCandidate || candidateTokens.length === 0) {
        return null;
    }

    const exactMatch = foods.find(
        (food) => food.normalizedName === normalizedCandidate || food.normalizedMorphName === normalizedMorphCandidate,
    );
    if (exactMatch) {
        return exactMatch.food;
    }

    let bestMatch: { food: FoodSearchResult; score: number } | null = null;
    const candidateTokenSet = new Set(candidateTokens);

    for (const food of foods) {
        const overlappingTokens = food.tokens.filter((token) => candidateTokenSet.has(token));
        if (overlappingTokens.length === 0) {
            continue;
        }

        const tokenCoverage = overlappingTokens.length / candidateTokens.length;
        const foodCoverage = overlappingTokens.length / Math.max(food.tokens.length, 1);
        const containsScore =
            normalizedCandidate.includes(food.normalizedName) || food.normalizedName.includes(normalizedCandidate)
                ? 50
                : 0;

        if (
            !(
                overlappingTokens.length >= 2 ||
                (candidateTokens.length === 1 &&
                    food.tokens.length <= 4 &&
                    (normalizedCandidate.includes(food.tokens[0] ?? '') || food.normalizedName.includes(normalizedCandidate))) ||
                (tokenCoverage >= 0.75 && foodCoverage >= 0.5)
            )
        ) {
            continue;
        }

        const score =
            overlappingTokens.length * 100 +
            Math.round(tokenCoverage * 40) +
            Math.round(foodCoverage * 25) +
            containsScore -
            Math.abs(food.tokens.length - candidateTokens.length) * 3;

        if (!bestMatch || score > bestMatch.score) {
            bestMatch = {
                food: food.food,
                score,
            };
        }
    }

    return bestMatch?.food ?? null;
};

export const detectRecipeFromText = ({
    text,
    foods,
    excludeFoodIds = [],
}: {
    text: string;
    foods: IFoodItem[];
    excludeFoodIds?: number[];
}): RecipeTextDetectionResult => {
    const trimmedText = text.trim();
    if (!trimmedText) {
        return {
            detectedTitle: null,
            matchedIngredients: [],
            unmatchedIngredients: [],
        };
    }

    const lines = trimmedText
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);

    const detectedTitle = extractTitle(lines);
    const ingredientSource = extractIngredientSource(lines, detectedTitle);
    const ingredientCandidates = extractIngredientCandidates(ingredientSource);
    const foodIndex = buildFoodIndex(foods, excludeFoodIds);
    const matchedIngredientsByFoodId = new Map<number, DetectedRecipeIngredient>();
    const unmatchedIngredients: string[] = [];

    for (const candidate of ingredientCandidates) {
        const matchedFood = selectBestFoodMatch(candidate.name, foodIndex);
        if (!matchedFood) {
            unmatchedIngredients.push(candidate.name);
            continue;
        }

        const nextDetectedIngredient: DetectedRecipeIngredient = {
            food: matchedFood,
            ...resolveDetectedIngredientQuantity(matchedFood, candidate.measurement),
            rawIngredient: candidate.raw,
        };

        const existingDetectedIngredient = matchedIngredientsByFoodId.get(matchedFood.id);
        if (!existingDetectedIngredient) {
            matchedIngredientsByFoodId.set(matchedFood.id, nextDetectedIngredient);
            continue;
        }

        if (
            existingDetectedIngredient.quantity !== null &&
            nextDetectedIngredient.quantity !== null &&
            existingDetectedIngredient.servingUnitId === nextDetectedIngredient.servingUnitId
        ) {
            matchedIngredientsByFoodId.set(matchedFood.id, {
                ...existingDetectedIngredient,
                quantity: existingDetectedIngredient.quantity + nextDetectedIngredient.quantity,
            });
            continue;
        }

        if (existingDetectedIngredient.quantity === null && nextDetectedIngredient.quantity !== null) {
            matchedIngredientsByFoodId.set(matchedFood.id, nextDetectedIngredient);
        }
    }

    return {
        detectedTitle,
        matchedIngredients: Array.from(matchedIngredientsByFoodId.values()),
        unmatchedIngredients,
    };
};
