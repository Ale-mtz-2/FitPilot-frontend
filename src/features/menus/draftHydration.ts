import type { IExchangeGroup } from '@/features/exchange-groups/types';
import type { IFoodItem } from '@/features/foods/types';
import type {
  AiHydrationWarning,
  IMenuExchangeDraft,
  IMenuMealDraft,
  MenuBuilderFoodSelection,
} from './types';

type MenuItemHydrationInput = {
  exchange_group_id?: number | null;
  food_id?: number | null;
  quantity?: number | null;
  equivalent_quantity?: number | null;
  recipe_id?: number | null;
  recipe_summary?: {
    id: number;
    title: string;
    image_url: string | null;
  } | null;
  foods?: IFoodItem | null;
  food_name?: string | null;
};

const toFiniteNumber = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const toValidGroupId = (value: unknown): number | null => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
};

const createTempExchangeId = (mealSeed: number, groupId: number): number => {
  const safeMealSeed = Math.abs(Math.trunc(mealSeed)) + 1;
  return -((safeMealSeed * 100000) + groupId);
};

const toQuantityByGroup = (items: MenuItemHydrationInput[]): Record<number, number> => {
  return items.reduce<Record<number, number>>((acc, item) => {
    const groupId = toValidGroupId(item.exchange_group_id);
    if (!groupId) {
      return acc;
    }
    const quantity = toFiniteNumber(item.equivalent_quantity ?? item.quantity);
    acc[groupId] = (acc[groupId] ?? 0) + quantity;
    return acc;
  }, {});
};

export interface BuildCompleteMealExchangesOptions {
  canonicalGroups: Pick<IExchangeGroup, 'id'>[];
  quantitiesByGroupId?: Record<number, number>;
  existingExchanges?: IMenuExchangeDraft[];
  mealSeed?: number;
  includeUnknownGroups?: boolean;
}

export const buildCompleteMealExchanges = ({
  canonicalGroups,
  quantitiesByGroupId = {},
  existingExchanges = [],
  mealSeed = 0,
  includeUnknownGroups = true,
}: BuildCompleteMealExchangesOptions): IMenuExchangeDraft[] => {
  const canonicalGroupIds = new Set<number>();
  const existingByGroup = new Map<number, IMenuExchangeDraft>();

  for (const exchange of existingExchanges) {
    const groupId = toValidGroupId(exchange.exchange_group_id);
    if (!groupId) {
      continue;
    }
    if (!existingByGroup.has(groupId)) {
      existingByGroup.set(groupId, exchange);
    }
  }

  const completeExchanges = canonicalGroups.map((group, groupIndex) => {
    const groupId = group.id;
    canonicalGroupIds.add(groupId);

    const existing = existingByGroup.get(groupId);
    const quantityFromMap = quantitiesByGroupId[groupId];
    const quantity = toFiniteNumber(
      quantityFromMap !== undefined ? quantityFromMap : existing?.quantity ?? 0,
    );

    return {
      ...existing,
      id: existing?.id ?? createTempExchangeId(mealSeed + groupIndex, groupId),
      exchange_group_id: groupId,
      quantity,
      meal_plan_meal_id: existing?.meal_plan_meal_id ?? 0,
    };
  });

  if (!includeUnknownGroups) {
    return completeExchanges;
  }

  const unknownExchanges = existingExchanges
    .filter((exchange) => {
      const groupId = toValidGroupId(exchange.exchange_group_id);
      return groupId !== null && !canonicalGroupIds.has(groupId);
    })
    .map((exchange) => ({
      ...exchange,
      quantity: toFiniteNumber(exchange.quantity),
    }));

  return [...completeExchanges, ...unknownExchanges];
};

export interface NormalizeMealDraftsWithAllGroupsOptions {
  meals: IMenuMealDraft[];
  canonicalGroups: Pick<IExchangeGroup, 'id'>[];
}

export const normalizeMealDraftsWithAllGroups = ({
  meals,
  canonicalGroups,
}: NormalizeMealDraftsWithAllGroupsOptions): IMenuMealDraft[] => {
  if (!canonicalGroups.length) {
    return meals;
  }

  return meals.map((meal, mealIndex) => {
    const exchanges = meal.meal_plan_exchanges ?? [];
    const uniqueByGroup = new Map<number, IMenuExchangeDraft>();
    const quantitiesByGroupId: Record<number, number> = {};

    for (const exchange of exchanges) {
      const groupId = toValidGroupId(exchange.exchange_group_id);
      if (!groupId) {
        continue;
      }

      quantitiesByGroupId[groupId] = (quantitiesByGroupId[groupId] ?? 0) + toFiniteNumber(exchange.quantity);
      if (!uniqueByGroup.has(groupId)) {
        uniqueByGroup.set(groupId, exchange);
      }
    }

    return {
      ...meal,
      meal_plan_exchanges: buildCompleteMealExchanges({
        canonicalGroups,
        quantitiesByGroupId,
        existingExchanges: Array.from(uniqueByGroup.values()),
        mealSeed: Number(meal.id ?? mealIndex),
      }),
    };
  });
};

export interface BuildSelectedFoodsFromItemsOptions {
  mealId: number;
  mealName: string;
  exchanges: IMenuExchangeDraft[];
  items: MenuItemHydrationInput[];
  foodsById?: Record<number, IFoodItem>;
}

interface BuildSelectedFoodsFromItemsResult {
  selectionsByKey: Record<string, MenuBuilderFoodSelection[]>;
  warnings: AiHydrationWarning[];
}

export const buildSelectedFoodsFromItems = ({
  mealId,
  mealName,
  exchanges,
  items,
  foodsById = {},
}: BuildSelectedFoodsFromItemsOptions): BuildSelectedFoodsFromItemsResult => {
  const warnings: AiHydrationWarning[] = [];
  const selectionsByKey: Record<string, MenuBuilderFoodSelection[]> = {};

  const itemsByGroup = new Map<number, MenuItemHydrationInput[]>();

  for (const item of items) {
    const groupId = toValidGroupId(item.exchange_group_id);
    if (!groupId) {
      warnings.push({
        meal_name: mealName,
        food_id: typeof item.food_id === 'number' ? item.food_id : undefined,
        reason: 'missing_exchange_group',
        message: 'El item no incluye exchange_group_id valido.',
      });
      continue;
    }

    if (!itemsByGroup.has(groupId)) {
      itemsByGroup.set(groupId, []);
    }
    itemsByGroup.get(groupId)!.push(item);
  }

  for (const exchange of exchanges) {
    const exchangeId = exchange.id;
    if (typeof exchangeId !== 'number') {
      continue;
    }

    const groupId = exchange.exchange_group_id;
    const key = `${mealId}-${exchangeId}`;
    const groupItems = itemsByGroup.get(groupId) ?? [];

    const selections: MenuBuilderFoodSelection[] = [];
    for (const item of groupItems) {
      const foodId = typeof item.food_id === 'number' ? item.food_id : undefined;
      const hydratedFood = item.foods ?? (foodId ? foodsById[foodId] : undefined);

      if (!hydratedFood) {
        warnings.push({
          meal_name: mealName,
          exchange_group_id: groupId,
          food_id: foodId,
          reason: 'missing_food',
          message: `No se pudo hidratar el alimento ${foodId ?? '(sin id)'} del grupo ${groupId}.`,
        });
        continue;
      }

      const nutritionValue = hydratedFood.food_nutrition_values?.[0];
      const baseSize = toFiniteNumber(nutritionValue?.base_serving_size) || 1;

      let calculatedExchanges = toFiniteNumber(item.equivalent_quantity);
      let grams = toFiniteNumber(item.quantity);

      if (calculatedExchanges <= 0 && grams > 0 && baseSize > 0) {
        calculatedExchanges = grams / baseSize;
      }
      if (grams <= 0 && calculatedExchanges > 0 && baseSize > 0) {
        grams = calculatedExchanges * baseSize;
      }

      selections.push({
        foodId: hydratedFood.id,
        grams: Number(grams.toFixed(1)),
        calculatedExchanges,
        nutritionValueId: nutritionValue?.id,
        _foodRef: hydratedFood,
        recipeId: item.recipe_id ?? undefined,
        recipeName: item.recipe_summary?.title ?? undefined,
        recipeImageUrl: item.recipe_summary?.image_url ?? undefined,
        isFromRecipe: Boolean(item.recipe_id),
      });
    }

    selectionsByKey[key] = selections;
  }

  return { selectionsByKey, warnings };
};

export const buildGroupQuantitiesFromItems = (items: MenuItemHydrationInput[]): Record<number, number> =>
  toQuantityByGroup(items);
