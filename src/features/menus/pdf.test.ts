import { describe, expect, it } from 'vitest';
import type { IFoodItem } from '@/features/foods/types';
import type { IMenuMealDraft, MenuBuilderFoodSelection, MenuDailyBatchResponseItem } from './types';
import { buildDietPdfDocumentFromDailyBatch, buildDietPdfDocumentFromDraft } from './pdf';

const createFood = (overrides: Partial<IFoodItem> = {}): IFoodItem =>
    ({
        id: 1,
        name: 'Ingrediente',
        brand: null,
        category_id: 1,
        exchange_group_id: 1,
        exchange_subgroup_id: null,
        image_url: undefined,
        is_recipe: false,
        base_serving_size: 100,
        base_unit: 'g',
        gross_weight_g: null,
        net_weight_g: null,
        calories_kcal: 120,
        protein_g: 10,
        carbs_g: 8,
        fat_g: 4,
        fiber_g: 1,
        glycemic_index: null,
        glycemic_load: null,
        micronutrients: [],
        food_categories: {
            id: 1,
            name: 'General',
            icon: null,
        },
        exchange_groups: {
            id: 1,
            name: 'Grupo base',
        },
        exchange_subgroups: null,
        food_nutrition_values: [
            {
                id: 1,
                food_id: 1,
                data_source_id: 1,
                calories_kcal: 120,
                protein_g: 10,
                carbs_g: 8,
                fat_g: 4,
                base_serving_size: 100,
                base_unit: 'g',
                gross_weight_g: null,
                net_weight_g: null,
                state: 'standard',
                notes: null,
                deleted_at: null,
                created_at: null,
                fiber_g: 1,
                glycemic_index: null,
                glycemic_load: null,
                data_sources: {
                    id: 1,
                    name: 'Manual',
                },
                food_micronutrient_values: [],
            },
        ],
        serving_units: [],
        updated_at: undefined,
        deleted_at: null,
        ...overrides,
    }) as IFoodItem;

describe('diet pdf mappers', () => {
    it('groups repeated recipe items from daily batch into one recipe card', () => {
        const dailyMenus: MenuDailyBatchResponseItem[] = [
            {
                id: 101,
                client_id: 7,
                created_by: 9,
                is_reusable: false,
                title: 'Semana definición',
                description_: '',
                start_date: '2026-03-09',
                end_date: '2026-03-15',
                assigned_date: '2026-03-09T00:00:00.000Z',
                menu_id_selected_client: 101,
                menu_meals: [
                    {
                        id: 11,
                        menu_id: 101,
                        name: 'Desayuno',
                        total_calories: 430,
                        menu_items_menu_items_menu_meal_idTomenu_meals: [
                            {
                                id: 1,
                                menu_meal_id: 11,
                                exchange_group_id: 1,
                                food_id: 101,
                                serving_unit_id: null,
                                quantity: 120,
                                recipe_id: 55,
                                recipe_summary: {
                                    id: 55,
                                    title: 'Hotcakes de avena',
                                    image_url: 'recipes/4/1/hotcakes.jpg',
                                },
                                foods: {
                                    id: 101,
                                    name: 'Avena',
                                    base_serving_size: 100,
                                    base_unit: 'g',
                                    food_nutrition_values: [
                                        {
                                            state: 'standard',
                                            calories_kcal: 389,
                                            base_serving_size: 100,
                                            base_unit: 'g',
                                        },
                                    ],
                                },
                                exchange_groups: {
                                    id: 1,
                                    name: 'Cereales',
                                },
                                serving_units: null,
                                portion_detail: {
                                    household_label: '1 taza',
                                    equivalents: 1,
                                    grams: 120,
                                },
                                equivalent_quantity: 1,
                            },
                            {
                                id: 2,
                                menu_meal_id: 11,
                                exchange_group_id: 2,
                                food_id: 102,
                                serving_unit_id: null,
                                quantity: 80,
                                recipe_id: 55,
                                recipe_summary: {
                                    id: 55,
                                    title: 'Hotcakes de avena',
                                    image_url: 'recipes/4/1/hotcakes.jpg',
                                },
                                foods: {
                                    id: 102,
                                    name: 'Claras de huevo',
                                    base_serving_size: 100,
                                    base_unit: 'g',
                                    food_nutrition_values: [
                                        {
                                            state: 'standard',
                                            calories_kcal: 52,
                                            base_serving_size: 100,
                                            base_unit: 'g',
                                        },
                                    ],
                                },
                                exchange_groups: {
                                    id: 2,
                                    name: 'AOA',
                                },
                                serving_units: null,
                                portion_detail: {
                                    household_label: '4 piezas',
                                    equivalents: 1,
                                    grams: 80,
                                },
                                equivalent_quantity: 1,
                            },
                            {
                                id: 3,
                                menu_meal_id: 11,
                                exchange_group_id: 3,
                                food_id: 103,
                                serving_unit_id: null,
                                quantity: 90,
                                recipe_id: null,
                                recipe_summary: null,
                                foods: {
                                    id: 103,
                                    name: 'Fresas',
                                    base_serving_size: 100,
                                    base_unit: 'g',
                                    food_nutrition_values: [
                                        {
                                            state: 'standard',
                                            calories_kcal: 32,
                                            base_serving_size: 100,
                                            base_unit: 'g',
                                        },
                                    ],
                                },
                                exchange_groups: {
                                    id: 3,
                                    name: 'Frutas',
                                },
                                serving_units: null,
                                portion_detail: {
                                    household_label: '1 taza',
                                    equivalents: 1,
                                    grams: 90,
                                },
                                equivalent_quantity: 1,
                            },
                        ],
                    },
                ],
            },
        ];

        const documentData = buildDietPdfDocumentFromDailyBatch({
            dailyMenus,
            startDate: '2026-03-09',
            days: 7,
            clientName: 'Ana Torres',
        });

        expect(documentData.days).toHaveLength(7);
        expect(documentData.days[0].meals).toHaveLength(1);
        expect(documentData.days[0].meals[0].recipes).toHaveLength(1);
        expect(documentData.days[0].meals[0].recipes[0].ingredients).toHaveLength(2);
        expect(documentData.days[0].meals[0].standaloneFoods).toHaveLength(1);
        expect(documentData.days[0].meals[0].recipes[0].imageUrl).toBe(
            'https://cdn.fitpilot.fit/recipes/4/1/hotcakes.jpg',
        );
        expect(documentData.days[1].meals).toHaveLength(0);
    });

    it('builds draft document separating recipes and standalone foods preserving grams and equivalents', () => {
        const localMeals: IMenuMealDraft[] = [
            {
                id: 1,
                meal_name: 'Cena',
                sort_order: 1,
                meal_plan_exchanges: [
                    {
                        id: 10,
                        exchange_group_id: 1,
                        quantity: 1,
                        exchange_group: {
                            id: 1,
                            name: 'Cereales',
                        },
                    },
                    {
                        id: 20,
                        exchange_group_id: 2,
                        quantity: 1,
                        exchange_group: {
                            id: 2,
                            name: 'AOA',
                        },
                    },
                ],
            },
        ];

        const selectedFoods: Record<string, MenuBuilderFoodSelection[]> = {
            '1-10': [
                {
                    foodId: 1001,
                    grams: 80,
                    calculatedExchanges: 0.8,
                    nutritionValueId: 1,
                    _foodRef: createFood({
                        id: 1001,
                        name: 'Tortilla de maíz',
                        base_serving_size: 100,
                        serving_units: [
                            {
                                id: 5001,
                                food_id: 1001,
                                unit_name: 'g',
                                gram_equivalent: 1,
                                is_exchange_unit: false,
                            },
                            {
                                id: 5002,
                                food_id: 1001,
                                unit_name: 'pieza',
                                gram_equivalent: 25,
                                is_exchange_unit: false,
                            },
                        ],
                        exchange_groups: {
                            id: 1,
                            name: 'Cereales',
                        },
                        food_nutrition_values: [
                            {
                                id: 1,
                                food_id: 1001,
                                data_source_id: 1,
                                calories_kcal: 120,
                                protein_g: 10,
                                carbs_g: 8,
                                fat_g: 4,
                                base_serving_size: 100,
                                base_unit: 'g',
                                gross_weight_g: null,
                                net_weight_g: null,
                                state: 'standard',
                                notes: '{"original_serving_amount":1,"original_serving_unit":"taza","equivalent_count":1}',
                                deleted_at: null,
                                created_at: null,
                                fiber_g: 1,
                                glycemic_index: null,
                                glycemic_load: null,
                                data_sources: {
                                    id: 1,
                                    name: 'Manual',
                                },
                                food_micronutrient_values: [],
                            },
                        ],
                    }),
                    recipeId: 99,
                    recipeName: 'Tacos caseros',
                    recipeImageUrl: 'recipes/4/9/tacos.jpg',
                    isFromRecipe: true,
                },
            ],
            '1-20': [
                {
                    foodId: 1002,
                    grams: 120,
                    calculatedExchanges: 1.2,
                    nutritionValueId: 1,
                    _foodRef: createFood({
                        id: 1002,
                        name: 'Pollo deshebrado',
                        exchange_groups: {
                            id: 2,
                            name: 'AOA',
                        },
                    }),
                    recipeId: 99,
                    recipeName: 'Tacos caseros',
                    recipeImageUrl: 'recipes/4/9/tacos.jpg',
                    isFromRecipe: true,
                },
                {
                    foodId: 1003,
                    grams: 50,
                    calculatedExchanges: 0.5,
                    nutritionValueId: 1,
                    _foodRef: createFood({
                        id: 1003,
                        name: 'Aguacate',
                        exchange_groups: {
                            id: 4,
                            name: 'Grasas',
                        },
                    }),
                    isFromRecipe: false,
                },
            ],
        };

        const documentData = buildDietPdfDocumentFromDraft({
            localMeals,
            selectedFoods,
            clientName: 'Luis Pérez',
            period: {
                start: '2026-03-10',
                end: '2026-03-16',
            },
        });

        const meal = documentData.days[0].meals[0];
        expect(meal.recipes).toHaveLength(1);
        expect(meal.recipes[0].title).toBe('Tacos caseros');
        expect(meal.recipes[0].ingredients).toHaveLength(2);
        expect(meal.recipes[0].ingredients[0].portion.grams).toBe(80);
        expect(meal.recipes[0].ingredients[0].portion.equivalents).toBe(0.8);
        expect(meal.recipes[0].ingredients[0].portion.householdLabel).toBe('3/4 taza');
        expect(meal.standaloneFoods).toHaveLength(1);
        expect(meal.standaloneFoods[0].label).toBe('Aguacate');
        expect(documentData.summary.totalRecipes).toBe(1);
        expect(documentData.summary.totalStandaloneFoods).toBe(1);
    });

    it('derives household measures for draft standalone foods from serving units', () => {
        const localMeals: IMenuMealDraft[] = [
            {
                id: 2,
                meal_name: 'Colación',
                sort_order: 2,
                meal_plan_exchanges: [
                    {
                        id: 30,
                        exchange_group_id: 7,
                        quantity: 1,
                        exchange_group: {
                            id: 7,
                            name: 'Grasas',
                        },
                    },
                ],
            },
        ];

        const selectedFoods: Record<string, MenuBuilderFoodSelection[]> = {
            '2-30': [
                {
                    foodId: 2001,
                    grams: 15,
                    calculatedExchanges: 1,
                    nutritionValueId: 1,
                    _foodRef: createFood({
                        id: 2001,
                        name: 'Aceite de oliva',
                        base_serving_size: 15,
                        exchange_group_id: 7,
                        exchange_groups: {
                            id: 7,
                            name: 'Grasas',
                        },
                        serving_units: [
                            {
                                id: 7001,
                                food_id: 2001,
                                unit_name: 'g',
                                gram_equivalent: 1,
                                is_exchange_unit: false,
                            },
                            {
                                id: 7002,
                                food_id: 2001,
                                unit_name: 'cda',
                                gram_equivalent: 15,
                                is_exchange_unit: false,
                            },
                        ],
                    }),
                    isFromRecipe: false,
                },
            ],
        };

        const documentData = buildDietPdfDocumentFromDraft({
            localMeals,
            selectedFoods,
        });

        expect(documentData.days[0].meals[0].standaloneFoods[0].portion.householdLabel).toBe('1 cda');
    });
});
