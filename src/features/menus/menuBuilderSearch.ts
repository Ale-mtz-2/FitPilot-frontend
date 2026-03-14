import type { IFoodItem, IFoodNutritionValue } from '@/features/foods/types';
import type { IMenuExchangeDraft, IMenuMealDraft, MenuBuilderFoodSelection } from './types';
import { matchesAnyNormalizedQuery, normalizeSearchText } from '@/utils/search';

export interface MenuBuilderFoodFilters {
    query: string;
    groupId?: number | null;
    subgroupId?: number | null;
}

export interface InsertFoodIntoMealOptions {
    meals: IMenuMealDraft[];
    selectedFoods: Record<string, MenuBuilderFoodSelection[]>;
    mealId: number;
    food: IFoodItem;
    createExchangeId: () => number;
}

export interface InsertFoodIntoMealResult {
    status: 'added' | 'duplicate' | 'missing_meal' | 'missing_exchange_group';
    meals: IMenuMealDraft[];
    selectedFoods: Record<string, MenuBuilderFoodSelection[]>;
}

const toFiniteNumber = (value: unknown, fallback = 0): number => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};

const getPrimaryNutritionValue = (food: IFoodItem): IFoodNutritionValue | undefined =>
    food.food_nutrition_values?.find((value) => value.state === 'standard')
    ?? food.food_nutrition_values?.[0];

const getFoodSelectionKey = (mealId: number, exchangeId: number) => `${mealId}-${exchangeId}`;

const createFoodSelection = (food: IFoodItem): MenuBuilderFoodSelection => {
    const nutritionValue = getPrimaryNutritionValue(food);
    const baseServingSize = toFiniteNumber(nutritionValue?.base_serving_size, 1) || 1;

    return {
        foodId: food.id,
        grams: Number(baseServingSize.toFixed(1)),
        calculatedExchanges: 1,
        nutritionValueId: nutritionValue?.id,
        _foodRef: food,
    };
};

const hasValidGroupId = (food: IFoodItem): boolean =>
    Number.isInteger(food.exchange_group_id) && food.exchange_group_id > 0;

const sortFoodsByName = (foods: IFoodItem[]): IFoodItem[] =>
    [...foods].sort((left, right) => {
        const leftName = normalizeSearchText(left.name);
        const rightName = normalizeSearchText(right.name);
        return leftName.localeCompare(rightName);
    });

export const filterMenuBuilderFoods = (
    foods: IFoodItem[],
    filters: MenuBuilderFoodFilters,
): IFoodItem[] => {
    const { query, groupId, subgroupId } = filters;

    return sortFoodsByName(
        foods.filter((food) => {
            if (!hasValidGroupId(food)) {
                return false;
            }

            if (groupId && food.exchange_group_id !== groupId) {
                return false;
            }

            if (subgroupId && food.exchange_subgroup_id !== subgroupId) {
                return false;
            }

            return matchesAnyNormalizedQuery([food.name, food.brand], query);
        }),
    );
};

export const insertFoodIntoMeal = ({
    meals,
    selectedFoods,
    mealId,
    food,
    createExchangeId,
}: InsertFoodIntoMealOptions): InsertFoodIntoMealResult => {
    if (!hasValidGroupId(food)) {
        return {
            status: 'missing_exchange_group',
            meals,
            selectedFoods,
        };
    }

    const mealIndex = meals.findIndex((meal) => meal.id === mealId);
    if (mealIndex === -1) {
        return {
            status: 'missing_meal',
            meals,
            selectedFoods,
        };
    }

    const nextMeals = [...meals];
    const targetMeal = {
        ...nextMeals[mealIndex],
        meal_plan_exchanges: [...(nextMeals[mealIndex].meal_plan_exchanges ?? [])],
    };
    nextMeals[mealIndex] = targetMeal;

    let targetExchange = targetMeal.meal_plan_exchanges?.find(
        (exchange) => exchange.exchange_group_id === food.exchange_group_id,
    );

    const selectionsByKey = { ...selectedFoods };

    const existingKeys = targetMeal.meal_plan_exchanges
        ?.filter((exchange) => exchange.exchange_group_id === food.exchange_group_id && typeof exchange.id === 'number')
        .map((exchange) => getFoodSelectionKey(mealId, exchange.id!))
        ?? [];

    const isDuplicate = existingKeys.some((key) =>
        (selectionsByKey[key] ?? []).some((selection) => selection.foodId === food.id),
    );

    if (isDuplicate) {
        return {
            status: 'duplicate',
            meals,
            selectedFoods,
        };
    }

    if (!targetExchange) {
        targetExchange = {
            id: createExchangeId(),
            exchange_group_id: food.exchange_group_id,
            quantity: 1,
            meal_plan_meal_id: mealId,
        } satisfies IMenuExchangeDraft;
        targetMeal.meal_plan_exchanges?.push(targetExchange);
    }

    if (typeof targetExchange.id !== 'number') {
        targetExchange.id = createExchangeId();
    }

    const selectionKey = getFoodSelectionKey(mealId, targetExchange.id);
    const currentSelections = selectionsByKey[selectionKey] ?? [];

    selectionsByKey[selectionKey] = [
        ...currentSelections,
        createFoodSelection(food),
    ];

    return {
        status: 'added',
        meals: nextMeals,
        selectedFoods: selectionsByKey,
    };
};
