import { describe, expect, it } from 'vitest';
import type { IFoodItem } from '@/features/foods/types';
import type { IMenuMealDraft, MenuBuilderFoodSelection } from './types';
import { filterMenuBuilderFoods, insertFoodIntoMeal } from './menuBuilderSearch';

const buildFood = (id: number, overrides: Partial<IFoodItem> = {}): IFoodItem =>
    ({
        id,
        name: `Food ${id}`,
        brand: null,
        category_id: 1,
        exchange_group_id: 1,
        exchange_subgroup_id: null,
        is_recipe: false,
        base_serving_size: 100,
        base_unit: 'g',
        calories_kcal: 100,
        protein_g: 10,
        carbs_g: 15,
        fat_g: 5,
        micronutrients: [],
        food_categories: { id: 1, name: 'General', icon: null },
        exchange_groups: { id: 1, name: 'Grupo 1' },
        exchange_subgroups: null,
        food_nutrition_values: [
            {
                id: 500 + id,
                food_id: id,
                data_source_id: 1,
                calories_kcal: 100,
                protein_g: 10,
                carbs_g: 15,
                fat_g: 5,
                base_serving_size: 120,
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
        ...overrides,
    }) as IFoodItem;

const meals: IMenuMealDraft[] = [
    {
        id: 10,
        meal_name: 'Desayuno',
        meal_plan_exchanges: [
            { id: 101, exchange_group_id: 1, quantity: 0 },
        ],
    },
];

describe('menuBuilderSearch', () => {
    it('filters foods by normalized text, group and subgroup', () => {
        const foods = [
            buildFood(1, {
                name: 'Plátano',
                exchange_group_id: 2,
                exchange_subgroup_id: 21,
            }),
            buildFood(2, {
                name: 'Arándano',
                brand: 'Marca Fit',
                exchange_group_id: 2,
                exchange_subgroup_id: 22,
            }),
            buildFood(3, {
                name: 'Sin grupo',
                exchange_group_id: 0,
            }),
        ];

        const result = filterMenuBuilderFoods(foods, {
            query: 'platano',
            groupId: 2,
            subgroupId: 21,
        });

        expect(result.map((food) => food.id)).toEqual([1]);
    });

    it('inserts a food into an existing exchange group', () => {
        const food = buildFood(5);
        const result = insertFoodIntoMeal({
            meals,
            selectedFoods: {},
            mealId: 10,
            food,
            createExchangeId: () => -999,
        });

        expect(result.status).toBe('added');
        expect(result.meals[0].meal_plan_exchanges).toHaveLength(1);
        expect(result.selectedFoods['10-101'][0]).toMatchObject({
            foodId: 5,
            grams: 120,
            calculatedExchanges: 1,
        });
    });

    it('creates a missing exchange group when inserting a food from another group', () => {
        const food = buildFood(8, {
            exchange_group_id: 4,
            exchange_groups: { id: 4, name: 'Grupo 4' },
        });

        const result = insertFoodIntoMeal({
            meals,
            selectedFoods: {},
            mealId: 10,
            food,
            createExchangeId: () => -404,
        });

        expect(result.status).toBe('added');
        expect(result.meals[0].meal_plan_exchanges?.some((exchange) => exchange.id === -404)).toBe(true);
        expect(result.meals[0].meal_plan_exchanges?.find((exchange) => exchange.id === -404)?.quantity).toBe(1);
        expect(result.selectedFoods['10--404'][0].foodId).toBe(8);
    });

    it('prevents duplicate foods inside the same meal group', () => {
        const existingSelections: Record<string, MenuBuilderFoodSelection[]> = {
            '10-101': [{ foodId: 7, grams: 100, calculatedExchanges: 1 }],
        };

        const result = insertFoodIntoMeal({
            meals,
            selectedFoods: existingSelections,
            mealId: 10,
            food: buildFood(7),
            createExchangeId: () => -1000,
        });

        expect(result.status).toBe('duplicate');
        expect(result.selectedFoods).toEqual(existingSelections);
    });
});
