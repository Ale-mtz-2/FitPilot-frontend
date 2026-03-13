import type { FoodSearchResult } from '@/features/foods/types';

export type RecipeScope = 'all' | 'mine' | 'templates';

export interface RecipeNutritionSummary {
    calories_kcal: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    fiber_g: number;
}

export const EMPTY_RECIPE_NUTRITION_SUMMARY: RecipeNutritionSummary = {
    calories_kcal: 0,
    protein_g: 0,
    carbs_g: 0,
    fat_g: 0,
    fiber_g: 0,
};

export interface RecipeIngredient {
    id: number;
    food_id: number;
    serving_unit_id: number | null;
    quantity: number;
    food: FoodSearchResult | null;
    serving_unit: {
        id: number;
        food_id: number | null;
        unit_name: string;
        gram_equivalent: number;
        is_exchange_unit: boolean | null;
    } | null;
}

export interface RecipeListItem {
    id: number;
    name: string;
    description: string | null;
    image_url: string | null;
    created_by: number | null;
    is_template: boolean;
    created_at: string;
    updated_at: string;
    ingredient_count: number;
    nutrition_summary?: RecipeNutritionSummary | null;
}

export interface RecipeDetail extends RecipeListItem {
    ingredients: RecipeIngredient[];
}

export interface RecipeUpsertInput {
    name: string;
    description?: string;
    ingredients: Array<{
        food_id: number;
        serving_unit_id?: number | null;
        quantity: number;
    }>;
}
