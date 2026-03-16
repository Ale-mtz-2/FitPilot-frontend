import { describe, expect, it } from 'vitest';
import type { IFoodItem } from '@/features/foods/types';
import { detectRecipeFromText } from './recipeTextDetection';

const createFood = (id: number, name: string): IFoodItem =>
    ({
        id,
        name,
        brand: null,
        category_id: 1,
        exchange_group_id: 1,
        exchange_subgroup_id: null,
        is_recipe: false,
        base_serving_size: 100,
        base_unit: 'g',
        calories_kcal: 0,
        protein_g: 0,
        carbs_g: 0,
        fat_g: 0,
        micronutrients: [],
        food_categories: {
            id: 1,
            name: 'Verduras',
            icon: null,
        },
        exchange_groups: {
            id: 1,
            name: 'Grupo',
            icon: null,
            description: null,
            category: 'General',
            created_at: null,
            updated_at: null,
            deleted_at: null,
        },
        food_nutrition_values: [],
        serving_units: [],
    }) as IFoodItem;

describe('detectRecipeFromText morphology matching', () => {
    it('matches manual case "2 chiles serranos" with catalog "chile serrano"', () => {
        const foods = [createFood(1, 'chile serrano')];

        const result = detectRecipeFromText({
            text: 'Ingredientes:\n2 chiles serranos',
            foods,
        });

        expect(result.matchedIngredients).toHaveLength(1);
        expect(result.matchedIngredients[0]?.food.name).toBe('chile serrano');
        expect(result.unmatchedIngredients).toHaveLength(0);
    });

    it('matches manual case "4 tortillas de maíz" with catalog "tortilla de maíz"', () => {
        const foods = [createFood(2, 'tortilla de maíz')];

        const result = detectRecipeFromText({
            text: 'Ingredientes:\n4 tortillas de maíz',
            foods,
        });

        expect(result.matchedIngredients).toHaveLength(1);
        expect(result.matchedIngredients[0]?.food.name).toBe('tortilla de maíz');
        expect(result.unmatchedIngredients).toHaveLength(0);
    });
});
