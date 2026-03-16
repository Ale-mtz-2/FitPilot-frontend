import { addDays, format, isValid, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import type { IFoodItem, IFoodNutritionValue } from '@/features/foods/types';
import { resolveRecipeImageUrl } from '@/utils/recipeImages';
import type {
    DietPdfDocument,
    DietPdfDay,
    DietPdfIngredient,
    DietPdfMeal,
    DietPdfPortion,
    DietPdfRecipe,
    IMenuDailyFood,
    IMenuDailyItem,
    IMenuDailyMeal,
    IMenuMealDraft,
    MenuBuilderFoodSelection,
    MenuDailyBatchResponseItem,
} from './types';

interface BuildWeeklyDietPdfDocumentOptions {
    dailyMenus: MenuDailyBatchResponseItem[];
    startDate: string;
    days?: number;
    clientName?: string | null;
}

interface BuildDraftDietPdfDocumentOptions {
    localMeals: IMenuMealDraft[];
    selectedFoods: Record<string, MenuBuilderFoodSelection[]>;
    clientName?: string | null;
    period?: {
        start?: string | null;
        end?: string | null;
    };
}

type FoodLike = IMenuDailyFood | IFoodItem | null | undefined;

const DEFAULT_DAYS = 7;

const toNumber = (value: unknown): number | null => {
    if (value === null || value === undefined || value === '') {
        return null;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
};

const roundValue = (value: number | null) => {
    if (value === null) {
        return null;
    }

    return Math.round(value * 100) / 100;
};

const normalizeUnit = (value: string | null | undefined) =>
    (value || '')
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');

const isGramUnit = (value: string | null | undefined) => {
    const normalized = normalizeUnit(value);
    return (
        normalized === 'g' ||
        normalized === 'gr' ||
        normalized === 'gramo' ||
        normalized === 'gramos' ||
        normalized === 'gram' ||
        normalized === 'grams'
    );
};

const isEquivalentUnit = (value: string | null | undefined) => {
    const normalized = normalizeUnit(value);
    return normalized === 'eq' || normalized === 'equiv' || normalized.includes('equivalente');
};

const formatDisplayNumber = (value: number | null) => {
    if (value === null) {
        return null;
    }

    return Number.isInteger(value) ? String(value) : value.toFixed(1).replace(/\.0$/, '');
};

const formatHouseholdLabel = (quantity: number | null, unitName: string | null | undefined) => {
    if (quantity === null || !unitName?.trim()) {
        return null;
    }

    if (isGramUnit(unitName)) {
        return null;
    }

    const formattedQuantity = formatDisplayNumber(quantity);
    return formattedQuantity ? `${formattedQuantity} ${unitName.trim()}` : unitName.trim();
};

const FRIENDLY_FRACTIONS = [
    { value: 0, label: '' },
    { value: 0.25, label: '1/4' },
    { value: 1 / 3, label: '1/3' },
    { value: 0.5, label: '1/2' },
    { value: 2 / 3, label: '2/3' },
    { value: 0.75, label: '3/4' },
] as const;

const FRIENDLY_QUANTITY_TOLERANCE = 0.12;
const MIN_HOUSEHOLD_QUANTITY = 0.25;
const MAX_HOUSEHOLD_QUANTITY = 8;

const buildFriendlyQuantityCandidate = (whole: number, fractionValue: number, fractionLabel: string) => {
    const numeric = whole + fractionValue;
    if (numeric <= 0) {
        return null;
    }

    return {
        numeric,
        label: fractionLabel ? (whole > 0 ? `${whole} ${fractionLabel}` : fractionLabel) : String(whole),
    };
};

const getFriendlyQuantityMatch = (value: number) => {
    if (!Number.isFinite(value) || value <= 0) {
        return null;
    }

    const whole = Math.floor(value);
    const candidates = new Map<string, { numeric: number; label: string; delta: number }>();

    for (let wholePart = Math.max(0, whole - 1); wholePart <= whole + 1; wholePart += 1) {
        FRIENDLY_FRACTIONS.forEach((fraction) => {
            const candidate = buildFriendlyQuantityCandidate(wholePart, fraction.value, fraction.label);
            if (!candidate) {
                return;
            }

            if (candidate.numeric < MIN_HOUSEHOLD_QUANTITY || candidate.numeric > MAX_HOUSEHOLD_QUANTITY) {
                return;
            }

            const delta = Math.abs(value - candidate.numeric);
            const key = `${candidate.numeric.toFixed(4)}-${candidate.label}`;
            const existing = candidates.get(key);

            if (!existing || delta < existing.delta) {
                candidates.set(key, { ...candidate, delta });
            }
        });
    }

    const bestMatch = Array.from(candidates.values()).sort(
        (left, right) => left.delta - right.delta || Math.abs(left.numeric - 1) - Math.abs(right.numeric - 1),
    )[0];

    if (!bestMatch || bestMatch.delta > FRIENDLY_QUANTITY_TOLERANCE) {
        return null;
    }

    return bestMatch;
};

const pluralizeHouseholdUnit = (unitName: string, quantity: number) => {
    const trimmed = unitName.trim();
    if (!trimmed || quantity < 1.01) {
        return trimmed;
    }

    const normalized = normalizeUnit(trimmed);
    const irregularMap: Record<string, string> = {
        pieza: 'piezas',
        taza: 'tazas',
        vaso: 'vasos',
        rebanada: 'rebanadas',
        cucharada: 'cucharadas',
        cucharadita: 'cucharaditas',
        cda: 'cdas',
        cdita: 'cditas',
    };

    if (irregularMap[normalized]) {
        return irregularMap[normalized];
    }

    if (normalized.endsWith('s')) {
        return trimmed;
    }

    return /[aeiou]$/i.test(trimmed) ? `${trimmed}s` : `${trimmed}es`;
};

const buildFriendlyHouseholdLabel = (quantity: number, unitName: string | null | undefined) => {
    if (!unitName?.trim()) {
        return null;
    }

    const match = getFriendlyQuantityMatch(quantity);
    if (!match) {
        return null;
    }

    const displayUnit = pluralizeHouseholdUnit(unitName.trim(), match.numeric);
    return `${match.label} ${displayUnit}`.trim();
};

const resolveFoodNutrition = (food: FoodLike) => {
    const nutritionValues = food?.food_nutrition_values ?? [];
    return nutritionValues.find((value) => value?.state === 'standard') ?? nutritionValues[0] ?? null;
};

const resolveBaseServingSize = (food: FoodLike) =>
    toNumber(resolveFoodNutrition(food)?.base_serving_size) ??
    toNumber(food?.base_serving_size) ??
    null;

const resolveBaseUnit = (food: FoodLike) =>
    resolveFoodNutrition(food)?.base_unit?.trim() ||
    food?.base_unit?.trim() ||
    null;

const resolveSelectionNutrition = (
    food: IFoodItem | null | undefined,
    nutritionValueId?: number,
): IFoodNutritionValue | null => {
    const nutritionValues = food?.food_nutrition_values ?? [];

    if (nutritionValueId !== undefined) {
        const matched = nutritionValues.find((value) => value.id === nutritionValueId);
        if (matched) {
            return matched;
        }
    }

    return nutritionValues.find((value) => value.state === 'standard') ?? nutritionValues[0] ?? null;
};

const resolveHouseholdLabelFromNutritionNotes = (
    food: IFoodItem | null | undefined,
    grams: number | null,
    equivalents: number | null,
    nutritionValueId?: number,
) => {
    const nutritionValue = resolveSelectionNutrition(food, nutritionValueId);
    const notes = nutritionValue?.notes;
    if (!notes) {
        return null;
    }

    let parsedNotes: Record<string, unknown>;
    try {
        parsedNotes = JSON.parse(notes) as Record<string, unknown>;
    } catch {
        return null;
    }

    const originalServingAmount = toNumber(parsedNotes.original_serving_amount);
    const originalServingUnit =
        typeof parsedNotes.original_serving_unit === 'string' ? parsedNotes.original_serving_unit.trim() : '';
    const equivalentCount = toNumber(parsedNotes.equivalent_count);
    const baseServingSize = toNumber(nutritionValue?.base_serving_size);

    if (
        originalServingAmount === null ||
        originalServingAmount <= 0 ||
        !originalServingUnit ||
        isGramUnit(originalServingUnit) ||
        isEquivalentUnit(originalServingUnit)
    ) {
        return null;
    }

    const ratio =
        equivalents !== null && equivalentCount !== null && equivalentCount > 0
            ? equivalents / equivalentCount
            : grams !== null && baseServingSize !== null && baseServingSize > 0
                ? grams / baseServingSize
                : null;

    if (ratio === null || ratio <= 0) {
        return null;
    }

    return buildFriendlyHouseholdLabel(originalServingAmount * ratio, originalServingUnit);
};

const resolveHouseholdLabelFromServingUnits = (food: IFoodItem | null | undefined, grams: number | null) => {
    if (!food || grams === null || grams <= 0) {
        return null;
    }

    const candidate = (food.serving_units ?? [])
        .map((unit) => {
            const gramEquivalent = toNumber(unit.gram_equivalent);
            if (
                gramEquivalent === null ||
                gramEquivalent <= 0 ||
                isGramUnit(unit.unit_name) ||
                isEquivalentUnit(unit.unit_name)
            ) {
                return null;
            }

            const quantity = grams / gramEquivalent;
            const match = getFriendlyQuantityMatch(quantity);
            if (!match) {
                return null;
            }

            const label = buildFriendlyHouseholdLabel(quantity, unit.unit_name);
            if (!label) {
                return null;
            }

            return {
                label,
                quantity: match.numeric,
                delta: match.delta,
            };
        })
        .filter((value): value is { label: string; quantity: number; delta: number } => value !== null)
        .sort(
            (left, right) => left.delta - right.delta || Math.abs(left.quantity - 1) - Math.abs(right.quantity - 1),
        )[0];

    return candidate?.label ?? null;
};

const buildPortion = (
    householdLabel: string | null,
    equivalents: number | null,
    grams: number | null,
): DietPdfPortion => ({
    householdLabel,
    equivalents: roundValue(equivalents),
    grams: roundValue(grams),
});

const derivePortionFromDailyItem = (item: IMenuDailyItem): DietPdfPortion => {
    if (item.portion_detail) {
        return buildPortion(
            item.portion_detail.household_label?.trim() || null,
            toNumber(item.portion_detail.equivalents),
            toNumber(item.portion_detail.grams),
        );
    }

    const quantity = toNumber(item.quantity);
    const gramEquivalent = toNumber(item.serving_units?.gram_equivalent);
    const baseServingSize = resolveBaseServingSize(item.foods);
    const explicitEquivalent = toNumber(item.equivalent_quantity);
    const grams =
        quantity !== null
            ? gramEquivalent !== null && gramEquivalent > 0
                ? quantity * gramEquivalent
                : isGramUnit(item.serving_units?.unit_name ?? resolveBaseUnit(item.foods))
                    ? quantity
                    : null
            : null;
    const equivalents =
        explicitEquivalent !== null
            ? explicitEquivalent
            : grams !== null && baseServingSize !== null && baseServingSize > 0
                ? grams / baseServingSize
                : null;

    return buildPortion(
        formatHouseholdLabel(quantity, item.serving_units?.unit_name),
        equivalents,
        grams,
    );
};

const buildPortionFromSelection = (selection: MenuBuilderFoodSelection): DietPdfPortion => {
    const grams = toNumber(selection.grams);
    const equivalents = toNumber(selection.calculatedExchanges);
    const householdLabel =
        resolveHouseholdLabelFromNutritionNotes(selection._foodRef, grams, equivalents, selection.nutritionValueId) ??
        resolveHouseholdLabelFromServingUnits(selection._foodRef, grams);

    return buildPortion(householdLabel, equivalents, grams);
};

const resolveIngredientLabel = (food: FoodLike, fallback?: string | null) =>
    food?.name?.trim() || fallback?.trim() || 'Ingrediente';

const resolveGroupName = (food: FoodLike, fallback?: string | null) =>
    food && 'exchange_groups' in food
        ? food.exchange_groups?.name?.trim() || fallback?.trim() || null
        : fallback?.trim() || null;

const buildDailyIngredient = (
    item: IMenuDailyItem,
    key: string,
): DietPdfIngredient => ({
    id: key,
    label: resolveIngredientLabel(item.foods, null),
    exchangeGroupName: item.exchange_groups?.name?.trim() || null,
    portion: derivePortionFromDailyItem(item),
});

const resolveMealCaloriesFromSelection = (selection: MenuBuilderFoodSelection) => {
    const nutritionValues = selection._foodRef?.food_nutrition_values ?? [];
    const nutrition =
        nutritionValues.find((value) => value.id === selection.nutritionValueId) ??
        nutritionValues[0] ??
        null;

    if (!nutrition) {
        return 0;
    }

    const baseServingSize = toNumber(nutrition.base_serving_size) ?? 1;
    const caloriesKcal = toNumber(nutrition.calories_kcal) ?? 0;
    const grams = toNumber(selection.grams) ?? 0;

    if (baseServingSize <= 0 || grams <= 0) {
        return 0;
    }

    return (grams / baseServingSize) * caloriesKcal;
};

const buildDraftIngredient = (
    selection: MenuBuilderFoodSelection,
    key: string,
    fallbackGroupName: string | null,
): DietPdfIngredient => ({
    id: key,
    label: resolveIngredientLabel(selection._foodRef, null),
    exchangeGroupName: resolveGroupName(selection._foodRef, fallbackGroupName),
    portion: buildPortionFromSelection(selection),
});

const sortRecipes = (recipes: DietPdfRecipe[]) =>
    recipes.sort((left, right) => left.title.localeCompare(right.title, 'es'));

const buildMealFromDailyMenu = (meal: IMenuDailyMeal, dayId: string): DietPdfMeal => {
    const recipeGroups = new Map<number, { recipe: DietPdfRecipe; order: number }>();
    const standaloneFoods: DietPdfIngredient[] = [];

    (meal.menu_items_menu_items_menu_meal_idTomenu_meals ?? []).forEach((item, index) => {
        const itemKey = `${dayId}-meal-${meal.id}-item-${item.id}`;
        const ingredient = buildDailyIngredient(item, itemKey);

        if (item.recipe_id) {
            const existingRecipe = recipeGroups.get(item.recipe_id);
            if (existingRecipe) {
                existingRecipe.recipe.ingredients.push(ingredient);
                existingRecipe.recipe.ingredientCount = existingRecipe.recipe.ingredients.length;
                return;
            }

            recipeGroups.set(item.recipe_id, {
                order: index,
                recipe: {
                    id: `${dayId}-meal-${meal.id}-recipe-${item.recipe_id}`,
                    recipeId: item.recipe_id,
                    title: item.recipe_summary?.title?.trim() || `Receta ${item.recipe_id}`,
                    imageUrl: resolveRecipeImageUrl(item.recipe_summary?.image_url) ?? null,
                    ingredientCount: 1,
                    ingredients: [ingredient],
                },
            });
            return;
        }

        standaloneFoods.push(ingredient);
    });

    const recipes = Array.from(recipeGroups.values())
        .sort((left, right) => left.order - right.order)
        .map((entry) => entry.recipe);

    return {
        id: `${dayId}-meal-${meal.id}`,
        name: meal.name?.trim() || 'Comida',
        totalCalories: roundValue(toNumber(meal.total_calories)),
        recipes,
        standaloneFoods,
    };
};

const buildMealFromDraft = (
    meal: IMenuMealDraft,
    selectedFoods: Record<string, MenuBuilderFoodSelection[]>,
): DietPdfMeal => {
    const mealId = meal.id ?? `draft-${meal.sort_order ?? 0}`;
    const recipeGroups = new Map<number, DietPdfRecipe>();
    const standaloneFoods: DietPdfIngredient[] = [];
    let totalCalories = 0;

    (meal.meal_plan_exchanges ?? []).forEach((exchange) => {
        const key = `${meal.id}-${exchange.id}`;
        const selections = selectedFoods[key] ?? [];
        const fallbackGroupName = exchange.exchange_group?.name?.trim() || null;

        selections.forEach((selection, index) => {
            totalCalories += resolveMealCaloriesFromSelection(selection);

            const ingredient = buildDraftIngredient(
                selection,
                `${mealId}-${exchange.id ?? index}-${selection.foodId ?? index}`,
                fallbackGroupName,
            );

            if (selection.isFromRecipe && selection.recipeId) {
                const existingRecipe = recipeGroups.get(selection.recipeId);
                if (existingRecipe) {
                    existingRecipe.ingredients.push(ingredient);
                    existingRecipe.ingredientCount = existingRecipe.ingredients.length;
                    return;
                }

                recipeGroups.set(selection.recipeId, {
                    id: `${mealId}-recipe-${selection.recipeId}`,
                    recipeId: selection.recipeId,
                    title: selection.recipeName?.trim() || `Receta ${selection.recipeId}`,
                    imageUrl: resolveRecipeImageUrl(selection.recipeImageUrl) ?? null,
                    ingredientCount: 1,
                    ingredients: [ingredient],
                });
                return;
            }

            standaloneFoods.push(ingredient);
        });
    });

    return {
        id: `draft-meal-${mealId}`,
        name: meal.meal_name?.trim() || 'Comida',
        totalCalories: roundValue(totalCalories),
        recipes: sortRecipes(Array.from(recipeGroups.values())),
        standaloneFoods,
    };
};

const capitalizeSentence = (value: string) =>
    value.charAt(0).toUpperCase() + value.slice(1);

const parseDateSafe = (value: string | null | undefined) => {
    if (!value) {
        return null;
    }

    const parsedDate = parseISO(value);
    return isValid(parsedDate) ? parsedDate : null;
};

const toDateKey = (value: string | null | undefined) => value?.slice(0, 10) ?? null;

const formatDayTitle = (value: string) => {
    const parsedDate = parseDateSafe(value);
    if (!parsedDate) {
        return value;
    }

    return capitalizeSentence(format(parsedDate, 'EEEE d MMM', { locale: es }));
};

const formatPeriodLabel = (startDate?: string | null, endDate?: string | null) => {
    const parsedStartDate = parseDateSafe(startDate ?? null);
    const parsedEndDate = parseDateSafe(endDate ?? null);

    if (parsedStartDate && parsedEndDate) {
        return `${capitalizeSentence(format(parsedStartDate, 'd MMM yyyy', { locale: es }))} - ${capitalizeSentence(
            format(parsedEndDate, 'd MMM yyyy', { locale: es }),
        )}`;
    }

    if (parsedStartDate) {
        return capitalizeSentence(format(parsedStartDate, 'd MMM yyyy', { locale: es }));
    }

    if (parsedEndDate) {
        return capitalizeSentence(format(parsedEndDate, 'd MMM yyyy', { locale: es }));
    }

    return null;
};

const buildSummary = (days: DietPdfDay[]) => {
    const totalMeals = days.reduce((count, day) => count + day.meals.length, 0);
    const totalRecipes = days.reduce(
        (count, day) => count + day.meals.reduce((mealCount, meal) => mealCount + meal.recipes.length, 0),
        0,
    );
    const totalStandaloneFoods = days.reduce(
        (count, day) =>
            count + day.meals.reduce((mealCount, meal) => mealCount + meal.standaloneFoods.length, 0),
        0,
    );
    const totalCalories = days.reduce((sum, day) => {
        const caloriesForDay = day.meals.reduce((mealSum, meal) => mealSum + (meal.totalCalories ?? 0), 0);
        return sum + caloriesForDay;
    }, 0);

    return {
        totalDays: days.length,
        totalMeals,
        totalRecipes,
        totalStandaloneFoods,
        totalCalories: totalCalories > 0 ? roundValue(totalCalories) : null,
    };
};

export const buildDietPdfDocumentFromDailyBatch = ({
    dailyMenus,
    startDate,
    days = DEFAULT_DAYS,
    clientName = null,
}: BuildWeeklyDietPdfDocumentOptions): DietPdfDocument => {
    const parsedStartDate = parseDateSafe(startDate) ?? new Date();
    const requestedDates = Array.from({ length: days }).map((_, index) => addDays(parsedStartDate, index));
    const dailyMenuMap = new Map<string, MenuDailyBatchResponseItem>();

    dailyMenus.forEach((menu) => {
        const dateKey = toDateKey(menu.assigned_date);
        if (dateKey && !dailyMenuMap.has(dateKey)) {
            dailyMenuMap.set(dateKey, menu);
        }
    });

    const documentDays: DietPdfDay[] = requestedDates.map((date) => {
        const dateKey = format(date, 'yyyy-MM-dd');
        const menu = dailyMenuMap.get(dateKey) ?? null;

        return {
            id: `day-${dateKey}`,
            title: formatDayTitle(dateKey),
            subtitle: menu?.title?.trim() || 'Sin menú asignado',
            dateKey,
            meals: (menu?.menu_meals ?? []).map((meal) => buildMealFromDailyMenu(meal, dateKey)),
        };
    });

    return {
        title: 'Plan semanal de alimentación',
        subtitle: 'Resumen completo de comidas, recetas e ingredientes asignados',
        clientName,
        periodLabel: formatPeriodLabel(
            format(requestedDates[0], 'yyyy-MM-dd'),
            format(requestedDates[requestedDates.length - 1], 'yyyy-MM-dd'),
        ),
        printedAt: capitalizeSentence(format(new Date(), 'd MMM yyyy, HH:mm', { locale: es })),
        source: 'weekly',
        summary: buildSummary(documentDays),
        days: documentDays,
    };
};

export const buildDietPdfDocumentFromDraft = ({
    localMeals,
    selectedFoods,
    clientName = null,
    period,
}: BuildDraftDietPdfDocumentOptions): DietPdfDocument => {
    const meals = localMeals.map((meal) => buildMealFromDraft(meal, selectedFoods));
    const day: DietPdfDay = {
        id: 'draft-day',
        title: 'Menú actual',
        subtitle: 'Vista previa del borrador sin guardar',
        dateKey: period?.start?.slice(0, 10) ?? null,
        meals,
    };

    return {
        title: 'Menú nutricional',
        subtitle: 'Impresión del borrador actual del plan alimenticio',
        clientName,
        periodLabel: formatPeriodLabel(period?.start ?? null, period?.end ?? null),
        printedAt: capitalizeSentence(format(new Date(), 'd MMM yyyy, HH:mm', { locale: es })),
        source: 'editor',
        summary: buildSummary([day]),
        days: [day],
    };
};
