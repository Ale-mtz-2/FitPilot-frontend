import { describe, expect, it } from 'vitest';
import type { IFoodItem } from '@/features/foods/types';
import {
  buildCompleteMealExchanges,
  buildGroupQuantitiesFromItems,
  buildSelectedFoodsFromItems,
  normalizeMealDraftsWithAllGroups,
} from './draftHydration';

const canonicalGroups = [{ id: 1 }, { id: 2 }, { id: 3 }];

const buildFood = (id: number): IFoodItem =>
  ({
    id,
    name: `Food ${id}`,
    brand: null,
    category_id: 1,
    exchange_group_id: 1,
    is_recipe: false,
    base_serving_size: 100,
    base_unit: 'g',
    calories_kcal: 100,
    protein_g: 10,
    carbs_g: 10,
    fat_g: 10,
    micronutrients: [],
    food_categories: { id: 1, name: 'General', icon: null },
    exchange_groups: { id: 1, name: 'Group 1' },
    food_nutrition_values: [
      {
        id: 77,
        food_id: id,
        data_source_id: 1,
        calories_kcal: 100,
        protein_g: 10,
        carbs_g: 10,
        fat_g: 10,
        base_serving_size: 100,
        base_unit: 'g',
        state: 'standard',
        notes: null,
        deleted_at: null,
        created_at: null,
        data_sources: { id: 1, name: 'default' },
        food_micronutrient_values: [],
      },
    ],
    serving_units: [],
  }) as IFoodItem;

describe('draftHydration utilities', () => {
  it('builds complete exchanges for all canonical groups when IA response is partial', () => {
    const exchanges = buildCompleteMealExchanges({
      canonicalGroups,
      quantitiesByGroupId: { 2: 1.5 },
      mealSeed: 2,
    });

    expect(exchanges).toHaveLength(3);
    expect(exchanges.map((exchange) => exchange.exchange_group_id)).toEqual([1, 2, 3]);
    expect(exchanges.map((exchange) => exchange.quantity)).toEqual([0, 1.5, 0]);
  });

  it('normalizes meal drafts preserving existing IDs and summing duplicate groups', () => {
    const normalized = normalizeMealDraftsWithAllGroups({
      canonicalGroups,
      meals: [
        {
          id: 10,
          meal_name: 'Lunch',
          meal_plan_exchanges: [
            { id: 101, exchange_group_id: 1, quantity: 0.5 },
            { id: 102, exchange_group_id: 1, quantity: 1.25 },
            { id: 103, exchange_group_id: 3, quantity: 2 },
          ],
        },
      ],
    });

    expect(normalized[0].meal_plan_exchanges).toHaveLength(3);
    expect(normalized[0].meal_plan_exchanges?.map((exchange) => exchange.id)).toEqual([
      101,
      expect.any(Number),
      103,
    ]);
    expect(normalized[0].meal_plan_exchanges?.map((exchange) => exchange.quantity)).toEqual([1.75, 0, 2]);
  });

  it('builds selected foods and warns when an item cannot be hydrated', () => {
    const exchanges = buildCompleteMealExchanges({
      canonicalGroups,
      quantitiesByGroupId: { 1: 2, 2: 1 },
      mealSeed: 4,
    });

    const group1ExchangeId = exchanges.find((exchange) => exchange.exchange_group_id === 1)!.id!;
    const group2ExchangeId = exchanges.find((exchange) => exchange.exchange_group_id === 2)!.id!;

    const foodsById = { 11: buildFood(11) };

    const result = buildSelectedFoodsFromItems({
      mealId: -900,
      mealName: 'Snack',
      exchanges,
      foodsById,
      items: [
        { exchange_group_id: 1, food_id: 11, equivalent_quantity: 1.5, quantity: 0 },
        { exchange_group_id: 2, food_id: 999, equivalent_quantity: 1, quantity: 0 },
      ],
    });

    expect(result.selectionsByKey[`-900-${group1ExchangeId}`]).toHaveLength(1);
    expect(result.selectionsByKey[`-900-${group1ExchangeId}`][0].foodId).toBe(11);
    expect(result.selectionsByKey[`-900-${group2ExchangeId}`]).toHaveLength(0);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toMatchObject({
      reason: 'missing_food',
      exchange_group_id: 2,
      food_id: 999,
    });
  });

  it('aggregates quantities by exchange group, summing duplicates', () => {
    const quantities = buildGroupQuantitiesFromItems([
      { exchange_group_id: 1, equivalent_quantity: 1 },
      { exchange_group_id: 1, equivalent_quantity: 0.5 },
      { exchange_group_id: 2, equivalent_quantity: 2 },
    ]);

    expect(quantities).toEqual({ 1: 1.5, 2: 2 });
  });
});
